#!/usr/bin/env perl
#===============================================================================
#
#         FILE: run_test_until_failure.pl
#
#        USAGE: ./run_test_until_failure.pl
#
#   DESCRIPTION:
#
#      OPTIONS: ---
# REQUIREMENTS: ---
#         BUGS: ---
#        NOTES: ---
#       AUTHOR: Tuomas Poikela (tpoikela), tuomas.sakari.poikela@gmail.com
# ORGANIZATION: CERN
#      VERSION: 1.0
#      CREATED: 03/09/2018 02:09:09 PM
#     REVISION: ---
#===============================================================================

use strict;
use warnings;
use utf8;

my $max_iters = 100;
my $num_iters = 0;

print "Test log is redirected to run.log\n";

my $cmd = "npm run test";

my $err = system("$cmd >& run.log");

my $start_time = time();

while ($err == 0 and $max_iters-- > 0) {
    $err = system("$cmd >& run.log");
    ++$num_iters;
    print "Finished iteration $num_iters.\n";
}

if ($err != 0) {
    print "Tests failed with $num_iters iterations left.\n";
    print "Test log can be found from run.log\n";
}

my $end_time = time();
my $duration = $end_time - $start_time;
print "Tests took $duration seconds to run.\n";
