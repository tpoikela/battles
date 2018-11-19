#!/usr/bin/env perl 
#===============================================================================
#
#         FILE: working-ts-tests.pl
#
#        USAGE: ./working-ts-tests.pl  
#
#  DESCRIPTION: 
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

my @files = qw(
tests/client/src/abilities.spec.ts
tests/client/src/animation.spec.ts
tests/client/src/actor.spec.ts
tests/client/src/actor.spirit.spec.ts
tests/client/src/brain.communication.spec.ts
tests/client/src/brain.memory.spec.ts
tests/client/src/dice.spec.ts
tests/client/src/entity.spec.ts
tests/client/src/game-object.spec.ts
tests/client/src/geometry.spec.ts
tests/client/src/map.generator.spec.ts
tests/client/src/map.spec.ts
tests/client/src/path.spec.ts
tests/client/src/random.spec.ts
tests/client/src/rg.eventpool.spec.ts
tests/client/src/rg.spec.ts
tests/client/src/template.spec.ts
tests/client/src/template.level.ts
tests/client/src/territory.spec.ts
tests/lib/bsp.spec.ts
);

@files = glob("tests/client/src/*.ts");

my $num_failed = 0;
my @failed = ();

foreach my $file (@files) {
    my $val = system ("mocha -r ts-node/register $file");
    if ($val != 0) {
        ++$num_failed;
        push(@failed, $file);
        # die("Tests in file $file failed");
        print "Tests in file $file failed\n";
    }
}

if ($num_failed > 0) {
    my $failed_tests = join("\n", @failed);
    die "There were $num_failed failed tests. $failed_tests\n";
}
