#!/usr/bin/env perl 
#===============================================================================
#
#         FILE: working-ts-tests.pl
#
#        USAGE: ./working-ts-tests.pl  
#
#  DESCRIPTION: Used for running unit tests. Many tests fail when executed
#  in one batch with mocha, so at the moment they are run using this.
#
#      OPTIONS: ---
# REQUIREMENTS: ---
#         BUGS: ---
#        NOTES: ---
#       AUTHOR: Tuomas Poikela (tpoikela), tuomas.sakari.poikela@gmail.com
# ORGANIZATION: ---
#      VERSION: 1.0
#      CREATED: 11/09/2018 12:23:59 PM
#     REVISION: ---
#===============================================================================

use strict;
use warnings;
use utf8;

my @files = glob("tests/client/src/*.ts");

my $num_failed = 0;
my $num_ok = 0;
my @failed = ();

foreach my $file (@files) {
    my $val = system ("mocha -r ts-node/register $file");
    if ($val != 0) {
        ++$num_failed;
        push(@failed, $file);
        # die("Tests in file $file failed");
        print "Tests in file $file failed\n";
    }
    else {
        ++$num_ok;
    }
}

print "$num_ok test files PASSED.\n";
if ($num_failed > 0) {
    my $failed_tests = join("\n", @failed);
    die "There were $num_failed failed tests. $failed_tests\n";
}
