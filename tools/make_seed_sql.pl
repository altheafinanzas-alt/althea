#!/usr/bin/perl
use strict;
use warnings;

# Reads clients.tsv (fields: id team comitente nombre apellido fecha asesor
# reasignacion perfil reunion obs sub_panel asesorOriginal derivado cOrdenes usuarioC)
# and writes a single INSERT statement with all rows as a seed.sql file.

my @cols = qw(comitente nombre apellido fecha asesor team reasignacion perfil reunion obs sub_panel asesor_original derivado c_ordenes usuario_c);

sub sql_str {
    my ($v) = @_;
    return 'null' if !defined($v) || $v eq '';
    $v =~ s/'/''/g;
    return "'$v'";
}

sub sql_date {
    my ($v) = @_;
    return 'null' if !defined($v) || $v eq '';
    $v =~ s/'/''/g;
    return "'$v'";
}

sub sql_bool {
    my ($v) = @_;
    return ($v eq 'true') ? 'true' : 'false';
}

open(my $in, '<', $ARGV[0]) or die $!;
open(my $out, '>', $ARGV[1]) or die $!;

print $out "-- Seed de clientes migrados desde althea_crm_clientes_v12_6.html\n";
print $out "-- Ejecutar DESPUES de schema.sql\n\n";
print $out "insert into public.clientes (comitente, nombre, apellido, fecha, asesor, team, reasignacion, perfil, reunion, obs, sub_panel, asesor_original, derivado, c_ordenes, usuario_c) values\n";

my @lines;
while (my $line = <$in>) {
    chomp $line;
    my @f = split(/\t/, $line, -1);
    my ($id, $team, $comitente, $nombre, $apellido, $fecha, $asesor, $reasignacion, $perfil, $reunion, $obs, $sub_panel, $asesorOriginal, $derivado, $cOrdenes, $usuarioC) = @f;

    my @vals = (
        sql_str($comitente),
        sql_str($nombre),
        sql_str($apellido),
        sql_date($fecha),
        sql_str($asesor),
        sql_str($team),
        sql_str($reasignacion),
        sql_str($perfil),
        sql_str($reunion),
        sql_str($obs),
        sql_str($sub_panel),
        sql_str($asesorOriginal),
        sql_bool($derivado),
        sql_str($cOrdenes),
        sql_str($usuarioC),
    );
    push @lines, "  (" . join(", ", @vals) . ")";
}
close $in;

print $out join(",\n", @lines), ";\n";
close $out;
print STDERR "Wrote " . scalar(@lines) . " insert rows\n";
