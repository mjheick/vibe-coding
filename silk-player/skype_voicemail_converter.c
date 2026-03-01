#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

#define CHUNK_SIZE 8192
#define SILK_V3_HEADER "#!SILK_V3"
#define MAX_FRAME_SIZE 1024

// Skype voicemail frame marker: 00 20 80 12
#define FRAME_MARKER_0 0x00
#define FRAME_MARKER_1 0x20
#define FRAME_MARKER_2 0x80
#define FRAME_MARKER_3 0x12

// Read little-endian 16-bit integer
uint16_t read_le16(FILE *f) {
    uint16_t val = 0;
    val |= (uint16_t)fgetc(f);
    val |= (uint16_t)fgetc(f) << 8;
    return val;
}

// Read little-endian 32-bit integer
uint32_t read_le32(FILE *f) {
    uint32_t val = 0;
    val |= (uint32_t)fgetc(f);
    val |= (uint32_t)fgetc(f) << 8;
    val |= (uint32_t)fgetc(f) << 16;
    val |= (uint32_t)fgetc(f) << 24;
    return val;
}

// Write little-endian 16-bit integer
void write_le16(FILE *f, uint16_t val) {
    fputc(val & 0xFF, f);
    fputc((val >> 8) & 0xFF, f);
}

// Check if we're at a Skype frame marker (00 20 80 12)
int is_frame_marker(unsigned char *buf, size_t pos, size_t size) {
    if (pos + 4 > size) return 0;
    return (buf[pos] == FRAME_MARKER_0 && 
            buf[pos+1] == FRAME_MARKER_1 && 
            buf[pos+2] == FRAME_MARKER_2 && 
            buf[pos+3] == FRAME_MARKER_3);
}

// Search for next frame marker
long find_next_frame(FILE *f, long start_pos, long max_pos) {
    unsigned char buf[4];
    fseek(f, start_pos, SEEK_SET);
    
    while (ftell(f) < max_pos - 4) {
        if (fread(buf, 1, 4, f) != 4) break;
        
        if (buf[0] == FRAME_MARKER_0 && buf[1] == FRAME_MARKER_1 && 
            buf[2] == FRAME_MARKER_2 && buf[3] == FRAME_MARKER_3) {
            return ftell(f) - 4;
        }
        fseek(f, -3, SEEK_CUR); // Move back 3 bytes for sliding window
    }
    return -1;
}

// Analyze frame structure after marker
void analyze_frame_structure(const char *input_file, int num_frames) {
    FILE *in = fopen(input_file, "rb");
    if (!in) {
        fprintf(stderr, "Error: Cannot open input file %s\n", input_file);
        return;
    }

    fseek(in, 0, SEEK_END);
    long file_size = ftell(in);
    fseek(in, 0, SEEK_SET);

    printf("\n=== FRAME STRUCTURE ANALYSIS ===\n");
    printf("File size: %ld bytes\n\n", file_size);

    long frame_pos = find_next_frame(in, 0, file_size);
    int frame_count = 0;

    while (frame_pos >= 0 && frame_count < num_frames) {
        fseek(in, frame_pos, SEEK_SET);
        
        printf("Frame %d at offset 0x%lx (%ld):\n", frame_count, frame_pos, frame_pos);
        
        // Read marker
        unsigned char marker[4];
        fread(marker, 1, 4, in);
        printf("  Marker: %02x %02x %02x %02x\n", marker[0], marker[1], marker[2], marker[3]);
        
        // Read next 32 bytes after marker
        unsigned char data[32];
        size_t bytes_read = fread(data, 1, 32, in);
        
        printf("  Next %zu bytes after marker:\n", bytes_read);
        for (size_t i = 0; i < bytes_read; i++) {
            if (i % 16 == 0) printf("    %04zx: ", i);
            printf("%02x ", data[i]);
            if ((i + 1) % 16 == 0) printf("\n");
        }
        if (bytes_read % 16 != 0) printf("\n");
        
        // Try to interpret as different structures
        printf("  Possible interpretations:\n");
        if (bytes_read >= 2) {
            uint16_t val16_le = data[0] | (data[1] << 8);
            uint16_t val16_be = (data[0] << 8) | data[1];
            printf("    Bytes 0-1 as uint16 LE: %u (0x%04x)\n", val16_le, val16_le);
            printf("    Bytes 0-1 as uint16 BE: %u (0x%04x)\n", val16_be, val16_be);
        }
        if (bytes_read >= 4) {
            uint32_t val32_le = data[0] | (data[1] << 8) | (data[2] << 16) | (data[3] << 24);
            printf("    Bytes 0-3 as uint32 LE: %u (0x%08x)\n", val32_le, val32_le);
        }
        
        // Find next frame
        long next_frame = find_next_frame(in, frame_pos + 4, file_size);
        if (next_frame > 0) {
            long frame_size = next_frame - frame_pos;
            printf("  Distance to next frame: %ld bytes\n", frame_size);
            printf("  Potential audio data size: %ld bytes\n", frame_size - 4);
        }
        
        printf("\n");
        
        frame_pos = next_frame;
        frame_count++;
    }

    fclose(in);
}

