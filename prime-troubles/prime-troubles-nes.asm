; Prime Troubles - NES (6502) Assembly
; Finds primes 0-101 where ((2*x)-1) % 7 = 4
; Outputs results to screen via PPU nametable
; Assemble with ca65/ld65 (cc65 suite)
;
; Build:
;   ca65 prime-troubles-nes.asm -o prime.o
;   ld65 prime.o -C nes.cfg -o prime.nes

; ---- iNES Header ----
.segment "HEADER"
    .byte "NES", $1A    ; magic
    .byte 2              ; 2x 16KB PRG-ROM = 32KB
    .byte 0              ; 0x 8KB CHR-ROM (using CHR-RAM)
    .byte $01            ; mapper 0, vertical mirroring
    .byte $00
    .byte $00,$00,$00,$00,$00,$00,$00,$00

; ---- Zero Page ----
.segment "ZEROPAGE"
current:    .res 1
divisor:    .res 1
temp:       .res 1
remain:     .res 1
div_by:     .res 1
cursor_lo:  .res 1       ; PPU nametable address low
cursor_hi:  .res 1       ; PPU nametable address high
row_count:  .res 1       ; how many results printed on current row
col_offset: .res 1
num_buf:    .res 3       ; 3-digit decimal buffer

; ---- PPU registers ----
PPUCTRL   = $2000
PPUMASK   = $2001
PPUSTATUS = $2002
PPUADDR   = $2006
PPUDATA   = $2007

; ---- Code ----
.segment "CODE"

; ---- NMI / IRQ stubs ----
nmi:
    RTI

irq:
    RTI

; ---- Reset vector ----
reset:
    SEI
    CLD
    LDX #$FF
    TXS

    ; Disable PPU
    LDA #$00
    STA PPUCTRL
    STA PPUMASK

    ; Wait for PPU warmup (2 vblanks)
    JSR wait_vblank
    JSR wait_vblank

    ; Load font tiles into CHR-RAM (pattern table 0)
    JSR load_font

    ; Clear nametable $2000
    JSR clear_nametable

    ; Set palette
    JSR load_palette

    ; Print header at row 2
    LDA #$20
    STA cursor_hi
    LDA #$42            ; row 2, col 1
    STA cursor_lo
    JSR set_ppu_addr
    LDX #0
@hdr_loop:
    LDA header_str,X
    BEQ @hdr_done
    STA PPUDATA
    INX
    BNE @hdr_loop
@hdr_done:

    ; Start results at row 5, col 2
    LDA #$20
    STA cursor_hi
    LDA #$E2            ; row 7, col 2
    STA cursor_lo
    LDA #0
    STA col_offset

    ; Main computation
    LDA #0
    STA current

main_loop:
    LDA current
    CMP #102
    BCS done

    JSR is_prime
    BEQ next

    ; Check ((2*x)-1) % 7 == 4
    LDA current
    ASL A
    SEC
    SBC #1
    STA temp
    ; temp % 7 via repeated subtraction
    LDA temp
@mod7:
    CMP #7
    BCC @mod_done
    SEC
    SBC #7
    JMP @mod7
@mod_done:
    CMP #4
    BNE next

    ; Print this number to screen
    JSR print_result

next:
    INC current
    JMP main_loop

done:
    ; Enable rendering
    JSR wait_vblank
    LDA #$00
    STA PPUCTRL
    LDA #$0E            ; show background
    STA PPUMASK

    ; Reset scroll
    LDA #$00
    STA PPUADDR
    STA PPUADDR
    STA $2005
    STA $2005

forever:
    JMP forever

; -----------------------------------------------
; wait_vblank
; -----------------------------------------------
wait_vblank:
    BIT PPUSTATUS
@wv:
    BIT PPUSTATUS
    BPL @wv
    RTS

; -----------------------------------------------
; load_font: copy font data into CHR-RAM
; Each char is 8 bytes plane0 + 8 bytes plane1
; We only use plane0 (1-color), plane1 = 0
; Tiles 0-127 for ASCII-ish mapping
; We only need 0-9, A-Z, space, and some punctuation
; -----------------------------------------------
load_font:
    LDA PPUSTATUS
    LDA #$00
    STA PPUADDR
    STA PPUADDR         ; CHR-RAM address $0000

    ; Write blank tile 0 (space)
    LDX #16
