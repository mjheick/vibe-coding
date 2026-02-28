# NES Emulator - PHP-WASM

A Nintendo Entertainment System emulator built with PHP running in WebAssembly, using the browser as the display.

## Controls

- **Arrow Keys**: D-Pad (Up, Down, Left, Right)
- **A Key**: A Button
- **B Key**: B Button
- **F1**: Select
- **F2**: Start

## Setup

1. Serve the files using a local web server (required for loading modules):

```bash
# Using PHP's built-in server
php -S localhost:8000

# Or using Python
python -m http.server 8000

# Or using Node.js http-server
npx http-server -p 8000
```

2. Open your browser to `http://localhost:8000`

3. Click "Load ROM File" and select a .nes ROM file

## Architecture

- **index.html**: Main HTML structure
- **emulator.js**: JavaScript controller that manages PHP-WASM and browser rendering
- **nes_emulator.php**: PHP-based NES emulation core (CPU, PPU, memory)
- **style.css**: Styling for the emulator interface

## How It Works

1. PHP-WASM loads and runs the PHP emulator code in the browser
2. JavaScript captures keyboard input and passes it to PHP
3. PHP executes the emulation logic (CPU cycles, PPU rendering)
4. Frame data is returned to JavaScript and rendered on the canvas
5. The loop continues at ~60 FPS using requestAnimationFrame

## Note

This is a minimal implementation demonstrating the concept. A full NES emulator requires implementing all CPU opcodes, PPU features, APU for audio, and mapper support for different cartridge types.
