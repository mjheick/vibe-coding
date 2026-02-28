<?php

class NESEmulator {
    private $memory;
    private $cpu;
    private $ppu;
    private $rom;
    private $input;
    
    public function __construct() {
        $this->memory = array_fill(0, 0x10000, 0);
        $this->cpu = new CPU6502($this->memory);
        $this->ppu = new PPU();
        $this->input = [
            'up' => false, 'down' => false, 'left' => false, 'right' => false,
            'a' => false, 'b' => false, 'select' => false, 'start' => false
        ];
    }
    
    public function loadROM($filename) {
        $this->rom = file_get_contents($filename);
        $this->parseROM();
    }
    
    private function parseROM() {
        // NES ROM header parsing (iNES format)
        $header = substr($this->rom, 0, 16);
        $prgSize = ord($header[4]) * 16384;
        $chrSize = ord($header[5]) * 8192;
        
        // Load PRG ROM into memory
        $prgRom = substr($this->rom, 16, $prgSize);
        for ($i = 0; $i < $prgSize; $i++) {
            $this->memory[0x8000 + $i] = ord($prgRom[$i]);
        }
        
        // Load CHR ROM
        $chrRom = substr($this->rom, 16 + $prgSize, $chrSize);
        $this->ppu->loadCHR($chrRom);
    }
    
    public function setInput($input) {
        $this->input = $input;
    }
    
    public function runFrame() {
        // Run one frame (approximately 29780 CPU cycles)
        for ($i = 0; $i < 29780; $i++) {
            $this->cpu->step();
            
            // PPU runs 3 times per CPU cycle
            for ($j = 0; $j < 3; $j++) {
                $this->ppu->step();
            }
        }
        
        return [
            'pixels' => $this->ppu->getFrameBuffer()
        ];
    }
}

class PPU {
    private $frameBuffer;
    private $chrRom;
    private $scanline;
    private $cycle;
    
    private $nesPalette = [
        [84, 84, 84], [0, 30, 116], [8, 16, 144], [48, 0, 136],
        [68, 0, 100], [92, 0, 48], [84, 4, 0], [60, 24, 0],
        [32, 42, 0], [8, 58, 0], [0, 64, 0], [0, 60, 0],
        [0, 50, 60], [0, 0, 0], [0, 0, 0], [0, 0, 0]
    ];
    
    public function __construct() {
        $this->frameBuffer = [];
        $this->scanline = 0;
        $this->cycle = 0;
        $this->initFrameBuffer();
    }
    
    private function initFrameBuffer() {
        for ($i = 0; $i < 256 * 240; $i++) {
            $this->frameBuffer[$i] = ['r' => 0, 'g' => 0, 'b' => 0];
        }
    }
    
    public function loadCHR($chrData) {
        $this->chrRom = $chrData;
    }
    
    public function step() {
        $this->cycle++;
        
        if ($this->cycle > 340) {
            $this->cycle = 0;
            $this->scanline++;
            
            if ($this->scanline > 261) {
                $this->scanline = 0;
            }
        }
        
        // Render pixel
        if ($this->scanline < 240 && $this->cycle < 256) {
            $pixelIndex = $this->scanline * 256 + $this->cycle;
            $color = $this->nesPalette[$pixelIndex % 16];
            $this->frameBuffer[$pixelIndex] = [
                'r' => $color[0],
                'g' => $color[1],
                'b' => $color[2]
            ];
        }
    }
    
    public function getFrameBuffer() {
        return $this->frameBuffer;
    }
}

class CPU6502 {
    private $memory;
    private $pc;
    private $sp;
    private $a;
    private $x;
    private $y;
    private $status;
    
    // Status flags
    const FLAG_C = 0x01; // Carry
    const FLAG_Z = 0x02; // Zero
    const FLAG_I = 0x04; // Interrupt disable
    const FLAG_D = 0x08; // Decimal mode
    const FLAG_B = 0x10; // Break
    const FLAG_U = 0x20; // Unused
    const FLAG_V = 0x40; // Overflow
    const FLAG_N = 0x80; // Negative
    
    public function __construct(&$memory) {
        $this->memory = &$memory;
        $this->reset();
    }
    
