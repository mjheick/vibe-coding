#include <stdio.h>

int is_prime(int n) {
    if (n < 2) return 0;
    if (n < 4) return 1;
    if (n % 2 == 0 || n % 3 == 0) return 0;
    for (int i = 5; i * i <= n; i += 6) {
        if (n % i == 0 || n % (i + 2) == 0) return 0;
    }
    return 1;
}

int main(void) {
    printf("Primes between 0 and 101 where ((2 * x) - 1) %% 7 = 4:\n\n");
    for (int x = 0; x <= 101; x++) {
        if (is_prime(x) && ((2 * x) - 1) % 7 == 4) {
            printf("%d\n", x);
        }
    }
    return 0;
}
