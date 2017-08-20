/* Contains ASCII tiles used for the crypt level generation. */

const Crypt = {};

Crypt.filler = `
name:FILLER
X=#
Y=#

#X###X#
Y######
#######
#######
#######
Y######
#######`;

Crypt.tiles = [

// Filler

// Omni-directionals
`
dir:NSEW
name:omni
X=#
Y=#

#X#.#X#
Y.....#
#.....#
...#...
#.....#
Y.....#
###.###`,

`
dir:NSEW
name:omni
X=#
Y=#

#X#.#X#
Y.....#
#.#.#.#
...#...
#.#.#.#
Y.....#
###.###`,
`
dir:NSEW
name:omni
X=#
Y=#

#.X.X.#
Y.....#
#..#..#
..###..
#..#..#
Y.....#
###.###`,

`
name:omni
dir:NSEW
X=#
Y=#

#X...X#
.......
Y..#..#
..###..
Y..#..#
.......
##...##`,

`
name:omni
dir:NSEW
X=.
Y=.

..X.X..
.##.##.
Y#...#.
...#...
Y#...#.
.##.##.
.......`,

`
name:omni
dir:NSEW
X=.
Y=.

#.X.X.#
###.###
Y#...#.
...#...
Y#...#.
###.###
#.....#`,

`
name:omni
dir:NSEW
X=.
Y=.

..X.X..
.##.##.
Y##.##.
.......
Y##.##.
.##.##.
.......`,

`
dir:NSEW
name:omni
X=.
Y=.

..X.X..
.##.##.
Y#...#.
.#...#.
Y#...#.
.##.##.
.......`,

// Terminals (one exit only)
`
dir:N
name:term
X=#
Y=#

#X#.#X#
#.....#
Y.#.#.#
###.###
Y.....#
#.....#
#######`,

`
dir:N
name:term
X=#
Y=#

#X#.#X#
#.....#
Y.#.#.#
###.###
Y##.###
##...##
#######`,

`
dir:S
name:term
X=#
Y=#

#X###X#
#.....#
Y.#.#.#
###.###
Y.#.#.#
#.....#
##...##`,

`
dir:S
name:term
X=#
Y=#

#X###X#
#######
Y######
###.###
Y.....#
#.....#
##...##`,

`
dir:W
name:term
X=#
Y=#

#X###X#
#.....#
Y.#.#.#
...####
Y.#.#.#
#.....#
#######`,

`
dir:W
name:term
X=#
Y=#

#X###X#
#.#...#
Y.#.###
..#...#
Y.###.#
#.....#
#######`,

`
dir:E
name:term
X=#
Y=#

#X###X#
#.....#
Y..#..#
#..#...
Y.###.#
#.....#
#######`,

`
dir:E
name:term
X=#
Y=#

#X###X#
#.....#
Y...###
#...#..
Y.###.#
#.....#
#######`,

// Corridors (2 exits on opposite sides)
`
dir:NS
name:corridor
X=#
Y=#

#X...X#
##...##
Y#...##
##...##
Y#...##
##...##
##...##`,

`
dir:NS
name:corridor
X=#
Y=#

#X...X#
#.....#
Y#...##
#.....#
Y#...##
#.....#
##...##`,


`
dir:EW
name:corridor
X=#
Y=#

#X###X#
#######
Y......
.......
Y......
#######
#######`,

`
dir:EW
name:corridor
X=#
Y=#

#X###X#
#.#.#.#
Y.....#
.......
Y.....#
#.#.#.#
#######`,

// Corners
`
dir:NW
name:corner
X=#
Y=#

#X...X#
###.###
Y....##
.....##
Y....##
#######
#######`,

`
dir:NW
name:corner
X=#
Y=#

#X#.#X#
#.....#
Y.....#
......#
Y.###.#
#.....#
#######`,

`
dir:NE
name:corner
X=.
Y=#

#X...X#
###.###
Y#...#.
##.....
Y#...#.
#######
#######`,

`
dir:NE
name:corner
X=#
Y=#

#X#.#X#
#.....#
Y.###.#
#......
Y.....#
#.....#
#######`,

`
dir:SE
name:corner
X=#
Y=#

#X###X#
###.###
Y#...#.
##.....
Y#...#.
###.###
###.###`,

`
dir:SE
name:corner
X=#
Y=#

#X###X#
#.#.#.#
Y#...##
#......
Y#...##
#.#.#.#
###.###`,

`
dir:SW
name:corner
X=#
Y=.

#X###X#
###.###
Y#...##
......#
Y#...##
###.###
###.###`,

// The rest
`
dir:SEW
name:threeway
X=#
Y=.

#X###X#
###.###
Y#...#.
.......
Y#...#.
###.###
###.###`,

`
dir:SEW
name:threeway
X=#
Y=#

#X###X#
#.....#
Y.#.#.#
..#.#..
Y##.###
#.....#
#.....#`,

`
dir:NEW
name:threeway
X=#
Y=.

#X...X#
###.###
Y#...#.
.......
Y#...#.
#######
#######`,


`
dir:NSW
name:threeway
X=#
Y=#

#X...X#
###.###
Y#...##
......#
Y#...##
###.###
###.###`,

`
dir:NSE
name:threeway
X=#
Y=#

#X...X#
###.###
Y#...##
##.....
Y#...##
###.###
###.###`
];

module.exports = Crypt;