// Extract audio data from Skype DAT file and convert to SILK format
int extract_audio(const char *input_file, const char *output_file) {
    FILE *in = fopen(input_file, "rb");
    if (!in) {
        fprintf(stderr, "Error: Cannot open input file %s\n", input_file);
        return -1;
    }

    // Get file size
    fseek(in, 0, SEEK_END);
    long file_size = ftell(in);
    fseek(in, 0, SEEK_SET);

    printf("File size: %ld bytes\n", file_size);

    // Find first frame marker (00 20 80 12)
    long first_frame = find_next_frame(in, 0, file_size);
    if (first_frame < 0) {
        fprintf(stderr, "Error: Could not find frame marker (00 20 80 12) in file\n");
        fclose(in);
        return -1;
    }

    printf("First frame found at offset: 0x%lx (%ld)\n", first_frame, first_frame);

    FILE *out = fopen(output_file, "wb");
    if (!out) {
        fprintf(stderr, "Error: Cannot create output file %s\n", output_file);
        fclose(in);
        return -1;
    }

    // Write SILK V3 header
    fprintf(out, "%s", SILK_V3_HEADER);

    // Process frames
    // Skype DAT structure per frame:
    // - 4 bytes: Frame marker (00 20 80 12)
    // - 2 bytes: Sequence/frame number (little-endian)
    // - 2 bytes: Always 00 00
    // - 4 bytes: Timestamp (little-endian)
    // - 4 bytes: Always 00 00 00 00
    // - N bytes: SILK audio data (until next frame marker)
    
    fseek(in, first_frame, SEEK_SET);
    int frame_count = 0;
    size_t total_audio_bytes = 0;
    long current_pos = first_frame;

    while (current_pos < file_size - 4) {
        fseek(in, current_pos, SEEK_SET);
        
        // Read and verify frame marker
        unsigned char marker[4];
        if (fread(marker, 1, 4, in) != 4) break;
        
        if (!is_frame_marker(marker, 0, 4)) {
            // Try to find next frame
            long next_frame = find_next_frame(in, current_pos + 1, file_size);
            if (next_frame < 0) break;
            current_pos = next_frame;
            continue;
        }

        // Skip Skype header (12 bytes after marker)
        // Bytes 4-5: sequence number
        // Bytes 6-7: 00 00
        // Bytes 8-11: timestamp
        // Bytes 12-15: 00 00 00 00
        uint16_t sequence = read_le16(in);
        fseek(in, 2, SEEK_CUR); // Skip 00 00
        uint32_t timestamp = read_le32(in);
        fseek(in, 4, SEEK_CUR); // Skip 00 00 00 00

        // Find next frame to determine audio data length
        long next_frame_pos = find_next_frame(in, current_pos + 4, file_size);
        long audio_length;
        
        if (next_frame_pos > 0) {
            audio_length = next_frame_pos - current_pos - 16; // 16 = 4 (marker) + 12 (header)
        } else {
            // Last frame
            audio_length = file_size - ftell(in);
        }

        if (audio_length <= 0 || audio_length > MAX_FRAME_SIZE) {
            printf("Warning: Invalid audio length %ld at frame %d, skipping\n", 
                   audio_length, frame_count);
            if (next_frame_pos > 0) {
                current_pos = next_frame_pos;
            } else {
                break;
            }
            continue;
        }

        // Read audio data
        unsigned char audio_data[MAX_FRAME_SIZE];
        size_t bytes_read = fread(audio_data, 1, audio_length, in);
        
        if (bytes_read != audio_length) {
            printf("Warning: Expected %ld bytes but read %zu at frame %d\n", 
                   audio_length, bytes_read, frame_count);
        }

        // Write to SILK file: frame_length (2 bytes) + timing (2 bytes) + audio data
        // For SILK format, timing is typically 20ms per frame (0x14 0x00)
        write_le16(out, (uint16_t)bytes_read);
        write_le16(out, 0x0014); // 20ms timing
        fwrite(audio_data, 1, bytes_read, out);

        total_audio_bytes += bytes_read;
        frame_count++;

        if (frame_count % 100 == 0) {
            printf("Processed %d frames...\r", frame_count);
            fflush(stdout);
        }

        // Move to next frame
        if (next_frame_pos > 0) {
            current_pos = next_frame_pos;
        } else {
            break;
        }
    }

    fclose(in);
    fclose(out);
    
    printf("\nExtracted %d frames (%zu audio bytes) to %s\n", 
           frame_count, total_audio_bytes, output_file);
    
    if (frame_count == 0) {
        fprintf(stderr, "Error: No valid frames extracted\n");
        return -1;
    }
    
    return 0;
}