@blank:
    LDA #$00
    STA PPUDATA
    DEX
    BNE @blank

    ; Tiles 1-47 blank (we only need from tile $30 onward)
    ; Write 47 * 16 = 752 zero bytes
    LDY #47
@skip_outer:
    LDX #16
@skip_inner:
    LDA #$00
    STA PPUDATA
    DEX
    BNE @skip_inner
    DEY
    BNE @skip_outer

    ; Now at tile $30 (ASCII '0') - write digits 0-9
    ; Then tiles $3A-$40 blank, then $41 'A'-'Z'
    LDX #0
@font_loop:
    CPX #font_data_end - font_data
    BCS @font_done
    LDA font_data,X
    STA PPUDATA
    INX
    JMP @font_loop
@font_done:
    RTS

; -----------------------------------------------
; clear_nametable: fill $2000-$23BF with tile 0
; -----------------------------------------------
clear_nametable:
    LDA PPUSTATUS
    LDA #$20
    STA PPUADDR
    LDA #$00
    STA PPUADDR

    LDX #4              ; 4 * 256 = 1024 bytes
    LDY #0
    LDA #$00
@clr:
    STA PPUDATA
    INY
    BNE @clr
    DEX
    BNE @clr
    RTS

; -----------------------------------------------
; load_palette
; -----------------------------------------------
load_palette:
    LDA PPUSTATUS
    LDA #$3F
    STA PPUADDR
    LDA #$00
    STA PPUADDR

    ; BG palette 0: black bg, white text
    LDA #$0F            ; black
    STA PPUDATA
    LDA #$30            ; white
    STA PPUDATA
    LDA #$30
    STA PPUDATA
    LDA #$30
    STA PPUDATA
    RTS

; -----------------------------------------------
; set_ppu_addr: set PPU address from cursor_hi/lo
; -----------------------------------------------
set_ppu_addr:
    LDA PPUSTATUS
    LDA cursor_hi
    STA PPUADDR
    LDA cursor_lo
    STA PPUADDR
    RTS

; -----------------------------------------------
; print_result: write current number to nametable
; Advances cursor, wraps to next row after 5 nums
; -----------------------------------------------
print_result:
    JSR set_ppu_addr

    ; Convert current to decimal in num_buf
    LDA current
    JSR to_decimal

    ; Write digits (skip leading zeros)
    LDA num_buf         ; hundreds
    BEQ @skip_h
    STA PPUDATA
    JMP @do_tens
@skip_h:
    LDA #$00            ; space tile
    STA PPUDATA
@do_tens:
    LDA num_buf+1       ; tens
    BNE @print_t
    LDA num_buf         ; if hundreds was 0 too, skip
    BNE @print_t
    LDA #$00
    STA PPUDATA
    JMP @do_ones
@print_t:
    LDA num_buf+1
    STA PPUDATA
@do_ones:
    LDA num_buf+2
    STA PPUDATA

    ; Add spacing tile
    LDA #$00
    STA PPUDATA
    STA PPUDATA

    ; Advance cursor by 5 tiles
    LDA cursor_lo
    CLC
    ADC #5
    STA cursor_lo
    LDA cursor_hi
    ADC #0
    STA cursor_hi

    INC col_offset
    LDA col_offset
    CMP #5
    BCC @no_wrap

    ; Wrap to next row
    LDA #0
    STA col_offset
    ; Move cursor to next row: add (32 - 25) = 7 to get to col 2 of next row
    LDA cursor_lo
    CLC
    ADC #7
    STA cursor_lo
    LDA cursor_hi
    ADC #0
    STA cursor_hi

@no_wrap:
    RTS

; -----------------------------------------------
; to_decimal: convert A to 3 tile indices in num_buf
; Tile $30 = '0', $31 = '1', etc.
; -----------------------------------------------
to_decimal:
    LDY #0              ; hundreds
@hund:
    CMP #100
    BCC @tens
    SEC
    SBC #100
    INY
    JMP @hund
@tens:
    PHA
    TYA
    CLC
    ADC #$30
    STA num_buf
    PLA

    LDY #0
@ten_lp:
    CMP #10
    BCC @ones
    SEC
    SBC #10
    INY
    JMP @ten_lp
@ones:
    PHA
    TYA
    CLC
    ADC #$30
    STA num_buf+1
    PLA
    CLC
    ADC #$30
    STA num_buf+2
    RTS

