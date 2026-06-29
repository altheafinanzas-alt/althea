#!/usr/bin/perl
use strict;
use warnings;

# Reads the raw "[{...}, {...}, ...]" body from seed_array.txt
# and emits one normalized JSON object per line (JSONL) with all
# known fields present (defaulting missing ones).

my @fields = qw(id team comitente nombre apellido fecha asesor reasignacion perfil reunion obs sub_panel asesorOriginal derivado cOrdenes usuarioC);

open(my $fh, '<', $ARGV[0]) or die "cannot open $ARGV[0]: $!";
local $/;
my $text = <$fh>;
close $fh;

my @objects = $text =~ /\{[^{}]*\}/g;
print STDERR "Found " . scalar(@objects) . " objects\n";

open(my $out, '>', $ARGV[1]) or die "cannot open $ARGV[1]: $!";

for my $obj (@objects) {
    my %row;
    # string fields: "key": "value" (value may be empty, may contain escaped quotes)
    while ($obj =~ /"([a-zA-Z]+)":\s*"((?:[^"\\]|\\.)*)"/g) {
        $row{$1} = $2;
    }
    # boolean fields: "key": true|false
    while ($obj =~ /"([a-zA-Z]+)":\s*(true|false)/g) {
        $row{$1} = $2;
    }
    my @vals;
    for my $f (@fields) {
        if (!exists $row{$f}) {
            push @vals, ($f eq 'derivado') ? 'false' : '';
            next;
        }
        push @vals, $row{$f};
    }
    print $out join("\t", @vals), "\n";
}
close $out;
print STDERR "Wrote " . scalar(@objects) . " rows\n";