    public function reset() {
        $this->pc = $this->readWord(0xFFFC);
        $this->sp = 0xFD;
        $this->a = 0;
        $this->x = 0;
        $this->y = 0;
        $this->status = 0x24;
    }
    
    private function readByte($addr) {
        return $this->memory[$addr & 0xFFFF];
    }
    
    private function writeByte($addr, $value) {
        $this->memory[$addr & 0xFFFF] = $value & 0xFF;
    }
    
    private function readWord($addr) {
        $low = $this->readByte($addr);
        $high = $this->readByte($addr + 1);
        return ($high << 8) | $low;
    }
    
    private function push($value) {
        $this->writeByte(0x0100 + $this->sp, $value);
        $this->sp = ($this->sp - 1) & 0xFF;
    }
    
    private function pop() {
        $this->sp = ($this->sp + 1) & 0xFF;
        return $this->readByte(0x0100 + $this->sp);
    }
    
    private function setFlag($flag, $value) {
        if ($value) {
            $this->status |= $flag;
        } else {
            $this->status &= ~$flag;
        }
    }
    
    private function getFlag($flag) {
        return ($this->status & $flag) != 0;
    }
    
    private function updateZN($value) {
        $this->setFlag(self::FLAG_Z, ($value & 0xFF) == 0);
        $this->setFlag(self::FLAG_N, ($value & 0x80) != 0);
    }
    
