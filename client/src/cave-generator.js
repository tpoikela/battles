
/* Contains code to generate various types of caverns in the game. */

const RG = require('./rg.js');

const CaveGenerator = function() {

};

CaveGenerator.prototype.create = function(cols, rows, conf) {
    const mapgen = new RG.Map.Generator();
    let mapObj = null;
    const level = new RG.Map.Level(cols, rows);
    mapgen.setGen('cave', cols, rows);
    mapObj = mapgen.createCave(cols, rows, conf);
    level.setMap(mapObj.map);
    this.setLevelExtras(level, mapObj);
    return level;
};

module.exports = CaveGenerator;
