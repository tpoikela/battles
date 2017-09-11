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

my $nyc_bak = ".nyc_output_bak";
mkdir($nyc_bak) unless -d $nyc_bak;

my $nyc = "node_modules/.bin/nyc";

print STDERR "Running coverage for unit tests.\n";
my $cmd = "$nyc mocha --compilers babel-core/register tests/client/src";
system($cmd);
system("cp .nyc_output/*.json $nyc_bak");

print STDERR "Running coverage for GUI unit tests.\n";
$cmd = "$nyc mocha --compilers babel-core/register tests/client/gui";
system($cmd);
system("cp .nyc_output/*.json $nyc_bak");

print STDERR "Running coverage for functional tests.\n";
$cmd = "$nyc mocha --compilers babel-core/register tests/client/functional";
system($cmd);

# Copy .json files back and do report
system("cp $nyc_bak/* .nyc_output");
system("$nyc report -r text -r lcov");

#print STDERR "Now producing the coverage report.\n";
#system("istanbul report --root coverage html");
#
system("$nyc check-coverage --lines 95 --functions 95 --branches 95");

# Cleans up the coverage reports
sub clean_cov {
    system("rm -rf coverage") if -d "coverage";
    system("rm -rf .nyc_output") if -d ".nyc_output";
    print STDERR "Cleaned up coverage.\n";
    exit 0;
}
