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
# ORGANIZATION: CERN
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
    <+opt2+> => \$opt{<+val2+>},
);

clean_cov() if defined $opt{clean};

# Instrument the src code with istanbul
my $cmd = "istanbul instrument --output lib-cov --no-compact --variable global.__coverage__ src";
system($cmd);

$cmd = "istanbul instrument --output lib-cov/battles.js --no-compact --variable global.__coverage__ battles.js";
system($cmd);

$cmd = "perl -p -i -e 's{\./src/}{./lib-cov/}g' lib-cov/*.js";
system($cmd);

if (not -d "tests-cov") {
    mkdir("tests-cov") or die("Couldn't create tests-cov for tests.");
}

$cmd = "cp tests/* tests-cov";
system($cmd);
$cmd = "perl -p -i -e 's{\../src/}{../lib-cov/}g' tests-cov/*.js";
system($cmd);
$cmd = "perl -p -i -e 's{\../battles\.js}{../lib-cov/battles.js}g' tests-cov/*.js";

# Finally run the tests with coverage
$cmd = "mocha --reporter mocha-istanbul tests-cov";
system($cmd);

sub clean_cov {
    system("rm -rf lib-cov") if -d "lib-cov";
    system("rm -rf tests-cov") if -d "tests-cov";
}
