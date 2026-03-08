       IDENTIFICATION DIVISION.
       PROGRAM-ID. PRIME-TROUBLES.

       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01 WS-X             PIC 9(3).
       01 WS-I             PIC 9(3).
       01 WS-ISQUARED      PIC 9(5).
       01 WS-REMAINDER     PIC 9(3).
       01 WS-FORMULA-VAL   PIC S9(5).
       01 WS-FORMULA-REM   PIC 9(3).
       01 WS-IS-PRIME      PIC 9 VALUE 0.
       01 WS-DISPLAY-NUM   PIC Z(2)9.

       PROCEDURE DIVISION.
       MAIN-PARA.
           DISPLAY "Primes 0-101 where ((2*x)-1) % 7 = 4:"
           DISPLAY SPACES

           PERFORM VARYING WS-X FROM 0 BY 1
               UNTIL WS-X > 101
               PERFORM CHECK-PRIME
               IF WS-IS-PRIME = 1
                   COMPUTE WS-FORMULA-VAL =
                       (2 * WS-X) - 1
                   DIVIDE WS-FORMULA-VAL BY 7
                       GIVING WS-FORMULA-VAL
                       REMAINDER WS-FORMULA-REM
                   IF WS-FORMULA-REM = 4
                       MOVE WS-X TO WS-DISPLAY-NUM
                       DISPLAY WS-DISPLAY-NUM
                   END-IF
               END-IF
           END-PERFORM

           STOP RUN.

       CHECK-PRIME.
           MOVE 0 TO WS-IS-PRIME

           IF WS-X < 2
               EXIT PARAGRAPH
           END-IF

           IF WS-X = 2 OR WS-X = 3
               MOVE 1 TO WS-IS-PRIME
               EXIT PARAGRAPH
           END-IF

           DIVIDE WS-X BY 2 GIVING WS-I
               REMAINDER WS-REMAINDER
           IF WS-REMAINDER = 0
               EXIT PARAGRAPH
           END-IF

           DIVIDE WS-X BY 3 GIVING WS-I
               REMAINDER WS-REMAINDER
           IF WS-REMAINDER = 0
               EXIT PARAGRAPH
           END-IF

           MOVE 5 TO WS-I
           PERFORM TRIAL-LOOP UNTIL WS-ISQUARED > WS-X
               OR WS-IS-PRIME = 0

           IF WS-IS-PRIME NOT = 0
               MOVE 1 TO WS-IS-PRIME
           END-IF
           .

       TRIAL-LOOP.
           COMPUTE WS-ISQUARED = WS-I * WS-I
           IF WS-ISQUARED > WS-X
               MOVE 1 TO WS-IS-PRIME
               EXIT PARAGRAPH
           END-IF

           DIVIDE WS-X BY WS-I GIVING WS-REMAINDER
               REMAINDER WS-REMAINDER
           IF WS-REMAINDER = 0
               MOVE 0 TO WS-IS-PRIME
               EXIT PARAGRAPH
           END-IF

           ADD 2 TO WS-I
           DIVIDE WS-X BY WS-I GIVING WS-REMAINDER
               REMAINDER WS-REMAINDER
           IF WS-REMAINDER = 0
               MOVE 0 TO WS-IS-PRIME
               EXIT PARAGRAPH
           END-IF

           ADD 4 TO WS-I
           .
