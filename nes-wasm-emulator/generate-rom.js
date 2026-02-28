// Node.js script to generate hello-world.nes binary ROM file
const fs = require('fs');

function createHelloWorldROM() {
    const rom = [];
    
    // iNES Header (16 bytes)
    rom.push(0x4E, 0x45, 0x53, 0x1A); // "NES" + MS-DOS EOF
    rom.push(0x02); // 2 x 16KB PRG ROM
    rom.push(0x01); // 1 x 8KB CHR ROM
    rom.push(0x00); // Mapper 0, horizontal mirroring
    rom.push(0x00); // Mapper 0
    rom.push(0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00); // Padding
    
    // PRG ROM (32KB = 32768 bytes)
    const prgRom = new Array(32768).fill(0xEA); // Fill with NOP
    
    // Reset vector code starts at 0x8000
    let codePos = 0x0000;
    
    // Disable interrupts
    prgRom[codePos++] = 0x78; // SEI
    
    // Disable decimal mode
    prgRom[codePos++] = 0xD8; // CLD
    
    // Disable PPU
    prgRom[codePos++] = 0xA9; // LDA #$00
    prgRom[codePos++] = 0x00;
    prgRom[codePos++] = 0x8D; // STA $2000
    prgRom[codePos++] = 0x00;
    prgRom[codePos++] = 0x20;
    prgRom[codePos++] = 0x8D; // STA $2001
    prgRom[codePos++] = 0x01;
    prgRom[codePos++] = 0x20;
    
    // Wait for VBlank
    prgRom[codePos++] = 0x2C; // BIT $2002
    prgRom[codePos++] = 0x02;
    prgRom[codePos++] = 0x20;
    prgRom[codePos++] = 0x10; // BPL (wait for bit 7)
    prgRom[codePos++] = 0xFB;
    
    // Wait for second VBlank
    prgRom[codePos++] = 0x2C; // BIT $2002
    prgRom[codePos++] = 0x02;
    prgRom[codePos++] = 0x20;
    prgRom[codePos++] = 0x10; // BPL
    prgRom[codePos++] = 0xFB;
    
    // Clear RAM
    prgRom[codePos++] = 0xA2; // LDX #$00
    prgRom[codePos++] = 0x00;
    prgRom[codePos++] = 0xA9; // LDA #$00
    prgRom[codePos++] = 0x00;
    // Clear loop
    const clearLoop = codePos;
    prgRom[codePos++] = 0x95; // STA $00,X
    prgRom[codePos++] = 0x00;
    prgRom[codePos++] = 0xE8; // INX
    prgRom[codePos++] = 0xD0; // BNE (loop)
    prgRom[codePos++] = clearLoop - codePos - 1;
    
    // Set palette
    prgRom[codePos++] = 0xA9; // LDA #$3F
    prgRom[codePos++] = 0x3F;
    prgRom[codePos++] = 0x8D; // STA $2006
    prgRom[codePos++] = 0x06;
    prgRom[codePos++] = 0x20;
    prgRom[codePos++] = 0xA9; // LDA #$00
    prgRom[codePos++] = 0x00;
    prgRom[codePos++] = 0x8D; // STA $2006
    prgRom[codePos++] = 0x06;
    prgRom[codePos++] = 0x20;
    
    // Write palette colors (32 bytes)
    const palette = [
        0x0F, 0x30, 0x30, 0x30, 0x0F, 0x30, 0x30, 0x30,
        0x0F, 0x30, 0x30, 0x30, 0x0F, 0x30, 0x30, 0x30,
        0x0F, 0x30, 0x30, 0x30, 0x0F, 0x30, 0x30, 0x30,
        0x0F, 0x30, 0x30, 0x30, 0x0F, 0x30, 0x30, 0x30
    ];
    for (let i = 0; i < palette.length; i++) {
        prgRom[codePos++] = 0xA9; // LDA #color
        prgRom[codePos++] = palette[i];
        prgRom[codePos++] = 0x8D; // STA $2007
        prgRom[codePos++] = 0x07;
        prgRom[codePos++] = 0x20;
    }
    
    // Set PPU address to $21CC (row 14, column 12)
    prgRom[codePos++] = 0xA9; // LDA #$21
    prgRom[codePos++] = 0x21;
    prgRom[codePos++] = 0x8D; // STA $2006
    prgRom[codePos++] = 0x06;
    prgRom[codePos++] = 0x20;
    prgRom[codePos++] = 0xA9; // LDA #$CC
    prgRom[codePos++] = 0xCC;
    prgRom[codePos++] = 0x8D; // STA $2006
    prgRom[codePos++] = 0x06;
    prgRom[codePos++] = 0x20;
    
    // Write "HELLO WORLD" to screen
    const text = [0x11, 0x0E, 0x15, 0x15, 0x18, 0x00, 0x20, 0x18, 0x1B, 0x15, 0x0D];
    for (let i = 0; i < text.length; i++) {
        prgRom[codePos++] = 0xA9; // LDA #char
        prgRom[codePos++] = text[i];
        prgRom[codePos++] = 0x8D; // STA $2007
        prgRom[codePos++] = 0x07;
        prgRom[codePos++] = 0x20;
    }
    
    // Enable PPU
    prgRom[codePos++] = 0xA9; // LDA #$90
    prgRom[codePos++] = 0x90;
    prgRom[codePos++] = 0x8D; // STA $2000
    prgRom[codePos++] = 0x00;
    prgRom[codePos++] = 0x20;
    prgRom[codePos++] = 0xA9; // LDA #$1E
    prgRom[codePos++] = 0x1E;
    prgRom[codePos++] = 0x8D; // STA $2001
    prgRom[codePos++] = 0x01;
    prgRom[codePos++] = 0x20;
    
    // Infinite loop
    const loopAddr = codePos;
    prgRom[codePos++] = 0x4C; // JMP to self
    prgRom[codePos++] = loopAddr & 0xFF;
    prgRom[codePos++] = 0x80; // High byte (0x8000 + loopAddr)
    
    // Set interrupt vectors at end of PRG ROM
    prgRom[0x7FFA] = 0x00; // NMI vector
    prgRom[0x7FFB] = 0x80;
    prgRom[0x7FFC] = 0x00; // Reset vector (points to start of code at 0x8000)
    prgRom[0x7FFD] = 0x80;
    prgRom[0x7FFE] = 0x00; // IRQ vector
    prgRom[0x7FFF] = 0x80;
    
    // Add PRG ROM to output
    rom.push(...prgRom);
    
    // CHR ROM (8KB = 8192 bytes) - Simple font
    const chrRom = new Array(8192).fill(0x00);
    
    // Define simple 8x8 font for letters
    const font = {
        0x0D: [ // D
            0b00111100,
            0b01000010,
            0b01000010,
            0b01000010,
            0b01000010,
            0b01000010,
            0b00111100,
            0b00000000
        ],
        0x0E: [ // E
            0b01111110,
            0b01000000,
            0b01000000,
            0b01111100,
            0b01000000,
            0b01000000,
            0b01111110,
            0b00000000
        ],
        0x11: [ // H
            0b01000010,
            0b01000010,
            0b01000010,
            0b01111110,
            0b01000010,
            0b01000010,
            0b01000010,
            0b00000000
        ],
        0x15: [ // L
            0b01000000,
            0b01000000,
            0b01000000,
            0b01000000,
            0b01000000,
            0b01000000,
            0b01111110,
            0b00000000
        ],
        0x18: [ // O
            0b00111100,
            0b01000010,
            0b01000010,
            0b01000010,
            0b01000010,
            0b01000010,
            0b00111100,
            0b00000000
        ],
        0x1B: [ // R
            0b00111100,
            0b01000010,
            0b01000010,
            0b00111100,
            0b01000100,
            0b01000010,
            0b01000001,
            0b00000000
        ],
        0x20: [ // W
            0b01000010,
            0b01000010,
            0b01000010,
            0b01011010,
            0b01011010,
            0b01100110,
            0b01000010,
            0b00000000
        ]
    };
    
    // Write font data to CHR ROM
    for (const [charCode, pixels] of Object.entries(font)) {
        const offset = parseInt(charCode) * 16;
        for (let i = 0; i < 8; i++) {
            chrRom[offset + i] = pixels[i];
        }
    }
    
    // Add CHR ROM to output
    rom.push(...chrRom);
    
    return Buffer.from(rom);
}

// Generate and save the ROM
const romData = createHelloWorldROM();
fs.writeFileSync('hello-world.nes', romData);
console.log('Generated hello-world.nes (' + romData.length + ' bytes)');