    public function step() {
        $opcode = $this->readByte($this->pc);
        $this->pc = ($this->pc + 1) & 0xFFFF;
        
        switch ($opcode) {
            // ADC - Add with Carry
            case 0x69: $this->adc($this->immediate()); break;
            case 0x65: $this->adc($this->zeroPage()); break;
            case 0x75: $this->adc($this->zeroPageX()); break;
            case 0x6D: $this->adc($this->absolute()); break;
            case 0x7D: $this->adc($this->absoluteX()); break;
            case 0x79: $this->adc($this->absoluteY()); break;
            case 0x61: $this->adc($this->indirectX()); break;
            case 0x71: $this->adc($this->indirectY()); break;
            
            // AND - Logical AND
            case 0x29: $this->and($this->immediate()); break;
            case 0x25: $this->and($this->zeroPage()); break;
            case 0x35: $this->and($this->zeroPageX()); break;
            case 0x2D: $this->and($this->absolute()); break;
            case 0x3D: $this->and($this->absoluteX()); break;
            case 0x39: $this->and($this->absoluteY()); break;
            case 0x21: $this->and($this->indirectX()); break;
            case 0x31: $this->and($this->indirectY()); break;
            
            // ASL - Arithmetic Shift Left
            case 0x0A: $this->aslA(); break;
            case 0x06: $this->asl($this->zeroPage()); break;
            case 0x16: $this->asl($this->zeroPageX()); break;
            case 0x0E: $this->asl($this->absolute()); break;
            case 0x1E: $this->asl($this->absoluteX()); break;
            
            // Branch instructions
            case 0x90: $this->branch(!$this->getFlag(self::FLAG_C)); break; // BCC
            case 0xB0: $this->branch($this->getFlag(self::FLAG_C)); break;  // BCS
            case 0xF0: $this->branch($this->getFlag(self::FLAG_Z)); break;  // BEQ
            case 0x30: $this->branch($this->getFlag(self::FLAG_N)); break;  // BMI
            case 0xD0: $this->branch(!$this->getFlag(self::FLAG_Z)); break; // BNE
            case 0x10: $this->branch(!$this->getFlag(self::FLAG_N)); break; // BPL
            case 0x50: $this->branch(!$this->getFlag(self::FLAG_V)); break; // BVC
            case 0x70: $this->branch($this->getFlag(self::FLAG_V)); break;  // BVS
            
            // BIT - Bit Test
            case 0x24: $this->bit($this->zeroPage()); break;
            case 0x2C: $this->bit($this->absolute()); break;
            
            // BRK - Force Interrupt
            case 0x00: $this->brk(); break;
            
            // Clear flags
            case 0x18: $this->setFlag(self::FLAG_C, false); break; // CLC
            case 0xD8: $this->setFlag(self::FLAG_D, false); break; // CLD
            case 0x58: $this->setFlag(self::FLAG_I, false); break; // CLI
            case 0xB8: $this->setFlag(self::FLAG_V, false); break; // CLV
            
            // CMP - Compare Accumulator
            case 0xC9: $this->cmp($this->immediate()); break;
            case 0xC5: $this->cmp($this->zeroPage()); break;
            case 0xD5: $this->cmp($this->zeroPageX()); break;
            case 0xCD: $this->cmp($this->absolute()); break;
            case 0xDD: $this->cmp($this->absoluteX()); break;
            case 0xD9: $this->cmp($this->absoluteY()); break;
            case 0xC1: $this->cmp($this->indirectX()); break;
            case 0xD1: $this->cmp($this->indirectY()); break;
            
            // CPX - Compare X Register
            case 0xE0: $this->cpx($this->immediate()); break;
            case 0xE4: $this->cpx($this->zeroPage()); break;
            case 0xEC: $this->cpx($this->absolute()); break;
            
            // CPY - Compare Y Register
            case 0xC0: $this->cpy($this->immediate()); break;
            case 0xC4: $this->cpy($this->zeroPage()); break;
            case 0xCC: $this->cpy($this->absolute()); break;
            
            // DEC - Decrement Memory
            case 0xC6: $this->dec($this->zeroPage()); break;
            case 0xD6: $this->dec($this->zeroPageX()); break;
            case 0xCE: $this->dec($this->absolute()); break;
            case 0xDE: $this->dec($this->absoluteX()); break;
            
            // DEX, DEY - Decrement X, Y
            case 0xCA: $this->x = ($this->x - 1) & 0xFF; $this->updateZN($this->x); break;
            case 0x88: $this->y = ($this->y - 1) & 0xFF; $this->updateZN($this->y); break;
            
            // EOR - Exclusive OR
            case 0x49: $this->eor($this->immediate()); break;
            case 0x45: $this->eor($this->zeroPage()); break;
            case 0x55: $this->eor($this->zeroPageX()); break;
            case 0x4D: $this->eor($this->absolute()); break;
            case 0x5D: $this->eor($this->absoluteX()); break;
            case 0x59: $this->eor($this->absoluteY()); break;
            case 0x41: $this->eor($this->indirectX()); break;
            case 0x51: $this->eor($this->indirectY()); break;
            
            // INC - Increment Memory
            case 0xE6: $this->inc($this->zeroPage()); break;
            case 0xF6: $this->inc($this->zeroPageX()); break;
            case 0xEE: $this->inc($this->absolute()); break;
            case 0xFE: $this->inc($this->absoluteX()); break;
            
            // INX, INY - Increment X, Y
            case 0xE8: $this->x = ($this->x + 1) & 0xFF; $this->updateZN($this->x); break;
            case 0xC8: $this->y = ($this->y + 1) & 0xFF; $this->updateZN($this->y); break;
            
            // JMP - Jump
            case 0x4C: $this->pc = $this->readWord($this->pc); break;
            case 0x6C: $this->pc = $this->readWord($this->readWord($this->pc)); break;
            
            // JSR - Jump to Subroutine
            case 0x20: $this->jsr(); break;
            
            // LDA - Load Accumulator
            case 0xA9: $this->lda($this->immediate()); break;
            case 0xA5: $this->lda($this->zeroPage()); break;
            case 0xB5: $this->lda($this->zeroPageX()); break;
            case 0xAD: $this->lda($this->absolute()); break;
            case 0xBD: $this->lda($this->absoluteX()); break;
            case 0xB9: $this->lda($this->absoluteY()); break;
            case 0xA1: $this->lda($this->indirectX()); break;
            case 0xB1: $this->lda($this->indirectY()); break;
            
            // LDX - Load X Register
            case 0xA2: $this->ldx($this->immediate()); break;
            case 0xA6: $this->ldx($this->zeroPage()); break;
            case 0xB6: $this->ldx($this->zeroPageY()); break;
            case 0xAE: $this->ldx($this->absolute()); break;
            case 0xBE: $this->ldx($this->absoluteY()); break;
            
            // LDY - Load Y Register
            case 0xA0: $this->ldy($this->immediate()); break;
            case 0xA4: $this->ldy($this->zeroPage()); break;
            case 0xB4: $this->ldy($this->zeroPageX()); break;
            case 0xAC: $this->ldy($this->absolute()); break;
            case 0xBC: $this->ldy($this->absoluteX()); break;
            
            // LSR - Logical Shift Right
            case 0x4A: $this->lsrA(); break;
            case 0x46: $this->lsr($this->zeroPage()); break;
            case 0x56: $this->lsr($this->zeroPageX()); break;
            case 0x4E: $this->lsr($this->absolute()); break;
            case 0x5E: $this->lsr($this->absoluteX()); break;
            
            // NOP
            case 0xEA: break;
            
            // ORA - Logical OR
            case 0x09: $this->ora($this->immediate()); break;
            case 0x05: $this->ora($this->zeroPage()); break;
            case 0x15: $this->ora($this->zeroPageX()); break;
            case 0x0D: $this->ora($this->absolute()); break;
            case 0x1D: $this->ora($this->absoluteX()); break;
            case 0x19: $this->ora($this->absoluteY()); break;
            case 0x01: $this->ora($this->indirectX()); break;
            case 0x11: $this->ora($this->indirectY()); break;
            
            // Stack operations
            case 0x48: $this->push($this->a); break; // PHA
            case 0x08: $this->push($this->status | self::FLAG_B | self::FLAG_U); break; // PHP
            case 0x68: $this->a = $this->pop(); $this->updateZN($this->a); break; // PLA
            case 0x28: $this->status = $this->pop() | self::FLAG_U; break; // PLP
            
            // ROL - Rotate Left
            case 0x2A: $this->rolA(); break;
            case 0x26: $this->rol($this->zeroPage()); break;
            case 0x36: $this->rol($this->zeroPageX()); break;
            case 0x2E: $this->rol($this->absolute()); break;
            case 0x3E: $this->rol($this->absoluteX()); break;
            
            // ROR - Rotate Right
            case 0x6A: $this->rorA(); break;
            case 0x66: $this->ror($this->zeroPage()); break;
            case 0x76: $this->ror($this->zeroPageX()); break;
            case 0x6E: $this->ror($this->absolute()); break;
            case 0x7E: $this->ror($this->absoluteX()); break;
            
            // RTI - Return from Interrupt
            case 0x40: $this->rti(); break;
            
            // RTS - Return from Subroutine
            case 0x60: $this->rts(); break;
            
            // SBC - Subtract with Carry
            case 0xE9: $this->sbc($this->immediate()); break;
            case 0xE5: $this->sbc($this->zeroPage()); break;
            case 0xF5: $this->sbc($this->zeroPageX()); break;
            case 0xED: $this->sbc($this->absolute()); break;
            case 0xFD: $this->sbc($this->absoluteX()); break;
            case 0xF9: $this->sbc($this->absoluteY()); break;
            case 0xE1: $this->sbc($this->indirectX()); break;
            case 0xF1: $this->sbc($this->indirectY()); break;
            
            // Set flags
            case 0x38: $this->setFlag(self::FLAG_C, true); break; // SEC
            case 0xF8: $this->setFlag(self::FLAG_D, true); break; // SED
            case 0x78: $this->setFlag(self::FLAG_I, true); break; // SEI
            
            // STA - Store Accumulator
            case 0x85: $this->sta($this->zeroPage()); break;
            case 0x95: $this->sta($this->zeroPageX()); break;
            case 0x8D: $this->sta($this->absolute()); break;
            case 0x9D: $this->sta($this->absoluteX()); break;
            case 0x99: $this->sta($this->absoluteY()); break;
            case 0x81: $this->sta($this->indirectX()); break;
            case 0x91: $this->sta($this->indirectY()); break;
            
            // STX - Store X Register
            case 0x86: $this->stx($this->zeroPage()); break;
            case 0x96: $this->stx($this->zeroPageY()); break;
            case 0x8E: $this->stx($this->absolute()); break;
            
            // STY - Store Y Register
            case 0x84: $this->sty($this->zeroPage()); break;
            case 0x94: $this->sty($this->zeroPageX()); break;
            case 0x8C: $this->sty($this->absolute()); break;
            
            // Transfer instructions
            case 0xAA: $this->x = $this->a; $this->updateZN($this->x); break; // TAX
            case 0xA8: $this->y = $this->a; $this->updateZN($this->y); break; // TAY
            case 0xBA: $this->x = $this->sp; $this->updateZN($this->x); break; // TSX
            case 0x8A: $this->a = $this->x; $this->updateZN($this->a); break; // TXA
            case 0x9A: $this->sp = $this->x; break; // TXS
            case 0x98: $this->a = $this->y; $this->updateZN($this->a); break; // TYA
            
            default:
                // Unknown opcode - treat as NOP
                break;
        }
    }
    
