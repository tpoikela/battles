
/* Contains code for generating mountain levels. There are two mains levels to
 * generate:
 *   1. The climb part or Mountain
 *   2. The summit part
 */
// const RG = require('./rg.js');
const MapGenerator = require('./map.generator');
const Level = require('./level');

const MountainGenerator = function() {

};

MountainGenerator.prototype.create = function(cols, rows, conf) {
    const mapgen = new MapGenerator();
    const level = new Level(cols, rows);
    mapgen.setGen('mountain', cols, rows);
    const mapObj = mapgen.createMountain(cols, rows, conf);
    const {paths} = mapObj;
    level.setMap(mapObj.map);
    level.setExtras({paths});
    return level;
};

module.exports = MountainGenerator;
