#!/usr/bin/env perl 
#===============================================================================
#
#         FILE: debug-sim-perf-test.pl
#
#        USAGE: ./debug-sim-perf-test.pl  
#
#  DESCRIPTION: 
#
#      OPTIONS: ---
# REQUIREMENTS: ---
#         BUGS: ---
#        NOTES: ---
#       AUTHOR: Tuomas Poikela (tpoikela), tuomas.sakari.poikela@gmail.com
# ORGANIZATION: CERN
#      VERSION: 1.0
#      CREATED: 09/13/2018 11:22:26 PM
#     REVISION: ---
#===============================================================================

use strict;
use warnings;
use utf8;

my $cmd = "node scripts/debug-game-sim.js"; 
my $args = "--race goblin --class Marksman --name Oliver --maxturns 1000 --save_period 2000 --nosave --seed 123456";
my $logfile = "debug-sim-perf-test-run.log";
my $nRounds = 20;

$cmd .= " $args";

my $time_start = time();

if (-e $logfile) {
    print "Deleting existing logfile $logfile.\n";
    system("rm $logfile");
}

for (my $i = 0; $i < $nRounds; ++$i) {
    my $n = $i + 1;
    print "Simulating round $n now.\n";
    system("$cmd >> $logfile");
    print "Round $n / $nRounds completed.\n";
}

my $time_end = time();
my $dur = $time_end - $time_start;
print "Simulations took $dur sec to run.\n";
