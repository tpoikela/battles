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
    "t|tests=s" => \$opt{tests}
);

my $comp_babel = "--compilers babel-core/register";

clean_cov() if defined $opt{clean};

my $nyc_bak = ".nyc_output_bak";
if (-d $nyc_bak) {
    system("rm -rf $nyc_bak");
}
mkdir($nyc_bak);

my $nyc = "node_modules/.bin/nyc";

my $cmd = "$nyc -n client/src mocha $comp_babel tests/client/src";
_cmd($cmd, "Running coverage for unit tests.");

$cmd = "$nyc -n client/gui mocha $comp_babel tests/client/gui";
_cmd($cmd,  "Running coverage for GUI unit tests.");

$cmd = "$nyc -n client/jsx -e .jsx mocha --require tests/helpers/browser.js $comp_babel tests/client/jsx/*.jsx";
_cmd($cmd,  "Running coverage for jsx component unit tests.");

$cmd = "$nyc -n client/src mocha $comp_babel tests/client/functional";
_cmd($cmd,  "Running coverage for functional tests.");

# Copy .json files back and do report
system("cp $nyc_bak/* .nyc_output");
system("$nyc report -r text -r lcov -r html");

system("$nyc check-coverage --lines 95 --functions 95 --branches 95");

# Cleans up the coverage reports
sub clean_cov {
    system("rm -rf coverage") if -d "coverage";
    system("rm -rf .nyc_output") if -d ".nyc_output";
    print STDERR "Cleaned up coverage.\n";
    exit 0;
}

sub _cmd {
    my ($cmd, $msg) = @_;
    my $execute = $cmd =~ qr/$opt{tests}/ or $opt{tests} =~ /all/;
    if ($execute) {
        print STDERR "TESTS: $msg\n";
        system($cmd);
        system("cp .nyc_output/*.json $nyc_bak");
    }
}

