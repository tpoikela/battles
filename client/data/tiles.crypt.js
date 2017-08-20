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
name:BaseTemplate1
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
name:BaseTemplate1
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
name:BaseTemplate2
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
name:BaseTemplate3
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
name:BaseTemplate4
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
name:BaseTemplate4
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
name:BaseTemplate4
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

// Terminals (one exit only)
`
dir:N
name:BaseTemplate5
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
name:BaseTemplate5
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
name:BaseTemplate5
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
name:BaseTemplate5
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
name:BaseTemplate5
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
name:BaseTemplate5
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
name:BaseTemplate5
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
name:BaseTemplate5
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
name:BaseTemplate6
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
name:BaseTemplate7
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
name:BaseTemplate8
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
name:BaseTemplate8
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
name:BaseTemplate8
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
dir:NE
name:BaseTemplate8
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
dir:SE
name:BaseTemplate8
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
dir:SW
name:BaseTemplate8
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
name:BaseTemplate8
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
dir:NEW
name:BaseTemplate8
X=#
Y=.

#X...X#
###.###
Y#...#.
.......
Y#...#.
#######
#######`

];

module.exports = Crypt;
