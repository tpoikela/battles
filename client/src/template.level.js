
const RG = require('./rg');
RG.Random = require('./random');

RG.Template = require('./template');

const Crypt = require('../data/tiles.crypt');

const baseTemplates = Crypt.tiles;
const fillerTempl = Crypt.filler;


/*
const fillerFloor = `
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
*/


RG.Template.Level = function(tilesX, tilesY) {
    this.tilesX = tilesX;
    this.tilesY = tilesY;
    this.genParams = [1, 1, 1, 1];

    this.genParamMin = 1;
    this.genParamMax = 1;

    this.filler = RG.Template.createTemplate(fillerTempl);
    this.templates = baseTemplates.map(t => RG.Template.createTemplate(t));
    this._unusedExits = [];
    this.freeExits = {};

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

    // Initialize a map with filler cells
    this.templMap = [];
    for (let x = 0; x < this.tilesX; x++) {
        this.templMap[x] = [];
        for (let y = 0; y < this.tilesY; y++) {
            this.templMap[x][y] = this.filler;
        }
    }

    this.setGenParams = function(arr) {
        this.genParams = arr;
    };

    /* Creates the level. Result is in this.map.
    * Main function you want to call. */
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

                console.log(`Current room in ${x},${y}`);

                const exits = this._getFreeExits(room);

                // Pick one exit randomly
                const chosen = RG.RAND.arrayGetRand(exits);

                // Get required matching exit
                const exitRequired = this.getMatchingExit(chosen);

                // Get a new room matching this exit
                const listMatching = this.sortedByExit[exitRequired];
                const templMatch = RG.RAND.arrayGetRand(listMatching);

                // Make sure the new room is valid
                const newX = this._getNewX(x, exitRequired);
                const newY = this._getNewY(y, exitRequired);
                if (this._isRoomLegal(newX, newY)) {
                    this._placeRoom(
                        x, y, chosen, newX, newY, exitRequired, templMatch);
                    ++roomCount;
                    console.log('Room count incremented to ' + roomCount);
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
                // console.log(`${x},${y}: ` +
                    // `${JSON.stringify(this.mapExpanded[x][y])}`);
                this.mapExpanded[x][y] = this.templMap[x][y].getChars(params);
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

    //----------------------------------------------------------------
    // PRIVATE
    //----------------------------------------------------------------

    this._getRoomWithUnusedExits = function() {
        if (this._unusedExits.length > 0) {
            return RG.RAND.arrayGetRand(this._unusedExits);
        }
        return null;
    };

    this._getFreeExits = function(room) {
        const {x, y} = room;
        const key = x + ',' + y;
        if (this.freeExits[key]) {
            return this.freeExits[key];
        }
        else {
            RG.err('Template', '_getFreeExits',
                `No ${key}, Room: ${JSON.stringify(room)}`);
        }
        return null;
    };

    this._removeChosenExit = function(x, y, chosen) {
        const key = x + ',' + y;
        const exits = this.freeExits[key];
        console.log(JSON.stringify(this.freeExits));
        console.log(`${x},${y} removeChosenExit ${chosen}`);
        console.log(`\tnExits: ${exits.length}`);
        const index = exits.indexOf(chosen);
        if (index >= 0) {
            this.freeExits[key].splice(index, 1);
            if (this.freeExits[key].length === 0) {
                const unusedIndex = this._unusedExits.findIndex(room => {
                    return room.x === x && room.y === y;
                });
                if (unusedIndex >= 0) {
                    this._unusedExits.splice(unusedIndex, 1);
                    delete this.freeExits[key];
                    console.log(`\t${x},${y} has no unused exits anymore.`);
                }
                else {
                    RG.err('Template', '_removeChosenExit',
                        `Cannot find ${x},${y} in unusedExits to remove.`);
                }
            }
            console.log('\tAfter remove: '
                + JSON.stringify(this.freeExits[key]));
        }
        else {
            RG.err('Template', '_removeChosenExit',
                `${x},${y} dir: ${chosen} not found.`);
        }
    };

    this._isRoomLegal = function(x, y) {
        if (x < this.tilesX && y < this.tilesY) {
            return true;
        }
        return false;
    };

    this._placeStartRoom = function() {
        const x = RG.RAND.getUniformInt(0, this.tilesX - 1);
        const y = RG.RAND.getUniformInt(0, this.tilesY - 1);
        this.templMap[x][y] = this.getRandomTemplate();
        const room = {x, y, room: this.templMap[x][y]};

        this._addRoomData(room);

        this._removeBorderExits(room);

    };

    this._placeRoom = function(
        x, y, chosen, newX, newY, exitRequired, templMatch
    ) {
        // Remove chosen exit (old room) from unused exits
        this._removeChosenExit(x, y, chosen);

        // Add new room data to unused exits
        const room = {x: newX, y: newY, room: templMatch};
        this._addRoomData(room);

        // But remove chosen exit
        this._removeChosenExit(newX, newY, exitRequired);

        // Check for abutting rooms on other edges and remove any exits
        this._checkAbuttingRooms(room);

        this._removeBorderExits(room);

        // Finally add new room to templMap
        this.templMap[newX][newY] = templMatch;

    };

    this._addRoomData = function(room) {
        this._unusedExits.push(room);
        const exits = room.room.getProp('dir').split('');
        const key = room.x + ',' + room.y;
        this.freeExits[key] = exits;
        console.log('>>> Added room ' + JSON.stringify(room));
    };

    this.getMatchingExit = function(chosen) {
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
        if (dir === 'N') {return y + 1;}
        if (dir === 'S') {return y - 1;}
        return y;
    };


    this.getRandomTemplate = function() {
        // TODO at some point, we need to check how the entrances in rooms match
        return RG.RAND.arrayGetRand(this.templates);
    };

    /* Removes exits from tiles which are placed in any borders of the map. */
    this._removeBorderExits = function(room) {
        const {x, y} = room;
        if (x === 0) {
            if (this._hasExit('W', x, y)) {
                this._removeChosenExit(x, y, 'W');
            }
        }

        if (x === this.tilesX - 1) {
            if (this._hasExit('E', x, y)) {
                this._removeChosenExit(x, y, 'E');
            }
        }

        if (y === 0) {
            if (this._hasExit('N', x, y)) {
                this._removeChosenExit(x, y, 'N');
            }
        }


        if (y === this.tilesY - 1) {
            if (this._hasExit('S', x, y)) {
                this._removeChosenExit(x, y, 'S');
            }
        }

    };

    /* Checks for rooms already in place around the placed room, and removes all
     * matching exists. */
    this._checkAbuttingRooms = function(room) {
        const {x, y} = room;

        console.log(`CheckAbut ${x},${y}`);
        if (x > 0) {
            const nx = x - 1;
            if (!this._isFiller(nx, y)) {
                this._removeExitByXY('W', x, y);
                this._removeExitByXY('E', nx, y);
            }
        }

        if (x < this.tilesX - 1) {
            const nx = x + 1;
            if (!this._isFiller(nx, y)) {
                this._removeExitByXY('E', x, y);
                this._removeExitByXY('W', nx, y);
            }
        }

        if (y > 0) {
            const ny = y - 1;
            if (!this._isFiller(x, ny)) {
                this._removeExitByXY('N', x, y);
                this._removeExitByXY('S', x, ny);
            }
        }

        if (y < this.tilesY - 1) {
            const ny = y + 1;
            if (!this._isFiller(x, ny)) {
                this._removeExitByXY('S', x, y);
                this._removeExitByXY('N', x, ny);
            }
        }

    };

    this._isFiller = function(x, y) {
        console.log(`isFiller x,y ${x},${y}`);
        return this.templMap[x][y].getProp('name') === 'FILLER';
    };

    this._removeExitByXY = function(dir, x, y) {
        if (this._hasExit(dir, x, y)) {
            this._removeChosenExit(x, y, dir);
        }
    };

    this._hasExit = function(dir, x, y) {
        const key = x + ',' + y;
        if (this.freeExits[key]) {
            return this.freeExits[key].indexOf(dir) >= 0;
        }
        return false;
    };

    this._cleanupAndTryAgain = function() {
        // Initialize a map with filler cells
        this.templMap = [];
        for (let x = 0; x < this.tilesX; x++) {
            this.templMap[x] = [];
            for (let y = 0; y < this.tilesY; y++) {
                this.templMap[x][y] = this.filler;
            }
        }
        this.freeExits = {};
        this._unusedExits = [];
        // this.create();
    };

};


module.exports = RG.Template.Level;
