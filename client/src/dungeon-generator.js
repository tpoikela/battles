
const ROT = require('../../lib/rot.js');
const RG = require('./rg.js');
RG.Map = require('./map.js');
const Level = require('./level');

const WALL = 1;

/* This class is used to generate different dungeon levels. */
const DungeonGenerator = function() {

};

/* Contain the default options for various level types. */
DungeonGenerator.options = {
    digger: {
        roomWidth: [3, 9],
        roomHeight: [3, 5],
        corridorLength: [3, 10],
        dugPercentage: 0.2
    },
    uniform: {
        roomWidth: [3, 9],
        roomHeight: [3, 5],
        roomDugPercentage: 0.1
    }
};
const OPTIONS = DungeonGenerator.options;

DungeonGenerator.getOptions = function(type = 'digger') {
    const levelOpts = {
        levelType: type, bigRooms: 1,
        bigRoomX: ['cen'], bigRoomY: ['cen'],
        bigRoomWidth: [10], bigRoomHeight: [10]
    };
    const mapOpts = {options: OPTIONS[type]};
    return Object.assign(levelOpts, mapOpts);
};

const getRandLevelType = () => {
    return RG.RAND.arrayGetRand(['uniform', 'digger']);
};

/* Creates the actual level. */
DungeonGenerator.prototype.create = function(cols, rows, conf) {
    const mapGen = this.getMapGen(cols, rows, conf);

    const map = new RG.Map.CellList(cols, rows);
    mapGen.create((x, y, val) => {
        if (val === WALL) {
            map.setBaseElemXY(x, y, RG.ELEM.WALL);
        }
    });

    // At this point, we could add things like water, chasms, bridges
    this.addSpecialFeatures(map, conf);

    const level = new Level(cols, rows);
    level.setMap(map);

    // Finally, we could populate the level with items/actors here

    // For stairs, use placeholders to mark potential stairs locations

    return level;
};

DungeonGenerator.prototype.getMapGen = function(cols, rows, conf) {
    let levelType = getRandLevelType();
    if (conf.dungeonType && conf.dungeonType !== '') {
        levelType = conf.dungeonType;
    }

    const opts = conf.options || OPTIONS[levelType];
    const mapGen = new ROT.Map.Digger(cols, rows, opts);
    // Here we need to add special rooms etc
    this.addSpecialRooms(mapGen, conf);

    return mapGen;
};

DungeonGenerator.prototype.addSpecialRooms = function(mapGen, conf) {
    const [cols, rows] = [mapGen.getCols(), mapGen.getRows()];
    const bigRooms = conf.bigRooms || 0;
    for (let i = 0; i < bigRooms; i++) {
        const width = conf.bigRoomWidth[i];
        const height = conf.bigRoomHeight[i];
        let x = conf.bigRoomX[i];
        let y = conf.bigRoomY[i];
        if (/rand/.test(x)) {
            x = RG.RAND.getUniformInt(1, cols - 2 - width);
        }
        else if (/cen/.test(x)) {
            x = Math.floor(cols / 2) - Math.floor(width / 2);
        }
        if (/rand/.test(y)) {
            y = RG.RAND.getUniformInt(1, rows - 2 - height);
        }
        else if (/cen/.test(y)) {
            y = Math.floor(rows / 2) - Math.floor(height / 2);
        }
        const x2 = x + (width - 1);
        const y2 = y + (height - 1);
        const room = new ROT.Map.Feature.Room(x, y, x2, y2);
        mapGen._options.dugPercentage += 0.1;
        // mapGen._options.roomDugPercentage = 0.1;
        if (i === 0) {
            mapGen.startRoom(room);
        }
        else {
            mapGen.addRoom(room);
        }
    }
};

DungeonGenerator.prototype.addSpecialFeatures = function(cols, rows, conf) {

};

module.exports = DungeonGenerator;
