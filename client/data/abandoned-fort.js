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


    this.level = mainLevel;
  }

  getLevel() {
    return this.level;

  }

}
