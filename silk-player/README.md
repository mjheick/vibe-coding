# Skype Voicemail Converter

Extracts audio from Skype voicemail DAT files, decodes SILK audio, and converts to MP3.

## Skype DAT File Format (Reverse Engineered)

Each frame in a Skype voicemail DAT file has the following structure:

```
Offset  Size  Description
------  ----  -----------
0       4     Frame marker: 00 20 80 12
4       2     Sequence/frame number (little-endian, incrementing)
6       2     Always 00 00
8       4     Timestamp (little-endian)
12      4     Always 00 00 00 00
16      N     SILK audio data (18-20 bytes typically)
```

The audio data continues until the next frame marker is encountered.

## How It Works

1. Scans DAT file for frame markers (`00 20 80 12`)
2. Skips the 12-byte Skype header after each marker
3. Extracts SILK audio data (until next frame)
4. Writes proper SILK V3 file with:
   - Header: `#!SILK_V3`
   - Each frame: length (2 bytes) + timing (2 bytes, 20ms) + audio data
5. Decodes SILK to raw PCM using SILK decoder
6. Converts PCM to MP3 using ffmpeg

## Prerequisites

### 1. SILK Decoder

Download and compile the SILK SDK:

```bash
# Clone SILK codec repository
git clone https://github.com/gaozehua/SILKCodec.git
cd SILKCodec/SILK_SDK_SRC_FIX

# Compile
make

# The decoder binary will be at SILK_SDK_SRC_FIX/decoder
# Copy or symlink it to your PATH or the same directory as this tool
```

Alternative sources:
- [kn007/silk-v3-decoder](https://github.com/kn007/silk-v3-decoder)
- [collects/silk](https://github.com/collects/silk)

### 2. ffmpeg

Install ffmpeg with MP3 encoding support:

```bash
# Ubuntu/Debian
sudo apt-get install ffmpeg

# macOS
brew install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

## Building

```bash
make
```

On Windows with MinGW/GCC:
```bash
gcc -Wall -O2 -o skype_voicemail_converter.exe skype_voicemail_converter.c
```

## Usage

### Basic Conversion

Convert DAT to MP3 (default settings):
```bash
./skype_voicemail_converter voicemail.dat
```

Specify output file and sample rate:
```bash
./skype_voicemail_converter voicemail.dat output.mp3 16000
```

### Extract SILK Only

Extract to SILK format without decoding to MP3:
```bash
./skype_voicemail_converter voicemail.dat --extract
```

This creates `temp_audio.silk` which you can decode manually.

### Analysis Mode

Analyze the file structure (useful for debugging):
```bash
./skype_voicemail_converter voicemail.dat --analyze
./skype_voicemail_converter voicemail.dat --analyze 10
./skype_voicemail_converter voicemail.dat --debug
```

## Troubleshooting

### Wrong sample rate

If audio sounds too fast or too slow, try different sample rates:
- 8000 Hz (narrowband)
- 12000 Hz (mediumband)  
- 16000 Hz (wideband) - default
- 24000 Hz (super-wideband)

Example:
```bash
./skype_voicemail_converter voicemail.dat output.mp3 24000
```

### SILK decoder not found

Make sure the decoder is in your PATH or in the same directory. The tool tries:
- `silk_decoder`
- `decoder`
- `SKP_Silk_SDK_decoder`
- `./silk/decoder`

### No frames found

If you see "Could not find frame marker":
- Use `--debug` to see hex dump
- The file may not be a Skype voicemail DAT file
- The file may be corrupted

## Technical Details

### Frame Structure

Based on reverse engineering of actual Skype voicemail files:
- Frame marker `00 20 80 12` identifies each frame
- 12-byte header contains sequence number and timestamp
- Audio data is variable length (typically 18-20 bytes per frame)
- Frames occur approximately every 20ms

### SILK V3 Output Format

The extracted SILK file contains:
- Header: `#!SILK_V3` (9 bytes)
- Frames: Each has frame_length (2 bytes LE) + timing (2 bytes LE, 0x0014 = 20ms) + audio_data

### Sample Rate Detection

SILK can use 8, 12, 16, or 24 kHz. The default is 16 kHz which works for most Skype voicemails. If audio sounds wrong, try other rates.


