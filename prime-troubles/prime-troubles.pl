#!/usr/bin/env perl
use strict;
use warnings;
use POSIX qw(_exit);

sub is_prime {
    my ($n) = @_;
    return 0 if $n < 2;
    return 1 if $n < 4;
    return 0 if $n % 2 == 0 || $n % 3 == 0;
    for (my $i = 5; $i * $i <= $n; $i += 6) {
        return 0 if $n % $i == 0 || $n % ($i + 2) == 0;
    }
    return 1;
}

print "Primes 0-101 where ((2*x)-1) % 7 = 4:\n\n";

# Pipe for children to report results back to parent
pipe(my $reader, my $writer) or die "pipe: $!";

my @pids;

for my $x (0 .. 101) {
    my $pid = fork();
    die "fork failed: $!" unless defined $pid;

    if ($pid == 0) {
        # Child process
        close $reader;
        if (is_prime($x) && ((2 * $x) - 1) % 7 == 4) {
            print $writer "$x\n";
        }
        close $writer;
        _exit(0);
    }

    push @pids, $pid;
}

close $writer;

# Collect results from children
my @results;
while (my $line = <$reader>) {
    chomp $line;
    push @results, $line;
}
close $reader;

# Wait for all children
waitpid($_, 0) for @pids;

# Sort and print
for my $val (sort { $a <=> $b } @results) {
    print "$val\n";
}
