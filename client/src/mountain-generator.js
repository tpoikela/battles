
/* Contains code for generating mountain levels. There are two mains levels to
 * generate:
 *   1. The climb part or Mountain
 *   2. The summit part
 */
const RG = require('./rg.js');
const MapGenerator = require('./map.generator');
const Level = require('./level');
const Geometry = require('./geometry');
const Path = require('./path');
const DungeonPopulate = require('./dungeon-populate');

const MountainGenerator = function() {

};

MountainGenerator.options = {};

MountainGenerator.getSummitOptions = function() {
    return MountainGenerator.options.summit;
};
MountainGenerator.getFaceOptions = function() {
    const mapOpts = MapGenerator.getOptions('mountain');
    const opts = Object.assign({}, mapOpts, MountainGenerator.options.face);
    // Usually overridden by top-level conf
    opts.maxDanger = 5;
    opts.maxValue = 100;
    return opts;
};

MountainGenerator.options.face = {

};

MountainGenerator.options.summit = {
    ratio: 0.3
};

MountainGenerator.prototype.createFace = function(cols, rows, conf) {
    const mapgen = new MapGenerator();
    const level = new Level(cols, rows);
    mapgen.setGen('mountain', cols, rows);
    conf.nRoadTurns = 0;
    const mapObj = mapgen.createMountain(cols, rows, conf);
    const {paths} = mapObj;
    level.setMap(mapObj.map);

    this.createCrux(level, conf);

    level.setExtras({paths});
    return level;
};

MountainGenerator.prototype.createSummit = function(cols, rows, conf) {
    const mapgen = new MapGenerator();
    const level = new Level(cols, rows);
    mapgen.setGen('mountain', cols, rows);
    const mapObj = mapgen.createSummit(cols, rows, conf);
    level.setMap(mapObj.map);
    level.setExtras({});
    return level;
};

MountainGenerator.prototype.createCrux = function(level, conf) {
    const map = level.getMap();
    const cols = map.cols;
    const wallRows = Math.round(map.rows / 6);
    const wallConf = {
        wallElem: RG.ELEM.HIGH_ROCK,
        meanWy: Math.round(wallRows / 2.5)
    };

    const mapgen = new MapGenerator();
    mapgen.setGen('wall', cols, wallRows);
    const wallMapObj = mapgen.createWall(cols, wallRows, wallConf);

    const wallMap = wallMapObj.map;
    wallMap.debugPrintInASCII();

    // Carve a path through the wall
    const xTop = RG.RAND.getUniformInt(0, cols - 1);
    const xBottom = RG.RAND.getUniformInt(0, cols - 1);
    const carvedXY = this.carvePath(wallMap, xTop, 0, xBottom, wallRows - 1);

    const wallStartY = Math.round(map.rows / 5);
    const mergeCb = (c1, c2) => {
        // const baseElem1 = c1.getBaseElem();
        const baseElem2 = c2.getBaseElem();
        return !(/(floor)/).test(baseElem2.getType());
    };
    Geometry.mergeMaps(map, wallMap, 0, wallStartY, mergeCb);

    const bbox = {bbox: {
        ulx: 0, uly: wallStartY, lrx: cols - 1, lry: wallStartY + wallRows - 1
    }};
    const paths = [];
    const pathConf = {
        exclude: bbox
    };
    mapgen.createMountainPath(map, paths, pathConf);

    // Add some guardians to the crux points, offset Y-coord first
    carvedXY.forEach(item => {
        item[1] += wallStartY;
    });

    const nGuardians = 3;
    const dungPopul = new DungeonPopulate(conf);
    for (let i = 0; i < nGuardians; i++) {
        const guardPoint = RG.RAND.arrayGetRand(carvedXY);
        dungPopul.addPointGuardian(level, guardPoint, conf.maxDanger);
    }
};

/* Carves a path between x0,y0 and x1,y1 using a shortest distance. */
MountainGenerator.prototype.carvePath = function(map, x0, y0, x1, y1) {
    const result = [];
    const path = Path.getShortestPath(x0, y0, x1, y1);
    path.forEach(xy => {
        const brush = Geometry.getCrossAround(xy.x, xy.y, 2, true);
        brush.forEach(xy => {
            const [x, y] = xy;
            if (map.hasXY(x, y)) {
                result.push(xy);
                map.setBaseElemXY(x, y, RG.ELEM.STONE);
            }
        });
    });
    return result;
};

module.exports = MountainGenerator;
