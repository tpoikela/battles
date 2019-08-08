
import {Template, verifyTiles} from '../src/template';

export const HousesDiag: any = {
    tiles: {},
    templates: {},
    Models: {}
};

HousesDiag.tiles.basic = [
`
dir:NSEW
name:test_diag
X=#
Y=#

#X..X#
Y....#
......
......
Y....#
##..##`,

`
dir:NSEW
name:test_diag_a
X=#
Y=#

#X..X#
Y....#
.#..#.
.#..#.
Y....#
##..##`,

`
dir:NSEW
name:test_diag2
X=#
Y=#

#X..X#
Y##..#
..#...
....#.
Y...##
##..##`,

`
dir:NEW
name:test_diag3
X=#
Y=#

#X..X#
Y....#
..##..
.####.
Y#####
######`,

`
dir:SW
name:test_diag4
X=#
Y=#

#X##X#
Y#####
..####
...###
Y...##
##..##`,

`
dir:NE
name:test_diag5
X=#
Y=#

#X..X#
Y##..#
####..
#####.
Y#####
######`,

`
dir:NE
name:test_diag5_b
X=#
Y=#

#X..X#
Y#...#
###...
####..
Y#...#
######`,

`
dir:NE
name:test_diag5_c
X=#
Y=#

#X..X#
Y#...#
#..#..
#.###.
Y...##
######`,

`
dir:NS
name:test_diag6
X=#
Y=#

#X..X#
Y....#
##..##
##..##
Y....#
##..##`,

`
dir:NS
name:test_diag6_b
X=#
Y=#

#X..X#
Y##..#
###..#
###..#
Y##..#
##..##`,

`
dir:NS
name:test_diag6_c
X=#
Y=#

#X..X#
Y.##.#
#.##.#
#.##.#
Y.##.#
##..##`,

`
dir:EW
name:test_diag7
X=#
Y=#

#X##X#
Y....#
..##..
..##..
Y....#
######`,

`
dir:EW
name:test_diag7
X=#
Y=#

#X##X#
Y....#
......
......
Y....#
######`,

];


HousesDiag.tiles.term = [
`
dir:S
name:term
X=#
Y=#

#X##X#
Y#..##
#....#
#....#
Y#..##
##..##`,

];

HousesDiag.tiles.filler =
`
name:FILLER
X=#
Y=#

#X##X#
Y#####
######
######
Y#####
######`
;

HousesDiag.Models.default = []
    .concat(HousesDiag.tiles.basic)
    .concat(HousesDiag.tiles.term);

HousesDiag.templates.all = HousesDiag.Models.default.map(tile => (
    Template.createTemplate(tile)
));
const transformed = Template.transformList(HousesDiag.templates.all);
HousesDiag.templates.all = HousesDiag.templates.all.concat(transformed);

verifyTiles('tiles.diag.ts', 'HouseDiag.templates.all',
    HousesDiag.templates.all);
