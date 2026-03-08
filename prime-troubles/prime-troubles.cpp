#include <iostream>
#include <vector>
#include <algorithm>

constexpr bool is_prime(int n) {
    if (n < 2) return false;
    if (n < 4) return true;
    if (n % 2 == 0 || n % 3 == 0) return false;
    for (int i = 5; i * i <= n; i += 6) {
        if (n % i == 0 || n % (i + 2) == 0) return false;
    }
    return true;
}

int main() {
    std::cout << "Primes between 0 and 101 where ((2 * x) - 1) % 7 = 4:\n\n";

    std::vector<int> results;
    for (int x = 0; x <= 101; ++x) {
        if (is_prime(x) && ((2 * x) - 1) % 7 == 4) {
            results.push_back(x);
        }
    }

    for (auto val : results) {
        std::cout << val << "\n";
    }

    return 0;
}
