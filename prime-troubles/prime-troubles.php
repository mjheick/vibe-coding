<?php

function isPrime(int $n): bool {
    if ($n < 2) return false;
    if ($n < 4) return true;
    if ($n % 2 === 0 || $n % 3 === 0) return false;
    for ($i = 5; $i * $i <= $n; $i += 6) {
        if ($n % $i === 0 || $n % ($i + 2) === 0) return false;
    }
    return true;
}

echo "Primes between 0 and 101 where ((2 * x) - 1) % 7 = 4:\n\n";

for ($x = 0; $x <= 101; $x++) {
    if (isPrime($x) && ((2 * $x) - 1) % 7 === 4) {
        echo $x . "\n";
    }
}
