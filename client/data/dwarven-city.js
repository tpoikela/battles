
const RG = require('../src/rg');
const Castle = require('../data/tiles.castle');

const dwarvenCityConf = {
  outerColsRatio: 0.4,
  outerRowsRatio: 0.4,
  outerStartXRatio: 0.3
};
export {dwarvenCityConf};

const TILE_SIZE = 7;

/* Creates the level for the dwarven city. Uses mainly Castle tiles and mountain
 * walls to create the level.
 */
export default class DwarvenCity {

    constructor(cols, rows, conf = dwarvenCityConf) {
      const wallOpts = {
        meanWy: Math.floor(0.9 * rows / 2),
        stdDev: 10,
        filterW: 7
      };
      const mainLevel = RG.FACT.createLevel('wall', cols, rows, wallOpts);

      const outerColsRatio = conf.outerColsRatio || 0.35;
      const outerRowsRatio = conf.outerRowsRatio || 0.35;

      const mapGen = new RG.Map.Generator();
      const outerFortConf = {
          startRoomFunc: Castle.startFuncFourGates
      };
      let outerCols = Math.round(outerColsRatio * cols);
      let outerRows = Math.round(outerRowsRatio * rows);
      outerCols = this.adjustToTileSize(outerCols);
      outerRows = this.adjustToTileSize(outerRows);

      const outerFort = mapGen.createCastleWall(outerCols, outerRows,
        outerFortConf);

      const mainFort = mapGen.createCastleWall(outerCols, outerRows,
        outerFortConf);

      const smallFortWest = mapGen.createCastleWall(3 * 7, 3 * 7,
        {startRoomFunc: Castle.startRoomFuncEast}
      );
      const smallFortEast = mapGen.createCastleWall(3 * 7, 3 * 7,
        {startRoomFunc: Castle.startRoomFuncWest}
      );

      const outerFortLevel = new RG.Map.Level(10, 10);
      outerFortLevel.setMap(outerFort.map);

      const mainFortLevel = new RG.Map.Level(10, 10);
      mainFortLevel.setMap(mainFort.map);

      const fortWestLevel = new RG.Map.Level(10, 10);
      fortWestLevel.setMap(smallFortWest.map);
      const fortEastLevel = new RG.Map.Level(10, 10);
      fortEastLevel.setMap(smallFortEast.map);

      const subLevels = [fortWestLevel, outerFortLevel, fortEastLevel];
      const tileConf = {
        centerY: false,
        centerX: true,
        y: 10,
        // x: Math.floor((cols - outerCols) / 2)
        x: 0
      };
      const entrFortLevel = RG.Geometry.wrapAsLevel(subLevels, {centerY: true});
      RG.Geometry.tileLevels(mainLevel,
        [mainFortLevel, entrFortLevel], tileConf);

      this.level = mainLevel;
    }

    adjustToTileSize(number) {
      while (number % TILE_SIZE !== 0) {
        ++number;
      }
      if (number % 2 * TILE_SIZE === 0) {number += TILE_SIZE;}
      return number;
    }

    getLevel() {
      return this.level;
    }

}
