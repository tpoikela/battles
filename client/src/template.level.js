
const RG = require('./rg');
RG.Random = require('./random');
const debug = require('debug')('bitn:Template.Level');
RG.Template = require('./template');
const Crypt = require('../data/tiles.crypt');

const fillerTempl = Crypt.tiles.filler;

/* This object can be used to create levels from ASCII-based templates. Each
 * template should be abuttable in a reasonable way, and connections between
 * tiles
 * should be described properly. See files in '../data/tiles.*'.
 *
    // Original algorithm can be found from "Procedural Generation in
    // Game Design" chapter 7, by Jim Shepard.
    */
RG.Template.Level = function(tilesX, tilesY) {
    this.tilesX = tilesX;
    this.tilesY = tilesY;
    this.genParams = [1, 1, 1, 1];
    this.roomCount = 40;

    this.filler = RG.Template.createTemplate(fillerTempl);
    this.templates = [];

    this.genParamMin = 1;
    this.genParamMax = 1;

    this._unusedExits = [];
    this.freeExits = {};

    this.sortedByExit = {
        N: [], S: [], E: [], W: []
    };

    /* Sets the filler tile used to fill the map first. */
    this.setFiller = function(fillerTempl) {
        this.filler = RG.Template.createTemplate(fillerTempl);
    };

    /* Sets the room templates that are used. */
    this.setTemplates = function(asciiTiles) {
        this.templates = [];
        this.templates = asciiTiles.map(t => RG.Template.createTemplate(t));
    };

    this.addTemplate = function(asciiTile) {
      this.templates.push(RG.Template.createTemplate(asciiTile));
    };

    /* Sets the generator parameters for expansion. */
    this.setGenParams = function(arr) {
        this.genParams = arr;
    };

    /* Sets the target room count. -1 fills until no more well-connected
     * rooms are possible. */
    this.setRoomCount = function(count) {
        this.roomCount = count;
    };

    /* Sets the callback for constraint. This callback is called with
     * (x, y, exitReqd), and exposes this.sortedByExit.
     */
    this.setConstraintFunc = function(func) {
        this.constraintFunc = func.bind(this);
    };

    this.setStartRoomFunc = function(func) {
        this.startRoomFunc = func.bind(this);
    };

    /* Calls as many setters above as possible from given object. */
    this.use = function(obj) {
        const setterList = ['constraintFunc', 'startRoomFunc', 'roomCount'];
        setterList.forEach(p => {
            if (obj.hasOwnProperty(p)) {
                const setter = 'set' + p.capitalize();
                this[setter](obj[p]);
            }
        });

        if (obj.tiles.filler) {
            this.setFiller(obj.tiles.filler);
        }

        if (obj.Models.default) {
            this.setTemplates(obj.Models.default);
        }
    };

    /* Creates the level. Result is in this.map.
     * This is the Main function you want to call. */
    this.create = function() {

        if (this.templates.length === 0) {
            RG.err('Template.Level', 'create',
                'No templates. Use setTemplates() before create()');
        }

        // Sort data into 4 lists with N, S, E, W exits
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

        let dungeonInvalid = true;
        while (dungeonInvalid) {
            this._placeStartRoom();

            let roomCount = 0;
            const goalCount = this.roomCount;
            let numTries = 0;
            let hasExits = true;

            while (numTries < 1000 && hasExits) {

                // Get a room with unused exits
                const room = this._getRoomWithUnusedExits();
                if (room === null) {
                    hasExits = false;
                    break;
                }

                const {x, y} = room;

                debug(`Current room in ${x},${y}`);

                const exits = this._getFreeExits(room);

                // Pick one exit randomly
                const chosen = RG.RAND.arrayGetRand(exits);

                // Get required matching exit
                const exitReqd = this.getMatchingExit(chosen);
                const newX = this._getNewX(x, exitReqd);
                const newY = this._getNewY(y, exitReqd);

                // Get a new room matching this exit
                const templMatch = this._getNextTemplate(newX, newY, exitReqd);

                // Make sure the new room is valid
                if (this._isRoomLegal(newX, newY)) {
                    this._placeRoom(
                        x, y, chosen, newX, newY, exitReqd, templMatch);
                    ++roomCount;
                    debug('Room count incremented to ' + roomCount);
                }

                // Place the new room and incr roomCount
                ++numTries;

                if (goalCount !== -1 && roomCount >= goalCount) {
                    dungeonInvalid = false;
                    break;
                }
            }

            if (roomCount >= goalCount || goalCount === -1) {
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
            const paramsX = [this.genParams[0], this.genParams[1]];
            this.genParamsX.push(paramsX);
        }
        for (let y = 0; y < this.tilesY; y++) {
            const paramsY = [this.genParams[2], this.genParams[3]];
            this.genParamsY.push(paramsY);
        }

        // Expand the tiles with parameters
        this.mapExpanded = [];
        for (let x = 0; x < this.tilesX; x++) {
            this.mapExpanded[x] = [];
            for (let y = 0; y < this.tilesY; y++) {
                const params = this.genParamsX[x].concat(this.genParamsY[y]);
                this.mapExpanded[x][y] = this.templMap[x][y].getChars(params);
            }
        }

        // Now we have an unflattened map: 4-dimensional arrays, the last part
        // is to convert this into 2-d array.
        this.map = [];
        this.xyToBbox = {};
        let llx = 0;
        let urx = 0;
        for (let tileX = 0; tileX < this.tilesX; tileX++) {
            const numCols = this.mapExpanded[tileX][0].length;
            urx = llx + numCols - 1;

            for (let i = 0; i < numCols; i++) {
                let lly = 0;
                let ury = 0;
                let finalCol = [];
                for (let tileY = 0; tileY < this.tilesY; tileY++) {
                    const tileCol = this.mapExpanded[tileX][tileY][i];
                    const tileColLen = tileCol.length;
                    lly = ury + tileColLen - 1;
                    finalCol = finalCol.concat(tileCol);

                    this.xyToBbox[tileX + ',' + tileY] = {
                        name: this.templMap[tileX][tileY].getProp('name'),
                        type: this.templMap[tileX][tileY].getProp('type'),
                        llx, urx, ury, lly
                    };
                    ury += tileColLen;
                }
                this.map.push(finalCol);
            }
            llx += numCols;
        }
    };


    /* Finds a template based on prop name and val, and returns a random
     * template among the found templates. */
    this.findTemplate = function(query) {
        const result = [];
        Object.keys(query).forEach(key => {
            this.templates.forEach(t => {
                if (t.getProp(key) === query[key]) {
                    result.push(t);
                }
            });
        });
        if (result.length > 0) {
            return RG.RAND.arrayGetRand(result);
        }
        return null;
    };

    /* Removes the templates matching the given query. This is useful, if for
     * example after starting conditions you want to remove some cells. */
    this.removeTemplate = function(query) {
        const key = Object.keys(query)[0];
        const index = this.templates.findIndex(t => (
            t.getProp(key) === query[key]
        ));
        if (index >= 0) {
            this.templates.splice(index, 1);
        }
    };

    /* Adds a room (template) to fixed position. This can be called from user
     * callbacks. */
    this.addRoom = function(templ, x, y) {
        const room = {x, y, room: templ};
        this._addRoomData(room);
        this._checkAbuttingRooms(room);
        this._removeBorderExits(room);
        this.templMap[x][y] = templ;
    };


    //----------------------------------------------------------------
    // PRIVATE
    //----------------------------------------------------------------

    this._getNextTemplate = function(x, y, exitReqd) {
        let next = null;
        if (typeof this.constraintFunc === 'function') {
            next = this.constraintFunc(x, y, exitReqd);
        }

        if (!next) {
            const listMatching = this.sortedByExit[exitReqd];
            const templMatch = RG.RAND.arrayGetRand(listMatching);
            return templMatch;
        }

        return next;
    };

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
            RG.err('Template.Level', '_getFreeExits',
                `No ${key}, Room: ${JSON.stringify(room)}`);
        }
        return null;
    };

    this._removeChosenExit = function(x, y, chosen) {
        const key = x + ',' + y;
        const exits = this.freeExits[key];
        debug(JSON.stringify(this.freeExits));
        debug(`${x},${y} removeChosenExit ${chosen}`);
        debug(`\tnExits: ${exits.length}`);
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
                    debug(`\t${x},${y} has no unused exits anymore.`);
                }
                else {
                    RG.err('Template.Level', '_removeChosenExit',
                        `Cannot find ${x},${y} in unusedExits to remove.`);
                }
            }
            debug('\tAfter remove: '
                + JSON.stringify(this.freeExits[key]));
        }
        else {
            RG.err('Template.Level', '_removeChosenExit',
                `${x},${y} dir: ${chosen} not found.`);
        }
    };

    this._isRoomLegal = function(x, y) {
        if (x >= 0 && x < this.tilesX && y >= 0 && y < this.tilesY) {
            return true;
        }
        return false;
    };

    /* Places 1st room using startRoomFunc, or randomly if no function is
     * specified. */
    this._placeStartRoom = function() {
        let room = null;
        if (typeof this.startRoomFunc === 'function') {
            room = this.startRoomFunc();
            const props = ['x', 'y', 'room'];
            props.forEach(p => {
                if (!room.hasOwnProperty(p)) {
                    const msg = 'room must have {x, y, room}.';
                    RG.err('Template.Level', '_placeStartRoom',
                        `Prop ${p} null/undef. ${msg}.`);
                }
            });
        }
        else {
            const x = RG.RAND.getUniformInt(1, this.tilesX - 2);
            const y = RG.RAND.getUniformInt(1, this.tilesY - 2);
            room = {x, y, room: this.getRandomTemplate()};
        }

        debug('Start room: ' + JSON.stringify(room));
        this.templMap[room.x][room.y] = room.room;

        if (room !== null) {
            this._addRoomData(room);
            this._removeBorderExits(room);
        }
        else {
            RG.err('Template.Level', '_placeStartRoom',
                'Starting room was null. Oh no!');
        }
    };

    /* Places one room into the map. */
    this._placeRoom = function(
        x, y, chosen, newX, newY, exitReqd, templMatch
    ) {
        // Remove chosen exit (old room) from unused exits
        this._removeChosenExit(x, y, chosen);

        // Add new room data to unused exits
        const room = {x: newX, y: newY, room: templMatch};
        this._addRoomData(room);

        // But remove chosen exit
        this._removeChosenExit(newX, newY, exitReqd);

        // Check for abutting rooms on other edges and remove any exits
        this._checkAbuttingRooms(room);

        this._removeBorderExits(room);

        // Finally add new room to templMap
        this.templMap[newX][newY] = templMatch;

    };

    this._addRoomData = function(room) {
        const dirProp = room.room.getProp('dir');
        if (dirProp) {
            this._unusedExits.push(room);
            const exits = dirProp.split('');
            const key = room.x + ',' + room.y;
            this.freeExits[key] = exits;
            debug('>>> Added room ' + JSON.stringify(room));
        }
    };

    this.getMatchingExit = chosen => {
        switch (chosen) {
            case 'N': return 'S';
            case 'S': return 'N';
            case 'E': return 'W';
            case 'W': return 'E';
            default: return 'N';
        }
    };

    this._getNewX = (x, dir) => {
        if (dir === 'E') {return x - 1;}
        if (dir === 'W') {return x + 1;}
        return x;

    };

    this._getNewY = (y, dir) => {
        if (dir === 'N') {return y + 1;}
        if (dir === 'S') {return y - 1;}
        return y;
    };


    this.getRandomTemplate = function() {
        return RG.RAND.arrayGetRand(this.templates);
    };

    /* Removes exits from tiles which are placed in any borders of the map.
     *  Prevents out-of-bounds expansion. */
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

        debug(`CheckAbut ${x},${y}`);
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
        debug(`isFiller x,y ${x},${y}`);
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
    };

};

module.exports = RG.Template.Level;