    // Addressing modes
    private function immediate() {
        return $this->readByte($this->pc++);
    }
    
    private function zeroPage() {
        return $this->readByte($this->readByte($this->pc++) & 0xFF);
    }
    
    private function zeroPageX() {
        return $this->readByte(($this->readByte($this->pc++) + $this->x) & 0xFF);
    }
    
    private function zeroPageY() {
        return $this->readByte(($this->readByte($this->pc++) + $this->y) & 0xFF);
    }
    
    private function absolute() {
        return $this->readByte($this->readWord($this->pc));
    }
    
    private function absoluteX() {
        $addr = $this->readWord($this->pc);
        $this->pc += 2;
        return $this->readByte(($addr + $this->x) & 0xFFFF);
    }
    
    private function absoluteY() {
        $addr = $this->readWord($this->pc);
        $this->pc += 2;
        return $this->readByte(($addr + $this->y) & 0xFFFF);
    }
    
    private function indirectX() {
        $addr = ($this->readByte($this->pc++) + $this->x) & 0xFF;
        return $this->readByte($this->readWord($addr));
    }
    
    private function indirectY() {
        $addr = $this->readWord($this->readByte($this->pc++));
        return $this->readByte(($addr + $this->y) & 0xFFFF);
    }
    
    // Instructions
    private function adc($value) {
        $sum = $this->a + $value + ($this->getFlag(self::FLAG_C) ? 1 : 0);
        $this->setFlag(self::FLAG_C, $sum > 0xFF);
        $this->setFlag(self::FLAG_V, ((~($this->a ^ $value) & ($this->a ^ $sum)) & 0x80) != 0);
        $this->a = $sum & 0xFF;
        $this->updateZN($this->a);
    }
    
