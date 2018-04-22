
/* Contains code to generate various types of caverns in the game.
 *
 */

const RG = require('./rg.js');

const CaveGenerator = function() {

};

const Miners = require('../../scripts/map.miner');

CaveGenerator.prototype.create = function(cols, rows, conf) {
    const level = this._createLevel(cols, rows, conf);
    return level;
};

/* Creates the Map.Level object with walls/floor and cave-flavor. */
CaveGenerator.prototype._createLevel = function(cols, rows, conf) {
    const mapOpts = this._createMapOptions(conf);
    const mapgen = new RG.Map.Generator();
    const level = new RG.Map.Level(cols, rows);
    mapgen.setGen('cave', cols, rows);
    const mapObj = mapgen.createCave(cols, rows, mapOpts);
    level.setMap(mapObj.map);
    this.setLevelExtras(level, mapObj);
    return level;
};

CaveGenerator.prototype._createMapOptions = function(conf) {
    const {dungeonType} = conf;
    let opts = {};

    switch (dungeonType) {
        case 'Cave': opts = Miners.getRandOpts(1, 3); break;
        case 'Grotto': opts = Miners.getRandOpts(2, 4); break;
        case 'Lair': opts = Miners.getRandOpts(1, 1); break;
        case 'Cavern': opts = Miners.getRandOpts(3, 9); break;
        default: opts = Miners.getRandOpts();
    }

    return opts;
};

module.exports = CaveGenerator;