; -----------------------------------------------
; is_prime: test if current is prime
; Returns Z=1 (BEQ) if NOT prime, Z=0 (BNE) if prime
; -----------------------------------------------
is_prime:
    LDA current
    CMP #2
    BCC @no
    BEQ @yes
    CMP #3
    BEQ @yes
    CMP #4
    BCC @yes

    ; Even check
    AND #$01
    BEQ @no

    ; % 3
    LDA current
    LDX #3
    JSR divmod
    LDA remain
    BEQ @no

    ; Trial division from 5
    LDA #5
    STA divisor

@trial:
    ; divisor * divisor
    LDA divisor
    TAX
    LDA #0
    CLC
@sq:
    DEX
    BMI @sq_done
    ADC divisor
    BCS @yes             ; overflow > 255 > 101
    JMP @sq
@sq_done:
    CMP current
    BEQ @chk
    BCS @yes             ; i*i > n
@chk:
    ; n % divisor
    LDA current
    LDX divisor
    JSR divmod
    LDA remain
    BEQ @no

    ; n % (divisor+2)
    LDA current
    LDX divisor
    INX
    INX
    JSR divmod
    LDA remain
    BEQ @no

    LDA divisor
    CLC
    ADC #6
    STA divisor
    JMP @trial

@yes:
    LDA #1               ; Z=0 means prime
    RTS
@no:
    LDA #0               ; Z=1 means not prime
    RTS

; -----------------------------------------------
; divmod: A % X -> remain
; -----------------------------------------------
divmod:
    STX div_by
@dm:
    CMP div_by
    BCC @dm_done
    SEC
    SBC div_by
    JMP @dm
@dm_done:
    STA remain
    RTS

