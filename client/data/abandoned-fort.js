/* Contains code to generate the abandoned fort. */

const RG = require('../src/rg');
RG.Factory = require('../src/factory');
RG.Path = require('../src/path');

RG.ObjectShell = require('../src/objectshellparser');
// const Objects = require('../data/battles_objects');
RG.Effects = require('../data/effects');
RG.Element = require('../src/element');
const Castle = require('../data/tiles.castle');

export default class AbandonedFort {

  constructor(cols, rows, conf = {}) {
    const mainWallOpts = {
      meanWx: Math.floor(0.3 * cols),
      stdDev: 10,
      filterW: 7,
      north: true, south: true, east: false, west: false,
      alignHorizontal: 'right'
    };

    const mainLevel = RG.FACT.createLevel('empty', cols, rows);

    const mapGen = new RG.Map.Generator();
    const outerWallConf = {
        startRoomFunc: Castle.startRoomFuncWest
    };
    const outerCols = Math.round(0.4 * cols);
    const outerRows = Math.round(0.4 * rows);
    const outerWall = mapGen.createCastleWall(outerCols, outerRows,
        outerWallConf);

    const outerX = Math.round(0.4 * cols);
    const outerY = Math.round(rows / 2 - outerWall.map.rows / 2);
    RG.Geometry.mergeMaps(mainLevel.getMap(), outerWall.map, outerX, outerY);

    const wallCols = Math.floor(cols / 2);
    const mountWall = RG.FACT.createLevel('wall', wallCols, rows,
      mainWallOpts);
    const wallX = cols - mountWall.getMap().cols;
    const wallY = 0;
    RG.Geometry.insertSubLevel(mainLevel, mountWall, wallX, wallY);

    const castleRows = Math.floor(0.6 * rows);
    const castleCols = Math.floor(0.5 * cols);
    const castleOpts = {
      tilesX: Math.round(castleCols / 7),
      tilesY: Math.round(castleRows / 7),
      roomCount: 100,
      startRoomFunc: Castle.startRoomFuncWest
    };

    const castle = RG.FACT.createLevel('castle', castleCols,
      castleRows, castleOpts);
    const castleX = cols - castle.getMap().cols;
    const castleY = Math.round((rows - castle.getMap().rows) / 2);
    console.log(`castle X,Y ${castleX},${castleY}`);
    RG.Geometry.insertSubLevel(mainLevel, castle, castleX, castleY);

    // Add stairs for entrance and exit
    const midY = Math.floor(rows / 2);
    const stairsWest = new RG.Element.Stairs(false, mainLevel);
    mainLevel.addStairs(stairsWest, 0, midY);

    const mainMap = mainLevel.getMap();

    // Exit stairs are added to right-most coordinates
    const y0 = castleY;
    const y1 = castleY + (castleRows - 1);
    console.log(`eastStairs range y ${y0} -> ${y1}`);
    const eastCell = mainMap.getFirstFreeFromRight(y0, y1);
    const [sX, sY] = [eastCell.getX(), eastCell.getY()];
    const stairsEast = new RG.Element.Stairs(true, mainLevel);
    mainLevel.addStairs(stairsEast, sX, sY);

    const castleBbox = {ulx: castleX, uly: castleY,
        lrx: castleX + castleCols - 1, lry: castleY + castleRows - 1
    };
    const castleFreeCells = mainMap.getFreeInBbox(castleBbox);

    // Add items to free cells inside the castle

    this.level = mainLevel;
  }

  getLevel() {
    return this.level;
  }

}
