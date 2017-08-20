
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
name:corner_se
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
name:corner_sw
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
name:corner_ne
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
name:corner_nw
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

Castle.getStartRoom = function() {
    const templ = this.findTemplate({name: 'corner_nw'});
    return {
        x: 0, y: 0, room: templ
    };
};

/* Constraint function how to generate the castle level. */
Castle.constraintFunc = function(x, y, exitReqd) {
    if (x === 0 && y === 0) {
        return this.findTemplate({name: 'corner_nw'});
    }
    if (x === 0 && y === this.tilesY - 1) {
        return this.findTemplate({name: 'corner_sw'});
    }
    if (x === this.tilesX - 1 && y === 0) {
        return this.findTemplate({name: 'corner_ne'});
    }
    if (x === this.tilesX - 1 && y === this.tilesY - 1) {
        return this.findTemplate({name: 'corner_se'});
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
