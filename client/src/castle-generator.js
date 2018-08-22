
// const DungeonPopulate = require('./dungeon-populate');
const RG = require('./rg.js');
const LevelGenerator = require('./level-generator');
const Level = require('./level');

/* This class is used to generate different dungeon levels. */
const CastleGenerator = function() {
    LevelGenerator.call(this);
    this.addDoors = true;
    this.shouldRemoveMarkers = true;
};
RG.extend2(CastleGenerator, LevelGenerator);

CastleGenerator.prototype.create = function(cols, rows, conf) {
    const level = this.createLevel(cols, rows, conf);

    return level;
};

CastleGenerator.prototype.createLevel = function(cols, rows, conf) {
    const levelConf = Object.assign({
        dungeonType: 'castle'}, conf);
    const mapgen = new RG.Map.Generator();
    const mapObj = mapgen.createCastle(cols, rows, levelConf);

    const level = new Level(cols, rows);
    level.setMap(mapObj.map);
    return level;
};

module.exports = CastleGenerator;
