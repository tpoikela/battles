
const Castle = {};

Castle.filler = `
name:FILLER
X=.
Y=.

.X...X.
Y......
.......
.......
.......
Y......
.......`;

Castle.templates = [

// Terminals

// Corridors

// Corners
`
dir:NW
name:cornerse
X=.
Y=#

#X...X#
#.....#
Y.....#
......#
Y.....#
......#
#######`,

`
dir:NE
name:cornersw
X=.
Y=#

#X...X#
#......
Y......
#......
Y......
#......
#######`,

`
dir:SW
name:cornerne
X=#
Y=.

#X###X#
Y.....#
......#
......#
......#
Y.....#
#.....#`,

`
dir:SE
name:cornernw
X=#
Y=#

#X###X#
#......
Y......
#......
Y......
#......
#.....#`,

// Corridors
`
dir:NS
name:corridor_ns
X=.
Y=#

#X...X#
#.....#
Y.....#
#.....#
Y.....#
#.....#
#.....#`,

`
dir:EW
name:corridor_ew
X=#
Y=.

#X###X#
.......
Y......
.......
Y......
.......
#######`

];

/* Constraint function how to generate the castle level. */
Castle.constraintFunc = function(x, y, exitReqd) {
    if (x === 0 && y === 0) {
        return this.findTemplate({name: 'cornernw'});
    }
    if (x === 0 && y === this.tilesY - 1) {
        return this.findTemplate({name: 'cornersw'});
    }
    if (x === this.tilesX - 1 && y === 0) {
        return this.findTemplate({name: 'cornerne'});
    }
    if (x === this.tilesY - 1 && y === this.tilesY - 1) {
        return this.findTemplate({name: 'cornerse'});
    }

    if (y === 0 || y === this.tilesY - 1) {
        return this.findTemplate({name: 'corridors_ew'});
    }
    if (x === 0 || x === this.tilesX - 1) {
        return this.findTemplate({name: 'corridors_ns'});
    }
    return null;
};

module.exports = Castle;
