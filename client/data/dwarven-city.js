
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
        meanWy: Math.floor(0.85 * rows / 2),
        stdDev: 10,
        filterW: 7
      };
      const mainLevel = RG.FACT.createLevel('wall', cols, rows, wallOpts);

      const outerColsRatio = conf.outerColsRatio || 0.35;
      const outerRowsRatio = conf.outerRowsRatio || 0.35;
      let outerCols = Math.round(outerColsRatio * cols);
      let outerRows = Math.round(outerRowsRatio * rows);
      outerCols = this.adjustToTileSize(outerCols);
      outerRows = this.adjustToTileSize(outerRows);

      const entrFortLevel = this.createEntryFortLevel(outerCols, outerRows);

      const mainCols = outerCols + 2 * 7;
      const mainRows = outerRows + 2 * 7;
      const mainFortLevel = this.createMainFortLevel(mainCols, mainRows);

      const fortStartY = 10;
      const fortEndY = mainRows + outerRows;
      const fortStartX = Math.ceil((cols - mainFortLevel.getMap().cols) / 2);
      const fortEndX = fortStartX + mainCols;

      // Tile all levels together into mainLevel
      const tileConf = {
        centerY: false, centerX: true,
        y: fortStartY, x: 0
      };
      RG.Geometry.tileLevels(mainLevel,
        [mainFortLevel, entrFortLevel], tileConf);

      // Bounding box for fort levels
      const bbox = {
          ulx: fortStartX, uly: fortStartY,
          lrx: fortEndX, lry: fortEndY
      };
      this.addItemsAndActors(mainLevel, bbox);

      this.level = mainLevel;
    }

    adjustToTileSize(number) {
      while (number % TILE_SIZE !== 0) {
        ++number;
      }
      if (number % 2 * TILE_SIZE === 0) {number += TILE_SIZE;}
      return number;
    }

    /* Returns the main fort level with created side-castles. Dimensions of the
     * main fort must be given. */
    createMainFortLevel(cols, rows) {
      const fortConf = {
          startRoomFunc: Castle.startFuncFourGates
      };
      const mapGen = new RG.Map.Generator();

      const mainFort = mapGen.createCastleWall(cols, rows, fortConf);

      const castleCols = cols - 6 * 7;
      const castleRows = rows - 4 * 7;
      const innerCastle = mapGen.createCastle(castleCols, castleRows,
        {roomCount: -1, nGates: 2});
      const castleLevel = new RG.Map.Level(10, 10);
      castleLevel.setMap(innerCastle.map);
      RG.Geometry.mergeMapElems(mainFort.map, innerCastle.map, 3 * 7, 2 * 7);

      const mainFortLevel = new RG.Map.Level(10, 10);
      mainFortLevel.setMap(mainFort.map);

      const mainFortWest = mapGen.createCastle(7 * 7, 5 * 7,
          {startRoomFunc: Castle.startRoomFuncEast,
              roomCount: -1}
      );
      const mainFortEast = mapGen.createCastle(7 * 7, 5 * 7,
          {startRoomFunc: Castle.startRoomFuncWest,
              roomCount: -1}
      );

      const mainFortWestLevel = new RG.Map.Level(10, 10);
      mainFortWestLevel.setMap(mainFortWest.map);
      const mainFortEastLevel = new RG.Map.Level(10, 10);
      mainFortEastLevel.setMap(mainFortEast.map);

      const mainFortLevels = [mainFortWestLevel, mainFortLevel,
        mainFortEastLevel];

      const wrapConf = {centerY: true, baseElem: RG.ELEM.WALL};
      return RG.Geometry.wrapAsLevel(mainFortLevels, wrapConf);
    }

    /* Returns the first entrance fort. */
    createEntryFortLevel(cols, rows) {
      const mapGen = new RG.Map.Generator();
      const outerFortConf = {
          startRoomFunc: Castle.startFuncFourGates
      };

      const outerFort = mapGen.createCastleWall(cols, rows,
        outerFortConf);

      const castleCols = cols - 6 * 7;
      const castleRows = rows - 6 * 7;
      const innerCastle = mapGen.createCastle(castleCols, castleRows,
        {nGates: 2, roomCount: -1});
      const castleLevel = new RG.Map.Level(10, 10);
      castleLevel.setMap(innerCastle.map);
      RG.Geometry.mergeMapElems(outerFort.map, innerCastle.map, 3 * 7, 3 * 7);

      const smallFortWest = mapGen.createCastleWall(3 * 7, 3 * 7,
        {startRoomFunc: Castle.startRoomFuncEast}
      );
      const smallFortEast = mapGen.createCastleWall(3 * 7, 3 * 7,
        {startRoomFunc: Castle.startRoomFuncWest}
      );

      const entryFortLevel = new RG.Map.Level(10, 10);
      entryFortLevel.setMap(outerFort.map);

      const fortWestLevel = new RG.Map.Level(10, 10);
      fortWestLevel.setMap(smallFortWest.map);
      const fortEastLevel = new RG.Map.Level(10, 10);
      fortEastLevel.setMap(smallFortEast.map);

      const subLevels = [fortWestLevel, entryFortLevel, fortEastLevel];
      const wrapConf = {centerY: true, baseElem: RG.ELEM.WALL};
      return RG.Geometry.wrapAsLevel(subLevels, wrapConf);

    }

    /* Adds actors and items into the level using bbox as constraint.
     * This guarantees that everything's placed inside the fort. */
    addItemsAndActors(level, bbox) {
      const parser = RG.ObjectShell.getParser();
      const freeCells = level.getMap().getFreeInBbox(bbox);

      const actorConf = {
          fighter: 100, axeman: 50,
          elite: 25, rifleman: 25,
          commander: 5
      };
      const actors = [];
      Object.keys(actorConf).forEach(key => {
        const name = `dwarven ${key}`;
        const num = actorConf[key];
        for (let i = 0; i < num; i++) {
            const actor = parser.createActor(name);
            actors.push(actor);
        }
      });
      RG.Factory.addPropsToCells(level, freeCells, actors, RG.TYPE_ACTOR);

      // Add items, avoid placing anything to "hallways" of castles
    }

    getLevel() {
      return this.level;
    }

}