// Decode SILK audio using external decoder
int decode_silk(const char *silk_file, const char *pcm_file) {
    char command[512];
    
    // Try different decoder names
    const char *decoders[] = {
        "silk_decoder",
        "decoder",
        "SKP_Silk_SDK_decoder",
        "./silk/decoder"
    };
    
    int result = -1;
    for (int i = 0; i < 4; i++) {
        snprintf(command, sizeof(command), "%s %s %s 2>&1", 
                 decoders[i], silk_file, pcm_file);
        result = system(command);
        if (result == 0) {
            printf("SILK decoded to %s using %s\n", pcm_file, decoders[i]);
            return 0;
        }
    }
    
    fprintf(stderr, "Error: SILK decoder failed. Make sure decoder is in PATH.\n");
    fprintf(stderr, "Tried: silk_decoder, decoder, SKP_Silk_SDK_decoder, ./silk/decoder\n");
    return -1;
}

// Convert PCM to MP3 using ffmpeg
int convert_to_mp3(const char *pcm_file, const char *mp3_file, int sample_rate) {
    char command[512];
    snprintf(command, sizeof(command), 
             "ffmpeg -f s16le -ar %d -ac 1 -i %s -codec:a libmp3lame -qscale:a 2 %s -y",
             sample_rate, pcm_file, mp3_file);
    
    int result = system(command);
    if (result != 0) {
        fprintf(stderr, "Error: ffmpeg conversion failed\n");
        return -1;
    }
    
    printf("Converted to MP3: %s\n", mp3_file);
    return 0;
}

// Print hex dump with frame marker highlighting
void print_hex_dump(const char *filename, size_t bytes) {
    FILE *f = fopen(filename, "rb");
    if (!f) return;
    
    printf("\nFirst %zu bytes of %s:\n", bytes, filename);
    printf("Looking for frame marker: 00 20 80 12\n\n");
    
    unsigned char buf[512];
    size_t n = fread(buf, 1, bytes < 512 ? bytes : 512, f);
    
    for (size_t i = 0; i < n; i++) {
        if (i % 16 == 0) printf("%04zx: ", i);
        
        // Highlight frame markers
        if (i + 3 < n && buf[i] == 0x00 && buf[i+1] == 0x20 && 
            buf[i+2] == 0x80 && buf[i+3] == 0x12) {
            printf("[%02x %02x %02x %02x] ", buf[i], buf[i+1], buf[i+2], buf[i+3]);
            i += 3; // Skip next 3 bytes as we printed them
        } else {
            printf("%02x ", buf[i]);
        }
        
        if ((i + 1) % 16 == 0) printf("\n");
    }
    if (n % 16 != 0) printf("\n");
    
    fclose(f);
}

