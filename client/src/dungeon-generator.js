
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
    const levelOpts = {levelType: type};
    const mapOpts = OPTIONS[type];
    return Object.assign(levelOpts, mapOpts);
};

const getRandLevelType = () => {
    return RG.RAND.arrayGetRand(['uniform', 'digger']);
};

/* Creates the actual level. */
DungeonGenerator.prototype.create = function(cols, rows, conf) {
    let levelType = getRandLevelType();
    if (conf.dungeonType && conf.dungeonType !== '') {
        levelType = conf.dungeonType;
    }

    const opts = conf.options || OPTIONS[levelType];
    const mapGen = this.getMapGen(cols, rows, opts);

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
    const opts = {};
    const mapGen = new ROT.Map.Digger(cols, rows, opts);
    // Here we need to add special rooms etc
    this.addSpecialRooms(mapGen, conf);

    return mapGen;
};

DungeonGenerator.prototype.addSpecialRooms = function(mapGen, conf) {

};

DungeonGenerator.prototype.addSpecialFeatures = function(cols, rows, conf) {

};

module.exports = DungeonGenerator;