; -----------------------------------------------
; Font data: 8 bytes per char (plane 0 only)
; followed by 8 zero bytes (plane 1)
; Starting at tile $30 ('0') through $5A ('Z')
; We include 0-9, then 7 blank tiles (:;<=>?@),
; then A-Z, plus some extras for the header
; -----------------------------------------------
font_data:
; '0' tile $30
.byte $3C,$66,$6E,$76,$66,$66,$3C,$00, $00,$00,$00,$00,$00,$00,$00,$00
; '1'
.byte $18,$38,$18,$18,$18,$18,$7E,$00, $00,$00,$00,$00,$00,$00,$00,$00
; '2'
.byte $3C,$66,$06,$1C,$30,$60,$7E,$00, $00,$00,$00,$00,$00,$00,$00,$00
; '3'
.byte $3C,$66,$06,$1C,$06,$66,$3C,$00, $00,$00,$00,$00,$00,$00,$00,$00
; '4'
.byte $0C,$1C,$3C,$6C,$7E,$0C,$0C,$00, $00,$00,$00,$00,$00,$00,$00,$00
; '5'
.byte $7E,$60,$7C,$06,$06,$66,$3C,$00, $00,$00,$00,$00,$00,$00,$00,$00
; '6'
.byte $1C,$30,$60,$7C,$66,$66,$3C,$00, $00,$00,$00,$00,$00,$00,$00,$00
; '7'
.byte $7E,$06,$0C,$18,$18,$18,$18,$00, $00,$00,$00,$00,$00,$00,$00,$00
; '8'
.byte $3C,$66,$66,$3C,$66,$66,$3C,$00, $00,$00,$00,$00,$00,$00,$00,$00
; '9'
.byte $3C,$66,$66,$3E,$06,$0C,$38,$00, $00,$00,$00,$00,$00,$00,$00,$00
; ':' through '@' - 7 blank tiles
.byte $00,$00,$00,$00,$00,$00,$00,$00, $00,$00,$00,$00,$00,$00,$00,$00
.byte $00,$00,$00,$00,$00,$00,$00,$00, $00,$00,$00,$00,$00,$00,$00,$00
.byte $00,$00,$00,$00,$00,$00,$00,$00, $00,$00,$00,$00,$00,$00,$00,$00
.byte $00,$00,$00,$00,$00,$00,$00,$00, $00,$00,$00,$00,$00,$00,$00,$00
.byte $00,$00,$00,$00,$00,$00,$00,$00, $00,$00,$00,$00,$00,$00,$00,$00
.byte $00,$00,$00,$00,$00,$00,$00,$00, $00,$00,$00,$00,$00,$00,$00,$00
.byte $00,$00,$00,$00,$00,$00,$00,$00, $00,$00,$00,$00,$00,$00,$00,$00
; 'A' tile $41
.byte $18,$3C,$66,$66,$7E,$66,$66,$00, $00,$00,$00,$00,$00,$00,$00,$00
; 'B'
.byte $7C,$66,$66,$7C,$66,$66,$7C,$00, $00,$00,$00,$00,$00,$00,$00,$00
; 'C'
.byte $3C,$66,$60,$60,$60,$66,$3C,$00, $00,$00,$00,$00,$00,$00,$00,$00
; 'D'
.byte $78,$6C,$66,$66,$66,$6C,$78,$00, $00,$00,$00,$00,$00,$00,$00,$00
; 'E'
.byte $7E,$60,$60,$7C,$60,$60,$7E,$00, $00,$00,$00,$00,$00,$00,$00,$00
; 'F'
.byte $7E,$60,$60,$7C,$60,$60,$60,$00, $00,$00,$00,$00,$00,$00,$00,$00
; 'G'
.byte $3C,$66,$60,$6E,$66,$66,$3E,$00, $00,$00,$00,$00,$00,$00,$00,$00
; 'H'
.byte $66,$66,$66,$7E,$66,$66,$66,$00, $00,$00,$00,$00,$00,$00,$00,$00
; 'I'
.byte $3C,$18,$18,$18,$18,$18,$3C,$00, $00,$00,$00,$00,$00,$00,$00,$00
; 'J'
.byte $06,$06,$06,$06,$06,$66,$3C,$00, $00,$00,$00,$00,$00,$00,$00,$00
; 'K'
.byte $66,$6C,$78,$70,$78,$6C,$66,$00, $00,$00,$00,$00,$00,$00,$00,$00
; 'L'
.byte $60,$60,$60,$60,$60,$60,$7E,$00, $00,$00,$00,$00,$00,$00,$00,$00
; 'M'
.byte $63,$77,$7F,$6B,$63,$63,$63,$00, $00,$00,$00,$00,$00,$00,$00,$00
; 'N'
.byte $66,$76,$7E,$7E,$6E,$66,$66,$00, $00,$00,$00,$00,$00,$00,$00,$00
; 'O'
.byte $3C,$66,$66,$66,$66,$66,$3C,$00, $00,$00,$00,$00,$00,$00,$00,$00
; 'P'
.byte $7C,$66,$66,$7C,$60,$60,$60,$00, $00,$00,$00,$00,$00,$00,$00,$00
; 'Q'
.byte $3C,$66,$66,$66,$6A,$6C,$36,$00, $00,$00,$00,$00,$00,$00,$00,$00
; 'R'
.byte $7C,$66,$66,$7C,$6C,$66,$66,$00, $00,$00,$00,$00,$00,$00,$00,$00
; 'S'
.byte $3C,$66,$60,$3C,$06,$66,$3C,$00, $00,$00,$00,$00,$00,$00,$00,$00
; 'T'
.byte $7E,$18,$18,$18,$18,$18,$18,$00, $00,$00,$00,$00,$00,$00,$00,$00
; 'U'
.byte $66,$66,$66,$66,$66,$66,$3C,$00, $00,$00,$00,$00,$00,$00,$00,$00
; 'V'
.byte $66,$66,$66,$66,$66,$3C,$18,$00, $00,$00,$00,$00,$00,$00,$00,$00
; 'W'
.byte $63,$63,$63,$6B,$7F,$77,$63,$00, $00,$00,$00,$00,$00,$00,$00,$00
; 'X'
.byte $66,$66,$3C,$18,$3C,$66,$66,$00, $00,$00,$00,$00,$00,$00,$00,$00
; 'Y'
.byte $66,$66,$66,$3C,$18,$18,$18,$00, $00,$00,$00,$00,$00,$00,$00,$00
; 'Z'
.byte $7E,$06,$0C,$18,$30,$60,$7E,$00, $00,$00,$00,$00,$00,$00,$00,$00
font_data_end:

; -----------------------------------------------
; Header string (tile indices matching ASCII)
; -----------------------------------------------
header_str:
.byte $50,$52,$49,$4D,$45,$53,$00      ; "PRIMES "
.byte $30,$00,$54,$4F,$00              ; "0 TO "
.byte $31,$30,$31,$00                  ; "101 "
.byte $37,$00,$46,$4F,$52,$4D,$55,$4C,$41  ; "7 FORMULA"
.byte $00

; -----------------------------------------------
; Vectors
; -----------------------------------------------
.segment "VECTORS"
    .word nmi
    .word reset
    .word irq