int main(int argc, char *argv[]) {
    if (argc < 2) {
        printf("Skype Voicemail DAT to MP3 Converter\n\n");
        printf("Usage: %s <input.dat> [options]\n\n", argv[0]);
        printf("Options:\n");
        printf("  --analyze [N]    Analyze frame structure (show N frames, default 5)\n");
        printf("  --debug          Show hex dump of file header\n");
        printf("  --extract        Extract audio to SILK format\n");
        printf("  output.mp3       Output MP3 file\n");
        printf("  sample_rate      Sample rate in Hz (default: 16000)\n\n");
        printf("Examples:\n");
        printf("  %s voicemail.dat --analyze\n", argv[0]);
        printf("  %s voicemail.dat --extract\n", argv[0]);
        printf("  %s voicemail.dat output.mp3\n", argv[0]);
        printf("  %s voicemail.dat output.mp3 24000\n\n", argv[0]);
        return 1;
    }

    const char *input_file = argv[1];
    const char *output_mp3 = "output.mp3";
    int sample_rate = 16000;
    int analyze_mode = 0;
    int analyze_frames = 5;
    int debug = 0;
    int extract_only = 0;

    // Parse arguments
    for (int i = 2; i < argc; i++) {
        if (strcmp(argv[i], "--analyze") == 0) {
            analyze_mode = 1;
            if (i + 1 < argc && atoi(argv[i + 1]) > 0) {
                analyze_frames = atoi(argv[i + 1]);
                i++;
            }
        } else if (strcmp(argv[i], "--debug") == 0) {
            debug = 1;
        } else if (strcmp(argv[i], "--extract") == 0) {
            extract_only = 1;
        } else if (strstr(argv[i], ".mp3") != NULL) {
            output_mp3 = argv[i];
        } else if (atoi(argv[i]) > 0) {
            sample_rate = atoi(argv[i]);
        }
    }

    if (debug) {
        print_hex_dump(input_file, 256);
    }

    if (analyze_mode) {
        analyze_frame_structure(input_file, analyze_frames);
        return 0;
    }

    // Temporary files
    const char *silk_file = "temp_audio.silk";
    const char *pcm_file = "temp_audio.pcm";

    printf("Processing Skype voicemail: %s\n", input_file);
    printf("Output: %s (sample rate: %d Hz)\n\n", output_mp3, sample_rate);
    
    // Step 1: Extract audio from DAT file
    printf("[Step 1/3] Extracting audio from DAT file...\n");
    if (extract_audio(input_file, silk_file) != 0) {
        return 1;
    }

    if (extract_only) {
        printf("\nExtraction complete. SILK file saved as: %s\n", silk_file);
        printf("To decode manually: silk_decoder %s %s\n", silk_file, pcm_file);
        return 0;
    }

    // Step 2: Decode SILK to PCM
    printf("\n[Step 2/3] Decoding SILK to PCM...\n");
    if (decode_silk(silk_file, pcm_file) != 0) {
        remove(silk_file);
        return 1;
    }

    // Step 3: Convert PCM to MP3
    printf("\n[Step 3/3] Converting PCM to MP3...\n");
    if (convert_to_mp3(pcm_file, output_mp3, sample_rate) != 0) {
        remove(silk_file);
        remove(pcm_file);
        return 1;
    }

    // Cleanup temporary files
    remove(silk_file);
    remove(pcm_file);

    printf("\n✓ Conversion complete: %s\n", output_mp3);
    return 0;
}
