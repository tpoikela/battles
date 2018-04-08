
const ROT = require('../../lib/rot.js');
const RG = require('./rg.js');
RG.Map = require('./map.js');
const Level = require('./level');

const WALL = 1;

/* This class is used to generate different dungeon levels. */
const DungeonGenerator = function() {

};

/* Creates the actual level. */
DungeonGenerator.prototype.create = function(cols, rows, conf) {
    const opts = {};
    const mapGen = ROT.Map.Digger(cols, rows, opts);
    const map = new RG.Map.CellList(cols, rows);
    mapGen.create((x, y, val) => {
        if (val === WALL) {
            map.setBaseElemXY(x, y, RG.ELEM.WALL);
        }
    });
    const level = new Level(cols, rows);
    level.setMap(map);
    return level;
};

module.exports = DungeonGenerator;
