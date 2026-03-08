; Prime Troubles - 8086 Assembly (NASM, DOS .COM)
; Finds primes 0-101 where ((2*x)-1) % 7 = 4
; Assemble: nasm -f bin -o prime.com prime-troubles.asm

org 100h

section .text

start:
    ; Print header
    mov dx, header_msg
    mov ah, 09h
    int 21h

    mov byte [current], 0

main_loop:
    mov al, [current]
    cmp al, 102
    jge done

    ; Check if prime
    call is_prime
    cmp al, 0
    je next

    ; Check ((2*x)-1) % 7 == 4
    mov al, [current]
    shl al, 1          ; 2 * x
    dec al              ; (2*x) - 1
    cbw                 ; sign-extend AL into AX
    mov bl, 7
    idiv bl             ; AX / 7, remainder in AH
    cmp ah, 4
    jne next

    ; Print the number
    mov al, [current]
    call print_num
    ; Print newline
    mov dx, newline
    mov ah, 09h
    int 21h

next:
    inc byte [current]
    jmp main_loop

done:
    mov ax, 4C00h
    int 21h

; ------------------------------------------
; is_prime: checks if [current] is prime
; Returns AL=1 if prime, AL=0 if not
; ------------------------------------------
is_prime:
    push bx
    push cx
    push dx

    mov al, [current]
    cmp al, 2
    jl .not_prime
    cmp al, 2
    je .is_prime_yes
    cmp al, 3
    je .is_prime_yes

    ; Check even
    test al, 1
    jz .not_prime

    ; Check % 3
    cbw
    mov bl, 3
    idiv bl
    cmp ah, 0
    je .not_prime

    ; Trial division from 5, step 6
    mov cl, 5           ; i = 5

.trial_loop:
    mov al, cl
    mul cl              ; AL = i*i (result in AX)
    mov bl, [current]
    xor bh, bh
    cmp ax, bx
    ja .is_prime_yes    ; i*i > n, it's prime

    ; Check n % i
    mov al, [current]
    cbw
    div cl              ; AX / CL, remainder in AH
    cmp ah, 0
    je .not_prime

    ; Check n % (i+2)
    mov al, [current]
    cbw
    mov bl, cl
    add bl, 2
    div bl
    cmp ah, 0
    je .not_prime

    add cl, 6
    jmp .trial_loop

.is_prime_yes:
    mov al, 1
    jmp .is_prime_done

.not_prime:
    mov al, 0

.is_prime_done:
    pop dx
    pop cx
    pop bx
    ret

; ------------------------------------------
; print_num: prints AL as decimal (0-255)
; ------------------------------------------
print_num:
    push ax
    push bx
    push cx
    push dx

    xor ah, ah
    mov bl, 100
    div bl              ; AL = hundreds, AH = remainder
    mov cl, ah          ; save remainder
    mov [digits], al

    mov al, cl
    xor ah, ah
    mov bl, 10
    div bl              ; AL = tens, AH = ones
    mov [digits+1], al
    mov [digits+2], ah

    ; Skip leading zeros
    mov si, 0
    cmp byte [digits], 0
    jne .print_digits
    inc si
    cmp byte [digits+1], 0
    jne .print_digits
    inc si

.print_digits:
    mov al, [digits+si]
    add al, '0'
    mov dl, al
    mov ah, 02h
    int 21h
    inc si
    cmp si, 3
    jl .print_digits

    pop dx
    pop cx
    pop bx
    pop ax
    ret

section .data

header_msg db 'Primes 0-101 where ((2*x)-1)%7=4:', 0Dh, 0Ah, '$'
newline    db 0Dh, 0Ah, '$'

section .bss

current resb 1
digits  resb 3
