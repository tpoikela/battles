/* Contains code to generate the abandoned fort. */

const RG = require('../src/rg');
RG.Factory = require('../src/factory');
RG.Path = require('../src/path');

RG.ObjectShell = require('../src/objectshellparser');
RG.Element = require('../src/element');
const Castle = require('../data/tiles.castle');

const TILE_SIZE = 7;

const abandonedFortConf = {
    outerColsRatio: 0.4,
    outerRowsRatio: 0.4,
    outerStartXRatio: 0.4,
    mountainWallRatio: 0.3,
    castleRowsRatio: 0.6,
    castleColsRatio: 0.6
};
export {abandonedFortConf};

export default class AbandonedFort {

  constructor(cols, rows, conf) {
    if (!conf) {
        conf = abandonedFortConf;
    }
    const outerColsRatio = conf.outerColsRatio || 0.4;
    const outerRowsRatio = conf.outerRowsRatio || 0.4;
    const outerStartXRatio = conf.outerStartXRatio || 0.4;
    const mountainWallRatio = conf.mountainWallRatio || 0.3;

    const mainWallOpts = {
      meanWx: Math.floor(mountainWallRatio * cols),
      stdDev: 10,
      filterW: 7,
      north: true, south: true, east: false, west: false,
      alignHorizontal: 'right'
    };

    const mountConf = {
        nRoadTurns: 0, snowRatio: 0.3
    };
    const mainLevel = RG.FACT.createLevel('mountain', cols, rows, mountConf);
    const mainMap = mainLevel.getMap();

    const mapGen = new RG.Map.Generator();
    const outerWallConf = {
        startRoomFunc: Castle.startRoomFuncWest
    };
    const outerCols = Math.round(outerColsRatio * cols);
    const outerRows = Math.round(outerRowsRatio * rows);
    const outerWall = mapGen.createCastleWall(outerCols, outerRows,
        outerWallConf);

    const outerX = Math.round(outerStartXRatio * cols);
    const outerY = Math.round(rows / 2 - outerWall.map.rows / 2);
    RG.Geometry.mergeMapBaseElems(mainMap, outerWall.map, outerX, outerY);

    const wallCols = Math.floor(cols / 2);
    const mountWall = RG.FACT.createLevel('wall', wallCols, rows,
      mainWallOpts);
    const wallX = cols - mountWall.getMap().cols;
    const wallY = 0;
    RG.Map.Generator.addRandomSnow(mountWall.getMap(), 0.3);
    RG.Geometry.insertSubLevel(mainLevel, mountWall, wallX, wallY);

    const castle = this.getCastleLevel(rows, cols, conf);
    const castleX = cols - castle.getMap().cols;
    const castleY = Math.round((rows - castle.getMap().rows) / 2);
    RG.Geometry.insertSubLevel(mainLevel, castle, castleX, castleY);

    // Add stairs for entrance and exit
    const midY = Math.floor(rows / 2);
    const stairsWest = new RG.Element.Stairs('stairsUp', mainLevel);
    mainLevel.addStairs(stairsWest, 0, midY);

    // Exit stairs are added to right-most coordinates
    const castleRows = castle.getMap().rows;
    const castleCols = castle.getMap().cols;

    let y0 = castleY;
    let y1 = castleY + (castleRows - 1);
    // Offset by castle corridor
    y0 += TILE_SIZE;
    y1 -= TILE_SIZE;

    const eastCell = mainMap.getFirstFreeFromRight(y0, y1);
    const [sX, sY] = [eastCell.getX(), eastCell.getY()];
    const stairsEast = new RG.Element.Stairs('stairsDown', mainLevel);
    mainLevel.addStairs(stairsEast, sX, sY);

    const castleBbox = {ulx: castleX, uly: castleY,
        lrx: castleX + castleCols - 1, lry: castleY + castleRows - 1
    };

    const parser = RG.ObjectShell.getParser();
    const itemFact = new RG.Factory.Item();

    // Add items to free cells inside the castle
    const castleFreeCells = mainMap.getFreeInBbox(castleBbox);
    const itemConf = {
        itemsPerLevel: 50, nLevel: 0,
        func: item => item.value >= 100 && item.value <= 200,
        maxValue: 500
    };
    itemFact.addItemsToCells(mainLevel, parser, castleFreeCells, itemConf);

    const fortActors = {'Mighty raven': true, 'Winter demon': true,
        Cryomancer: true, 'Ice djinn': true, Stormrider: true,
        'Snow leopard': true};
    const actorConf = {
        actorsPerLevel: 500,
        func: actor => fortActors.hasOwnProperty(actor.name),
        maxDanger: 10
    };
    RG.FACT.addNRandActors(mainLevel, parser, actorConf);

    this.createPathToFort(mainLevel, castleX);

    this.level = mainLevel;
  }

  getCastleLevel(rows, cols, conf) {
    const castleRowsRatio = conf.castleRowsRatio || 0.6;
    const castleColsRatio = conf.castleColsRatio || 0.6;
    const castleRows = Math.floor(castleRowsRatio * rows);
    const castleCols = Math.floor(castleColsRatio * cols);
    const castleOpts = {
      tilesX: Math.round(castleCols / 7),
      tilesY: Math.round(castleRows / 7),
      roomCount: 200,
      startRoomFunc: Castle.startRoomFuncWest
    };

    const castle = RG.FACT.createLevel('castle', castleCols,
      castleRows, castleOpts);
    return castle;

  }

  createPathToFort(level, castleX) {
    const map = level.getMap();
    const x0 = 0;
    const x1 = castleX + 1;
    const y0 = Math.floor(map.rows / 2);
    const y1 = Math.floor(map.rows / 2);
    /* const coord = RG.Path.getMinWeightPath(map, x0, y0, x1, y1);
    const chosenCoord = RG.Path.addPathToMap(map, coord); */
    this.createVariedPath(map, {x0, x1, y0, y1});
  }

  createVariedPath(map, confObj) {
      const {x0, y0, x1, y1} = confObj;
      const dx = 20;
      let coord = [];
      for (let x = x0; x < x1; x += dx) {
        let xEnd = x + dx;
        if (xEnd > x1) {xEnd = x1;}
        const segCoord = RG.Path.getMinWeightPath(map, x, y0, xEnd, y1);
        coord = coord.concat(segCoord);
      }
      RG.Path.addPathToMap(map, coord);
  }

  getLevel() {
    return this.level;
  }

}
