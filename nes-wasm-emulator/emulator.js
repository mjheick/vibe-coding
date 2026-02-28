class NESEmulator {
    constructor() {
        this.canvas = document.getElementById('screen');
        this.ctx = this.canvas.getContext('2d');
        this.status = document.getElementById('status');
        this.php = null;
        this.romData = null;
        this.running = false;
        
        this.keys = {
            up: false,
            down: false,
            left: false,
            right: false,
            a: false,
            b: false,
            select: false,
            start: false
        };
        
        this.init();
    }
    
    async init() {
        this.status.textContent = 'Initializing PHP-WASM...';
        
        try {
            const { PhpWeb } = await import('https://cdn.jsdelivr.net/npm/php-wasm/PhpWeb.mjs');
            this.php = await PhpWeb.loadRuntime('8.3');
            this.status.textContent = 'PHP-WASM Ready';
            
            await this.loadPHPEmulator();
            this.setupControls();
            this.setupROMLoader();
        } catch (error) {
            this.status.textContent = 'Error: ' + error.message;
            console.error(error);
        }
    }
    
    async loadPHPEmulator() {
        const response = await fetch('nes_emulator.php');
        const phpCode = await response.text();
        await this.php.writeFile('/nes_emulator.php', phpCode);
    }
    
    setupControls() {
        document.addEventListener('keydown', (e) => {
            this.handleKeyPress(e, true);
        });
        
        document.addEventListener('keyup', (e) => {
            this.handleKeyPress(e, false);
        });
    }
    
    handleKeyPress(e, pressed) {
        switch(e.key) {
            case 'ArrowUp':
                this.keys.up = pressed;
                e.preventDefault();
                break;
            case 'ArrowDown':
                this.keys.down = pressed;
                e.preventDefault();
                break;
            case 'ArrowLeft':
                this.keys.left = pressed;
                e.preventDefault();
                break;
            case 'ArrowRight':
                this.keys.right = pressed;
                e.preventDefault();
                break;
            case 'a':
            case 'A':
                this.keys.a = pressed;
                break;
            case 'b':
            case 'B':
                this.keys.b = pressed;
                break;
            case 'F1':
                this.keys.select = pressed;
                e.preventDefault();
                break;
            case 'F2':
                this.keys.start = pressed;
                e.preventDefault();
                break;
        }
    }
    
    setupROMLoader() {
        document.getElementById('romFile').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                this.status.textContent = 'Loading ROM...';
                const arrayBuffer = await file.arrayBuffer();
                this.romData = new Uint8Array(arrayBuffer);
                await this.loadROM();
            }
        });
    }
    
    async loadROM() {
        try {
            await this.php.writeFile('/rom.nes', this.romData);
            this.status.textContent = 'ROM Loaded - Starting Emulation';
            this.startEmulation();
        } catch (error) {
            this.status.textContent = 'Error loading ROM: ' + error.message;
        }
    }
    
    async startEmulation() {
        this.running = true;
        this.emulationLoop();
    }
    
    async emulationLoop() {
        if (!this.running) return;
        
        try {
            const inputState = JSON.stringify(this.keys);
            const result = await this.php.run(`<?php
                require '/nes_emulator.php';
                $emulator = new NESEmulator();
                $emulator->loadROM('/rom.nes');
                $input = json_decode('${inputState}', true);
                $emulator->setInput($input);
                $frameData = $emulator->runFrame();
                echo json_encode($frameData);
            ?>`);
            
            const frameData = JSON.parse(result.body);
            this.renderFrame(frameData);
            
        } catch (error) {
            console.error('Emulation error:', error);
        }
        
        requestAnimationFrame(() => this.emulationLoop());
    }
    
    renderFrame(frameData) {
        if (!frameData || !frameData.pixels) return;
        
        const imageData = this.ctx.createImageData(256, 240);
        
        for (let i = 0; i < frameData.pixels.length; i++) {
            const pixel = frameData.pixels[i];
            imageData.data[i * 4] = pixel.r;
            imageData.data[i * 4 + 1] = pixel.g;
            imageData.data[i * 4 + 2] = pixel.b;
            imageData.data[i * 4 + 3] = 255;
        }
        
        this.ctx.putImageData(imageData, 0, 0);
    }
}

const emulator = new NESEmulator();
