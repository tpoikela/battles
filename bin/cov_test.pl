#!/usr/bin/env perl
#===============================================================================
#
#         FILE: cov_test.pl
#
#        USAGE: ./cov_test.pl
#
#  DESCRIPTION: For running unit tests with coverage.
#
#      OPTIONS: ---
# REQUIREMENTS: ---
#         BUGS: ---
#        NOTES: ---
#       AUTHOR: Tuomas Poikela (tpoikela), tuomas.sakari.poikela@gmail.com
# ORGANIZATION: ---
#      VERSION: 1.0
#      CREATED: 10/14/2016 09:53:15 PM
#     REVISION: ---
#===============================================================================

use strict;
use warnings;
use utf8;

use Getopt::Long;

my %opt;
GetOptions(
    clean => \$opt{clean},
);

clean_cov() if defined $opt{clean};

my $exclude = '-x "**/rot.js"';
my $source = "tests/client/**/*.spec.js";
my $serial_src = "tests/client/functional/*.js";
my $serial_mocha = "node_modules/serial-mocha/bin/cli.js";

print STDERR "Running coverage for unit tests.\n";
my $cmd = "";
$cmd = "istanbul cover $exclude node_modules/.bin/_mocha $source";
system($cmd);

# TODO does not work at the moment, reports only "no coverage collected"
#print STDERR "Running coverage for functional tests.\n";
#$cmd = "istanbul cover $exclude $serial_mocha $serial_src";
#system($cmd);

print STDERR "Now producing the coverage report.\n";
system("istanbul report --root coverage html");

sub clean_cov {
    system("rm -rf coverage") if -d "coverage";
    print STDERR "Cleaned up coverage.\n";
    exit 0;
}
