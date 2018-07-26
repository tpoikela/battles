
const RG = require('./rg');
RG.Random = require('./random');
const debug = require('debug')('bitn:Template.Level');
RG.Template = require('./template');
const Crypt = require('../data/tiles.crypt');

const fillerTempl = Crypt.tiles.filler;
const RNG = RG.Random.getRNG();

const debugVerbosity = 20;

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
    this.ind = 0;

    this.filler = RG.Template.createTemplate(fillerTempl);
    this.templates = [];

    this.genParamMin = 1;
    this.genParamMax = 1;

    this._unusedExits = [];
    this.freeExits = {};

    this.possibleDirections = ['N', 'S', 'E', 'W'];

    // Finds always best match for exits
    this.tryToMatchAllExits = true;

    // Works only when tryToMatchAllExits = true. Throws error is required exits
    // are not found in tiles.
    this.missingExitIsError = false;

    this.sortedByExit = {
        N: [], S: [], E: [], W: []
    };

    // For sorting by including all possible exits
    this.sortedWithAllExits = {};

    /* Sets the filler tile used to fill the map first. */
    this.setFiller = function(fillerTempl) {
        this.filler = RG.Template.createTemplate(fillerTempl);
    };

    /* Sets the room templates that are used. */
    this.setTemplates = function(asciiTiles) {
        this.templates = [];
        if (typeof asciiTiles[0] === 'string') {
            this.templates = asciiTiles.map(t => RG.Template.createTemplate(t));
        }
        else {
            this.templates = asciiTiles;
        }
    };

    this.addTemplate = function(asciiTile) {
        if (typeof asciiTile === 'string') {
              this.templates.push(RG.Template.createTemplate(asciiTile));
        }
        else if (asciiTile instanceof RG.Template.ElemTemplate) {
            this.templates.push(asciiTile);
        }
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

        if (obj.tiles && obj.tiles.filler) {
            this.setFiller(obj.tiles.filler);
        }

        if (obj.Models && obj.Models.default) {
            this.setTemplates(obj.Models.default);
        }
    };

    /* Creates the level. Result is in this.map.
     * This is the Main function you want to call. */
    this.create = function() {
        if (this.templates.length === 0) {
            RG.err('Template.Level', 'create',
                'No templates set. Use setTemplates() before create()');
        }

        const dirRegex = this.possibleDirections.map(dir => new RegExp(dir));
        // Sort data into lists based on different directions
        this.templates.forEach(templ => {
            const dir = templ.getProp('dir');
            if (dir) {
                this.possibleDirections.forEach((direction, i) => {
                    if (dirRegex[i].test(dir)) {
                        this.sortedByExit[direction].push(templ);
                    }
                });

                // Add to map including all possible exits
                const dirSorted = dir.split('').sort().join('');
                if (!this.sortedWithAllExits[dirSorted]) {
                    this.sortedWithAllExits[dirSorted] = [];
                }
                this.sortedWithAllExits[dirSorted].push(templ);
            }
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
        let dungeonTries = 10;
        while (dungeonInvalid) {
            ++this.ind;
            this.dbg(`Dungeon not ready. Tries left  ${dungeonTries}/10`);
            this._placeStartRoom();

            let roomCount = 0;
            const goalCount = this.roomCount;
            let numTries = 0;
            let hasExits = true;

            while (numTries < 1000 && hasExits) {

                // Get a room with unused exits or terminate
                const room = this._getRoomWithUnusedExits();
                if (room === null) {
                    hasExits = false;
                    break;
                }

                const {x, y} = room;
                this.dbg(`Current room in ${x},${y}`);
                const exits = this._getFreeExits(room);
                this.dbg(`It has free exits: ${exits}`);

                // Pick one exit randomly
                const chosen = RNG.arrayGetRand(exits);
                this.dbg(`Chose exit: ${chosen} for next room`);

                // Get required matching exit
                const exitReqd = this.getMatchingExit(chosen);
                const newX = this._getNewX(x, exitReqd);
                const newY = this._getNewY(y, exitReqd);

                if (newX === x && newY === y) {
                    let msg = `Illegal ${x},${y} -> ${newX},${newY}`;
                    msg += ` Exits: Chosen ${chosen} -> ${exitReqd}`;
                    RG.err('Template.Level', 'create', msg);
                }

                // Get a new room matching this exit
                const templMatch = this._getNextTemplate(newX, newY, exitReqd);

                // Make sure the new room is valid
                if (this._isRoomLegal(newX, newY)) {
                    this._placeRoom(
                        x, y, chosen, newX, newY, exitReqd, templMatch);
                    ++roomCount;
                    this.dbg('Room count incremented to ' + roomCount);
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
            else if (--dungeonTries === 0) {
                RG.warn('Level.Template', 'create',
                    'Max tries reached. No valid level created');
                break;
            }
            else {
                this._cleanupAndTryAgain();
            }
            --this.ind;
        }

        this.expandTemplates();
    };

    /* Expands the templates with generator params and creates the final 2d-tile
     * map from the 2d template map. */
    this.expandTemplates = function() {
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

    /* Returns the generated map (found also in this.map). */
    this.getMap = function() {
        if (!this.map) {
            RG.warn('Template.Level', 'getMap',
                'Not not generated. Call create() first');
        }
        return this.map;
    };

    /* Finds a template based on prop name and val, and returns a random
     * template among the found templates. Returns null if none are found. */
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
            return RNG.arrayGetRand(result);
        }
        return null;
    };

    /* Removes the templates matching the given query. This is useful, if for
     * example after starting conditions you want to remove some tiles. */
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
     * callbacks. Can be used to place any amount of rooms prior to calling
     * create(). */
    this.addRoom = function(templ, x, y) {
        const room = {x, y, room: templ};
        this._addRoomData(room);
        this._removeExitsOfAbuttingRooms(room);
        this._removeBorderExits(room);
        this.templMap[x][y] = templ;
    };


    //----------------------------------------------------------------
    // PRIVATE
    //----------------------------------------------------------------

    this._getNextTemplate = function(x, y, exitReqd) {
        ++this.ind;
        let next = null;
        if (typeof this.constraintFunc === 'function') {
            next = this.constraintFunc(x, y, exitReqd);
        }

        // All exits are required to match
        if (!next && this.tryToMatchAllExits) {
            this.dbg(`Compute required exits for ${x},${y}`);
            const exitsReqd = this.getAllRequiredExits(x, y);
            const listMatching = this._getMatchWithExits(exitsReqd);
            if (listMatching.length > 0) {
                return this._getRandTemplate(listMatching);
            }
            const msg = `Required: ${exitsReqd[1]}, Excl: ${exitsReqd[2]}`;
            RG.warn('Template.Level', '_getNextTemplate',
                `Not all exits match. ${msg}`);

            if (this.missingExitIsError) {
                this.expandTemplates();
                RG.printMap(this.map);
                const str = `${x},${y} exitReqd: ${JSON.stringify(exitsReqd)}`;
                throw new Error(str);
            }
        }

        if (!next) {
            const listMatching = this.sortedByExit[exitReqd];
            return RNG.arrayGetRand(listMatching);
        }

        --this.ind;
        return next;
    };

    /* Returns random template from the given list. Uses random weights if any
     * are given. */
    this._getRandTemplate = function(list) {
        if (!this.weights) {
            return RNG.arrayGetRand(list);
        }
        const weights = {};
        const names = list.map(t => t.getProp('name'));
        const nameToIndex = {};
        names.forEach((name, i) => {
            nameToIndex[name] = i;
            if (this.weights.hasOwnProperty(name)) {
                weights[name] = this.weights[name];
            }
            else {
                weights[name] = 1;
            }
        });
        const chosenName = RNG.getWeighted(weights);
        return list[nameToIndex[chosenName]];
    };

    this._getRoomWithUnusedExits = function() {
        if (this._unusedExits.length > 0) {
            return RNG.arrayGetRand(this._unusedExits);
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
        this.dbg(JSON.stringify(this.freeExits));
        this.dbg(`${x},${y} removeChosenExit ${chosen}`);
        this.dbg(`nExits: ${exits.length}`);
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
                    this.dbg(`${x},${y} has no unused exits anymore.`);
                }
                else {
                    RG.err('Template.Level', '_removeChosenExit',
                        `Cannot find ${x},${y} in unusedExits to remove.`);
                }
            }
            if (this.freeExits[key]) {
                this.dbg(`freeExits [${key}] After remove: `
                    + JSON.stringify(this.freeExits[key]));
            }
        }
        else {
            const json = JSON.stringify(this.templMap[x][y]);
            RG.err('Template.Level', '_removeChosenExit',
                `${x},${y} dir: ${chosen} not found. Templ: ${json}`);
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
        ++this.ind;
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
            const x = RNG.getUniformInt(1, this.tilesX - 2);
            const y = RNG.getUniformInt(1, this.tilesY - 2);
            room = {x, y, room: this.getRandomTemplate()};
        }

        this.dbg('Start room: ' + JSON.stringify(room));
        this.templMap[room.x][room.y] = room.room;

        if (room !== null) {
            this._addRoomData(room);
            this._removeBorderExits(room);
        }
        else {
            RG.err('Template.Level', '_placeStartRoom',
                'Starting room was null. Oh no!');
        }
        --this.ind;
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
        this._removeExitsOfAbuttingRooms(room);

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
            this.dbg('Added room ' + JSON.stringify(room), 20);
        }
    };

    /* Returns the matching (opposite) exit for the chosen exit. */
    this.getMatchingExit = chosen => {
        if (this.matchMap) {
            if (this.matchMap.hasOwnProperty(chosen)) {
                return this.matchMap[chosen];
            }
        }
        switch (chosen) {
            case 'N': return 'S';
            case 'S': return 'N';
            case 'E': return 'W';
            case 'W': return 'E';
            default: return 'N';
        }
    };

    /* Returns new X value based on the direction. Remaps custom dir to NSEW
    * first. */
    this._getNewX = (x, dir) => {
        let remapped = dir;
        if (this.dir2NSEWRemap) {
            if (this.dir2NSEWRemap[dir]) {
                remapped = this.dir2NSEWRemap[dir];
            }
        }
        if (remapped === 'E') {return x - 1;}
        if (remapped === 'W') {return x + 1;}
        return x;

    };

    /* Returns new Y value based on the direction. Remaps custom dir to NSEW
    * first. */
    this._getNewY = (y, dir) => {
        let remapped = dir;
        if (this.dir2NSEWRemap) {
            if (this.dir2NSEWRemap[dir]) {
                remapped = this.dir2NSEWRemap[dir];
            }
        }
        if (remapped === 'N') {return y + 1;}
        if (remapped === 'S') {return y - 1;}
        return y;
    };

    this.getRandomTemplate = function() {
        return RNG.arrayGetRand(this.templates);
    };

    /* Removes exits from tiles which are placed in any borders of the map.
     *  Prevents out-of-bounds expansion. */
    this._removeBorderExits = function(room) {
        const {x, y} = room;
        if (x === 0) {
            if (this._hasExit('W', x, y)) {
                this._removeChosenExit(x, y, 'W');
            }
            if (this.nsew2DirRemap) {
                this._removeExitsRemapped(x, y, 'W');
            }
        }

        if (x === this.tilesX - 1) {
            if (this._hasExit('E', x, y)) {
                this._removeChosenExit(x, y, 'E');
            }
            if (this.nsew2DirRemap) {
                this._removeExitsRemapped(x, y, 'E');
            }
        }

        if (y === 0) {
            if (this._hasExit('N', x, y)) {
                this._removeChosenExit(x, y, 'N');
            }
            if (this.nsew2DirRemap) {
                this._removeExitsRemapped(x, y, 'N');
            }
        }

        if (y === this.tilesY - 1) {
            if (this._hasExit('S', x, y)) {
                this._removeChosenExit(x, y, 'S');
            }
            if (this.nsew2DirRemap) {
                this._removeExitsRemapped(x, y, 'S');
            }
        }

    };

    /* Receives NSEW directions and uses nsew2DirRemap remapping to remove the
     * custom exits. */
    this._removeExitsRemapped = function(x, y, dir) {
        const remapped = this.nsew2DirRemap[dir];
        if (this._hasExit(remapped, x, y)) {
            this._removeChosenExit(x, y, remapped);
        }
    };

    /* Checks for rooms already in place around the placed room, and removes all
     * matching exits. */
    this._removeExitsOfAbuttingRooms = function(room) {
        const {x, y} = room;

        this.dbg(`CheckAbut ${x},${y}`);
        if (x > 0) {
            const nx = x - 1;
            if (!this._isFiller(nx, y)) {
                this._removeExitByXY('W', x, y);
                this._removeExitByXY('E', nx, y);
                if (this.nsew2DirRemap) {
                    this._removeExitByXY(this.nsew2DirRemap.W, x, y);
                    this._removeExitByXY(this.nsew2DirRemap.E, nx, y);
                }
            }
        }

        if (x < this.tilesX - 1) {
            const nx = x + 1;
            if (!this._isFiller(nx, y)) {
                this._removeExitByXY('E', x, y);
                this._removeExitByXY('W', nx, y);
                if (this.nsew2DirRemap) {
                    this._removeExitByXY(this.nsew2DirRemap.E, x, y);
                    this._removeExitByXY(this.nsew2DirRemap.W, nx, y);
                }
            }
        }

        if (y > 0) {
            const ny = y - 1;
            if (!this._isFiller(x, ny)) {
                this._removeExitByXY('N', x, y);
                this._removeExitByXY('S', x, ny);
                if (this.nsew2DirRemap) {
                    this._removeExitByXY(this.nsew2DirRemap.N, x, y);
                    this._removeExitByXY(this.nsew2DirRemap.S, x, ny);
                }
            }
        }

        if (y < this.tilesY - 1) {
            const ny = y + 1;
            if (!this._isFiller(x, ny)) {
                this._removeExitByXY('S', x, y);
                this._removeExitByXY('N', x, ny);
                if (this.nsew2DirRemap) {
                    this._removeExitByXY(this.nsew2DirRemap.S, x, y);
                    this._removeExitByXY(this.nsew2DirRemap.N, x, ny);
                }
            }
        }

    };

    this._isFiller = function(x, y) {
        const filler = this.templMap[x][y].getProp('name') === 'FILLER';
        this.dbg(`isFiller x,y ${x},${y}: ${filler}`);
        return filler;
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

    /* Sets a new exit map instead of using the default 4-directional NSEW. You
    * must also provide remapping tables. For example, we'd like to remap
    * cardinal dirs NSEW to up/down/left/right UDLR:
    * 1. matchMap = {U: 'D', D: 'U', L: 'R', R: 'R'}
    * 2. nsew2DirRemap = {N: 'U', S: 'D', W: 'L', E: 'R'}
    * */
    this.setExitMap = function(matchMap, nsew2DirRemap) {
        this.possibleDirections = Object.keys(matchMap);
        this.sortedByExit = {};
        this.possibleDirections.forEach(dir => {
            this.sortedByExit[dir] = [];
        });
        this.matchMap = matchMap;
        this.nsew2DirRemap = nsew2DirRemap;

        const dir2NSEWRemap = {};
        Object.keys(this.nsew2DirRemap).forEach(key => {
            const val = this.nsew2DirRemap[key];
            dir2NSEWRemap[val] = key;
        });
        this.dir2NSEWRemap = dir2NSEWRemap;
    };

    /* Returns all exits which are required @x,y to match all surrounding
    * tiles. */
    this.getAllRequiredExits = function(x, y) {
        ++this.ind;
        const any = [];
        const exits = [];
        const excluded = [];

        let remapped = null;
        let remapMatch = null;
        // N tile
        const nY = y - 1;
        if (this.nsew2DirRemap) {
            remapped = this.nsew2DirRemap.N;
            remapMatch = this.matchMap[remapped];
        }
        if (nY >= 0) {
            if (this._isFiller(x, nY)) {
                any.push('N');
            }
            else if (this._hasExit('S', x, nY)) {
                exits.push('N');
            }
            else {
                excluded.push('N');
            }

            if (remapped) {
                if (this._isFiller(x, nY)) {
                    any.push(remapped);
                }
                else if (this._hasExit(remapMatch, x, nY)) {
                    exits.push(remapped);
                }
                else {
                    excluded.push(remapped);
                }
            }

        }
        else {
            excluded.push('N');
            if (remapped) {excluded.push(remapped);}
        }

        // S tile
        const sY = y + 1;
        if (this.nsew2DirRemap) {
            remapped = this.nsew2DirRemap.S;
            remapMatch = this.matchMap[remapped];
        }

        if (sY < this.tilesY) {
            if (this._isFiller(x, sY)) {
                any.push('S');
            }
            else if (this._hasExit('N', x, sY)) {
                exits.push('S');
            }
            else {
                excluded.push('S');
            }

            if (remapped) {
                if (this._isFiller(x, sY)) {
                    any.push(remapped);
                }
                else if (this._hasExit(remapMatch, x, sY)) {
                    exits.push(remapped);
                }
                else {
                    excluded.push(remapped);
                }
            }
        }
        else {
            excluded.push('S');
            if (remapped) {excluded.push(remapped);}
        }

        // E tile
        const eX = x + 1;
        if (this.nsew2DirRemap) {
            remapped = this.nsew2DirRemap.E;
            remapMatch = this.matchMap[remapped];
        }
        if (eX < this.tilesX) {
            if (this._isFiller(eX, y)) {
                any.push('E');
            }
            else if (this._hasExit('W', eX, y)) {
                exits.push('E');
            }
            else {
                excluded.push('E');
            }

            if (remapped) {
                if (this._isFiller(eX, y)) {
                    any.push(remapped);
                }
                else if (this._hasExit(remapMatch, eX, y)) {
                    exits.push(remapped);
                }
                else {
                    excluded.push(remapped);
                }
            }
        }
        else {
            excluded.push('E');
            if (remapped) {excluded.push(remapped);}
        }

        // W tile
        const wX = x - 1;
        if (this.nsew2DirRemap) {
            remapped = this.nsew2DirRemap.W;
            remapMatch = this.matchMap[remapped];
        }
        if (wX >= 0) {
            if (this._isFiller(wX, y)) {
                any.push('W');
            }
            else if (this._hasExit('E', wX, y)) {
                exits.push('W');
            }
            else {
                excluded.push('W');
            }

            if (remapped) {
                if (this._isFiller(wX, y)) {
                    any.push(remapped);
                }
                else if (this._hasExit(remapMatch, wX, y)) {
                    exits.push(remapped);
                }
                else {
                    excluded.push(remapped);
                }
            }
        }
        else {
            excluded.push('W');
            if (remapped) {excluded.push(remapped);}
        }

        this.dbg('getAllRequired ' + exits);

        --this.ind;
        return [any, exits, excluded];
    };

    this._getMatchWithExits = function(exitsReqd) {
        const [any, exits, excluded] = exitsReqd;
        this.dbg(`GOT: any:${any}, req:${exits}, excl:${excluded}`);
        const keys = Object.keys(this.sortedWithAllExits);
        let validKeys = keys;

        // Exclude exits
        excluded.forEach(exit => {
            validKeys = validKeys.filter(key => (
                !new RegExp(exit).test(key)
            ));
        });


        // Check if required exits are contained in the keys
        let keysSplit = validKeys.map(key => key.split(''));
        keysSplit = keysSplit.filter(elem => (
            this._arrayContainsArray(elem, exits)
        ));

        validKeys = keysSplit.map(key => key.join(''));

        let result = [];
        validKeys.forEach(key => {
            result = result.concat(this.sortedWithAllExits[key]);
        });
        return result;
    };

    this._arrayContainsArray = function(superSet, subSet) {
        return subSet.every(value => {
            return superSet.indexOf(value) >= 0;
        });
    };

    /* Prints the debug msg when debug() is enabled. Adds some verbosity options
     * for filtering some debug messages out. */
    this.dbg = function(msg, verb = 10) {
        if (debug.enabled) {
            if (debugVerbosity >= verb) {
                const ind = ' '.repeat(this.ind);
                console.log(ind + msg);
            }
        }
    };

    this.printTile = function(x, y) {
        if (x === 4 && y === 3) {
            const tile = this.templMap[x][y];
            console.log(`Tile @{x},${y}`);
            console.log(`Has exits: ${tile.getDir()}`);
            console.log(JSON.stringify(tile, null, 2));
        }
    };

};

module.exports = RG.Template.Level;
