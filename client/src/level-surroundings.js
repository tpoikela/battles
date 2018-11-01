/* Code to create a surroundings for a level. This is useful for example
 * if city is close to water or mountain, and those features must
 * be added around the city. */
const RG = require('./rg');
const Geometry = require('./geometry');
const Random = require('./random');
const Level = require('./level');

const RNG = Random.getRNG();

const LevelSurroundings = function() {

};

/* Surrounds the given level with features based on different params:
 * conf: {
 *     surroundX,surroundY: <size of the padding>
 *     cellsAround: {N: 'water', S: 'wallmount', E: 'snow' ...}
 * }
 */
LevelSurroundings.prototype.surround = function(level, conf) {
    if (conf.cellsAround) {
        return this.surroundWithCellsAround(level, conf);
    }
    const json = JSON.stringify(conf);
    RG.err('LevelSurroundings', 'surround',
        `No conf given for surround. Got: ${json}`);
    return null;
};

LevelSurroundings.prototype.surroundWithCellsAround = function(level, conf) {
    const xSize = 2 * conf.surroundX || 2 * 10;
    const ySize = 2 * conf.surroundY || 2 * 10;

    const {cols, rows} = level.getMap();
    const colsArea = cols + xSize;
    const rowsArea = rows + ySize;
    const {cellsAround} = conf;

    const wallConf = {};
    if (cellsAround.N === 'wallmount') {
        wallConf.alignVertical = 'top';
    }
    else if (cellsAround.S === 'wallmount') {
        wallConf.alignVertical = 'bottom';
    }

    if (cellsAround.E === 'wallmount') {
        wallConf.alignHorizontal = 'left';
        wallConf.north = true;
        wallConf.south = true;
    }
    else if (cellsAround.W === 'wallmount') {
        wallConf.alignHorizontal = 'right';
        wallConf.north = true;
        wallConf.south = true;
    }
    wallConf.meanWx = RNG.getUniformInt(5, xSize);
    wallConf.meanWy = RNG.getUniformInt(5, ySize);
    wallConf.wallElem = RG.ELEM.WALL_MOUNT;

    const mapgen = new RG.Map.Generator();
    // mapgen.setGen('empty', colsArea, rowsArea);
    const mapObj = mapgen.createWall(colsArea, rowsArea, wallConf);
    const mountLevel = new Level(colsArea, rowsArea);
    mountLevel.setMap(mapObj.map);

    Object.keys(cellsAround).forEach(dir => {
        if (cellsAround[dir] === 'water') {
            const lakeConf = {
                ratio: 0.6, skipTypes: {wallmount: true},
                forestSize: 300, nForests: 10
            };
            const bbox = Geometry.dirToBbox(colsArea, rowsArea, dir);
            mapgen.addLakes(mountLevel.getMap(), lakeConf, bbox);
        }
    });

    Geometry.mergeLevels(mountLevel, level, xSize / 2, ySize / 2);
    return mountLevel;

};

module.exports = LevelSurroundings;
