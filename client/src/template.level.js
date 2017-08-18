
const RG = require('./rg');
RG.Random = require('./random');

RG.Template = require('./template');

const baseTemplates = [

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
dir:SE
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

const TILE_UNUSED = 'TILE_UNUSED';

RG.Template.Level = function(tilesX, tilesY) {
    this.tilesX = tilesX;
    this.tilesY = tilesY;
    this.genParams = [1, 1, 1, 1];

    this.genParamMin = 1;
    this.genParamMax = 1;

    this.templates = baseTemplates.map(t => RG.Template.createTemplate(t));

    this.sortedByExit = {
        N: [], S: [], E: [], W: []
    };
    // Sort data into 4 lists with N, S, E, W exists
    this.templates.forEach(templ => {
        const dir = templ.getProp('dir');
        if (/N/.test(dir)) {this.sortedByExit.N.push(templ);}
        if (/S/.test(dir)) {this.sortedByExit.S.push(templ);}
        if (/E/.test(dir)) {this.sortedByExit.E.push(templ);}
        if (/W/.test(dir)) {this.sortedByExit.W.push(templ);}
    });

    // Initialize an empty map
    this.templMap = [];
    for (let x = 0; x < this.tilesX; x++) {
        this.templMap[x] = [];
        for (let y = 0; y < this.tilesY; y++) {
            this.templMap[x][y] = TILE_UNUSED;
        }
    }

    this.setGenParams = function(arr) {
        this.genParams = arr;
    };

    /* Creates the level. Result is in this.map. */
    this.create = function() {

        let dungeonInvalid = true;
        while (dungeonInvalid) {
            this._placeStartRoom();

            let roomCount = 0;
            const goalCount = 40;
            let numTries = 0;
            let hasExits = true;

            while (numTries < 1000 && hasExits) {

                // Get a room with unused exists
                const room = this._getRoomWithUnusedExits();
                if (room === null) {
                    hasExits = false;
                    break;
                }

                const {x, y} = room;

                const exits = this._getFreeExits(room);

                // Pick one exit randomly
                const chosen = RG.RAND.arrayGetRand(exits);

                // Get required matching exit
                const exitRequired = this._getRequiredExit(chosen);

                // Get a new room matching this exit
                const listMatching = this.sortedByExit[exitRequired];
                const roomMatching = RG.RAND.arrayGetRand(listMatching);

                // Make sure the new room is valid
                const newX = this._getNewX(x, exitRequired);
                const newY = this._getNewY(y, exitRequired);
                if (this._isRoomLegal(newX, newY)) {
                    this._placeRoom(newX, newY, roomMatching);
                    ++roomCount;
                }

                // Place the new room and incr roomCount
                ++numTries;
            }

            if (roomCount >= goalCount) {
                dungeonInvalid = false;
            }
            else {
                this._cleanupAndTryAgain();
            }

        }

        // Assign a random template for each tile
        // TODO make this more organic and based on the directions, such that
        // all rooms are well connected
        for (let x = 0; x < this.tilesX; x++) {
            for (let y = 0; y < this.tilesY; y++) {
                this.templMap[x][y] = this.getRandomTemplate();
                console.log(`${x},${y}: ` +
                    `${JSON.stringify(this.templMap[x][y])}`);
            }
        }

        // Create gen params for each tile
        this.genParamsX = [];
        this.genParamsY = [];
        for (let x = 0; x < this.tilesX; x++) {
            const paramsX = [1, 1];
            this.genParamsX.push(paramsX);
        }
        for (let y = 0; y < this.tilesY; y++) {
            const paramsY = [2, 2];
            this.genParamsY.push(paramsY);
        }

        this.mapExpanded = [];
        for (let x = 0; x < this.tilesX; x++) {
            this.mapExpanded[x] = [];
            for (let y = 0; y < this.tilesY; y++) {
                const params = this.genParamsX[x].concat(this.genParamsY[y]);
                this.mapExpanded[x][y] = this.templMap[x][y].getChars(params);
                console.log(`${x},${y}: ` +
                    `${JSON.stringify(this.mapExpanded[x][y])}`);
            }
        }

        this.map = [];
        // let xOffset = 0;
        // Now we have an unflattened map: 4-dimensional arrays
        for (let tileX = 0; tileX < this.tilesX; tileX++) {
            const numCols = this.mapExpanded[tileX][0].length;
            console.log(`tileX: ${tileX} numCols: ${numCols}`);
            for (let i = 0; i < numCols; i++) {
                let finalCol = [];
                for (let tileY = 0; tileY < this.tilesY; tileY++) {
                    const tileCol = this.mapExpanded[tileX][tileY][i];
                    finalCol = finalCol.concat(tileCol);
                }
                this.map.push(finalCol);
            }
            // xOffset += numCols;
        }

    };

    this._getRoomWithUnusedExits = function() {
        if (this._unusedExits.length > 0) {
            return RG.RAND.arrayGetRand(this._unusedExits);
        }
        return null;
    };

    this.getFreeExits = function(room) {
        const {x, y} = room;
        const key = x + ',' + y;
        return this.freeExits[key];
    };

    this._isRoomLegal = function(x, y) {
        if (x < this.tilesX && y < this.tilesY) {
            return true;
        }
        return false;
    };

    this._placeRoom = function(x, y, templ) {
        // Remove from unused exits
        // Add to unused exits
        // Add to templMap
    };

    this._getRequiredExit = function(chosen) {
        switch (chosen) {
            case 'N': return 'S';
            case 'S': return 'N';
            case 'E': return 'W';
            case 'W': return 'E';
            default: return 'N';
        }
    };

    this._getNewX = function(x, dir) {
        if (dir === 'E') {return x - 1;}
        if (dir === 'W') {return x + 1;}
        return x;

    };

    this._getNewY = function(y, dir) {
        if (dir === 'N') {return y - 1;}
        if (dir === 'S') {return y + 1;}
        return y;
    };

    this._placeStartRoom = function() {
        const x = RG.RAND.getUniformInt(0, this.tilesX - 1);
        const y = RG.RAND.getUniformInt(0, this.tilesY - 1);
        this.templMap[x][y] = this.getRandomTemplate();
        this._unusedExits.push({x, y, room: this.templMap[x][y]});

        const exits = this._getExits(room);
        const key = x + ',' + y;
        this.freeExits[key] = exits;

    };

    this.getRandomTemplate = function() {
        // TODO at some point, we need to check how the entrances in rooms match
        return RG.RAND.arrayGetRand(this.templates);
    };

    this._getExits = function(room) {
        return room.room.getProp('dir').split('');
    };

};


module.exports = RG.Template.Level;