    private function and($value) {
        $this->a &= $value;
        $this->updateZN($this->a);
    }
    
    private function aslA() {
        $this->setFlag(self::FLAG_C, ($this->a & 0x80) != 0);
        $this->a = ($this->a << 1) & 0xFF;
        $this->updateZN($this->a);
    }
    
    private function asl($addr) {
        $value = $this->readByte($addr);
        $this->setFlag(self::FLAG_C, ($value & 0x80) != 0);
        $value = ($value << 1) & 0xFF;
        $this->writeByte($addr, $value);
        $this->updateZN($value);
    }
    
    private function branch($condition) {
        $offset = $this->readByte($this->pc++);
        if ($condition) {
            if ($offset & 0x80) $offset |= 0xFF00;
            $this->pc = ($this->pc + $offset) & 0xFFFF;
        }
    }
    
    private function bit($value) {
        $this->setFlag(self::FLAG_Z, ($this->a & $value) == 0);
        $this->setFlag(self::FLAG_V, ($value & 0x40) != 0);
        $this->setFlag(self::FLAG_N, ($value & 0x80) != 0);
    }
    
    private function brk() {
        $this->pc++;
        $this->push(($this->pc >> 8) & 0xFF);
        $this->push($this->pc & 0xFF);
        $this->push($this->status | self::FLAG_B | self::FLAG_U);
        $this->setFlag(self::FLAG_I, true);
        $this->pc = $this->readWord(0xFFFE);
    }
    
