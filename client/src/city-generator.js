/* Contains code for better city level generation. */

const RG = require('./rg');
const LevelGenerator = require('./level-generator');
const MapGenerator = require('./map.generator');

const CityGenerator = function() {
    LevelGenerator.call(this);
    this.addDoors = true;
    this.shouldRemoveMarkers = true;
};
RG.extend2(CityGenerator, LevelGenerator);

CityGenerator.prototype.create = function(cols, rows, conf) {
    const level = this.createLevel(cols, rows, conf);

    // TODO populate level with actors based on conf
    return level;
};

/* Returns a castle level without populating it. */
CityGenerator.prototype.createLevel = function(cols, rows, conf) {
    const mapGen = new MapGenerator();
    const mapObj = mapGen.createTownBSP(cols, rows, conf);

    const level = new RG.Map.Level();
    level.setMap(mapObj.map);
    return level;
};

module.exports = CityGenerator;
