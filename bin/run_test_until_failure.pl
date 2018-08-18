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
# ORGANIZATION: -
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
my $logfile = "run.log";

add_header($logfile, "### First test run ###");
my $err = system("$cmd >& $logfile");
my $start_time = time();
my $num_runs = 2;

while ($err == 0 and $max_iters-- > 0) {
    add_header($logfile, "### Run $num_runs ### {{{");
    $err = system("$cmd >& $logfile");
    ++$num_iters;
    print "Finished iteration $num_iters.\n";
    add_header($logfile, "}}} ### FINISHED RUN $num_runs");
    ++$num_runs;
}

if ($err != 0) {
    print "Tests failed with $num_iters iterations left.\n";
    print "Test log can be found from $logfile\n";
}

my $end_time = time();
my $duration = $end_time - $start_time;
print "Tests took $duration seconds to run.\n";

sub add_header {
    my ($fname, $text) = @_;
    open (my $OFILE, ">>", $fname) or die $!;
    print $OFILE $text . "\n";;
    close $OFILE;
}