    private function cmp($value) {
        $result = $this->a - $value;
        $this->setFlag(self::FLAG_C, $this->a >= $value);
        $this->updateZN($result);
    }
    
    private function cpx($value) {
        $result = $this->x - $value;
        $this->setFlag(self::FLAG_C, $this->x >= $value);
        $this->updateZN($result);
    }
    
    private function cpy($value) {
        $result = $this->y - $value;
        $this->setFlag(self::FLAG_C, $this->y >= $value);
        $this->updateZN($result);
    }
    
    private function dec($addr) {
        $value = ($this->readByte($addr) - 1) & 0xFF;
        $this->writeByte($addr, $value);
        $this->updateZN($value);
    }
    
    private function eor($value) {
        $this->a ^= $value;
        $this->updateZN($this->a);
    }
    
    private function inc($addr) {
        $value = ($this->readByte($addr) + 1) & 0xFF;
        $this->writeByte($addr, $value);
        $this->updateZN($value);
    }
    
    private function jsr() {
        $addr = $this->readWord($this->pc);
        $this->pc++;
        $this->push(($this->pc >> 8) & 0xFF);
        $this->push($this->pc & 0xFF);
        $this->pc = $addr;
    }
    
    private function lda($value) {
        $this->a = $value;
        $this->updateZN($this->a);
    }
    
    private function ldx($value) {
        $this->x = $value;
        $this->updateZN($this->x);
    }
    
    private function ldy($value) {
        $this->y = $value;
        $this->updateZN($this->y);
    }
    
    private function lsrA() {
        $this->setFlag(self::FLAG_C, ($this->a & 0x01) != 0);
        $this->a = ($this->a >> 1) & 0xFF;
        $this->updateZN($this->a);
    }
    
    private function lsr($addr) {
        $value = $this->readByte($addr);
        $this->setFlag(self::FLAG_C, ($value & 0x01) != 0);
        $value = ($value >> 1) & 0xFF;
        $this->writeByte($addr, $value);
        $this->updateZN($value);
    }
    
    private function ora($value) {
        $this->a |= $value;
        $this->updateZN($this->a);
    }
    
    private function rolA() {
        $carry = $this->getFlag(self::FLAG_C) ? 1 : 0;
        $this->setFlag(self::FLAG_C, ($this->a & 0x80) != 0);
        $this->a = (($this->a << 1) | $carry) & 0xFF;
        $this->updateZN($this->a);
    }
    
    private function rol($addr) {
        $value = $this->readByte($addr);
        $carry = $this->getFlag(self::FLAG_C) ? 1 : 0;
        $this->setFlag(self::FLAG_C, ($value & 0x80) != 0);
        $value = (($value << 1) | $carry) & 0xFF;
        $this->writeByte($addr, $value);
        $this->updateZN($value);
    }
    
    private function rorA() {
        $carry = $this->getFlag(self::FLAG_C) ? 0x80 : 0;
        $this->setFlag(self::FLAG_C, ($this->a & 0x01) != 0);
        $this->a = (($this->a >> 1) | $carry) & 0xFF;
        $this->updateZN($this->a);
    }
    
    private function ror($addr) {
        $value = $this->readByte($addr);
        $carry = $this->getFlag(self::FLAG_C) ? 0x80 : 0;
        $this->setFlag(self::FLAG_C, ($value & 0x01) != 0);
        $value = (($value >> 1) | $carry) & 0xFF;
        $this->writeByte($addr, $value);
        $this->updateZN($value);
    }
    
    private function rti() {
        $this->status = $this->pop() | self::FLAG_U;
        $this->pc = $this->pop();
        $this->pc |= $this->pop() << 8;
    }
    
    private function rts() {
        $this->pc = $this->pop();
        $this->pc |= $this->pop() << 8;
        $this->pc++;
    }
    
    private function sbc($value) {
        $this->adc($value ^ 0xFF);
    }
    
    private function sta($addr) {
        $this->writeByte($addr, $this->a);
    }
    
    private function stx($addr) {
        $this->writeByte($addr, $this->x);
    }
    
    private function sty($addr) {
        $this->writeByte($addr, $this->y);
    }
}
