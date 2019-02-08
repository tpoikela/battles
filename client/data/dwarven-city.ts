
import RG from '../src/rg';
import {FactoryLevel} from '../src/factory.level';
import {Castle} from '../data/tiles.castle';
import {Placer} from '../src/placer';
import {Level} from '../src/level';
import {ElementStairs} from '../src/element';
import {MapGenerator} from '../src/map.generator';
import {Geometry} from '../src/geometry';
import {ELEM} from './elem-constants';
import {ObjectShell} from '../src/objectshellparser';
import {LevelUtils} from '../src/level-utils';

const dwarvenCityConf = {
  outerColsRatio: 0.45,
  outerRowsRatio: 0.4,
  outerStartXRatio: 0.3,
  cols: 300, rows: 250
};
export {dwarvenCityConf};

const TILE_SIZE = 7;

/* Creates the level for the dwarven city. Uses mainly Castle tiles and mountain
 * walls to create the level.
 */
export class DwarvenCity {

    public level: Level;

    constructor(cols, rows, conf = dwarvenCityConf) {
      const wallOpts = {
        meanWy: Math.floor(0.85 * rows / 2),
        stdDev: 10,
        filterW: 7
      };

      const factLevel = new FactoryLevel();
      const mainLevel = factLevel.createLevel('wall', cols, rows, wallOpts);

      // Entrance level (southern fortress)
      const outerColsRatio = conf.outerColsRatio || 0.35;
      const outerRowsRatio = conf.outerRowsRatio || 0.35;
      let outerCols = Math.round(outerColsRatio * cols);
      let outerRows = Math.round(outerRowsRatio * rows);
      outerCols = this.adjustToTileSize(outerCols);
      outerRows = this.adjustToTileSize(outerRows);

      const entrFortLevel = this.createEntryFortLevel(outerCols, outerRows);

      // Main level (northern fortress)
      const mainCols = outerCols + 2 * 7;
      const mainRows = outerRows + 2 * 7;
      const mainFortLevel = this.createMainFortLevel(mainCols, mainRows);

      const fortStartY = 10;
      const fortEndY = mainRows + outerRows;
      const fortStartX = Math.ceil((cols - mainFortLevel.getMap().cols) / 2);
      const fortEndX = cols - fortStartX;

      // Empty level to ensure city can be accessed
      const passageLevel = factLevel.createLevel('empty', 14, 50);

      // Tile all levels together into mainLevel
      const tileConf = {
        centerY: false, centerX: true,
        y: fortStartY, x: 0
      };

      const tiledLevels = [mainFortLevel, entrFortLevel, passageLevel];

      Geometry.tileLevels(mainLevel, tiledLevels, tileConf);

      // Bounding box for fort levels
      const bbox = {
          ulx: fortStartX, uly: fortStartY,
          lrx: fortEndX, lry: fortEndY
      };
      this.addItemsAndActors(mainLevel, bbox);

      this.addStairsToLevel(cols, rows, mainLevel);

      this.level = mainLevel;
    }

    public adjustToTileSize(number) {
      while (number % TILE_SIZE !== 0) {
        ++number;
      }
      if (number % (2 * TILE_SIZE) === 0) {
        number += TILE_SIZE;
      }
      return number;
    }

    /* Returns the main fort level with created side-castles. Dimensions of the
     * main fort must be given. */
    public createMainFortLevel(cols, rows): Level {
      const fortConf = {
          startRoomFunc: Castle.startFuncFourGates
      };
      const mapGen = new MapGenerator();

      const mainFort = mapGen.createCastleWall(cols, rows, fortConf);

      const castleCols = cols - 6 * 7;
      const castleRows = rows - 4 * 7;
      const innerCastle = mapGen.createCastle(castleCols, castleRows,
        {roomCount: -1, nGates: 2});
      const castleLevel = new Level();
      castleLevel.setMap(innerCastle.map);
      Geometry.mergeMapBaseElems(mainFort.map,
          innerCastle.map, 3 * 7, 2 * 7);

      const mainFortLevel = new Level();
      mainFortLevel.setMap(mainFort.map);

      const mainFortWest = mapGen.createCastle(7 * 7, 5 * 7,
          {startRoomFunc: Castle.startRoomFuncEast,
            roomCount: -1, genParams: [1, 1, 1, 1]}
      );
      const mainFortEast = mapGen.createCastle(7 * 7, 5 * 7,
          {startRoomFunc: Castle.startRoomFuncWest,
            roomCount: -1, genParams: [1, 1, 1, 1]}
      );

      const mainFortWestLevel = new Level();
      mainFortWestLevel.setMap(mainFortWest.map);
      const mainFortEastLevel = new Level();
      mainFortEastLevel.setMap(mainFortEast.map);

      const mainFortLevels = [mainFortWestLevel, mainFortLevel,
        mainFortEastLevel];

      const wrapConf = {centerY: true, baseElem: ELEM.WALL};
      return LevelUtils.wrapAsLevel(mainFortLevels, wrapConf);
    }

    /* Returns the first entrance fort. */
    public createEntryFortLevel(cols, rows): Level {
      const mapGen = new MapGenerator();
      const outerFortConf = {
          startRoomFunc: Castle.startFuncFourGates
      };

      const outerFort = mapGen.createCastleWall(cols, rows,
        outerFortConf);

      const castleCols = cols - 6 * 7;
      const castleRows = rows - 6 * 7;
      const innerCastle = mapGen.createCastle(castleCols, castleRows,
        {nGates: 2, roomCount: -1});
      const castleLevel = new Level();
      castleLevel.setMap(innerCastle.map);
      Geometry.mergeMapBaseElems(outerFort.map, innerCastle.map,
          3 * 7, 3 * 7);

      const smallFortWest = mapGen.createCastleWall(3 * 7, 3 * 7,
        {startRoomFunc: Castle.startRoomFuncEast}
      );
      const smallFortEast = mapGen.createCastleWall(3 * 7, 3 * 7,
        {startRoomFunc: Castle.startRoomFuncWest}
      );

      const entryFortLevel = new Level();
      entryFortLevel.setMap(outerFort.map);

      const fortWestLevel = new Level();
      fortWestLevel.setMap(smallFortWest.map);
      const fortEastLevel = new Level();
      fortEastLevel.setMap(smallFortEast.map);

      const subLevels = [fortWestLevel, entryFortLevel, fortEastLevel];
      const wrapConf = {centerY: true, baseElem: ELEM.WALL};
      return LevelUtils.wrapAsLevel(subLevels, wrapConf);

    }

    /* Adds actors and items into the level using bbox as constraint.
     * This guarantees that everything's placed inside the fort. */
    public addItemsAndActors(level, bbox): void {
      const parser = ObjectShell.getParser();
      const freeCells = level.getMap().getFreeInBbox(bbox);

      const actorConf = {
          fighter: 200, axeman: 100,
          elite: 50, rifleman: 50,
          commander: 20
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
      Placer.addPropsToCells(level, freeCells, actors, RG.TYPE_ACTOR);

      // Add items, avoid placing anything to "hallways" of castles
    }

    public getLevel(): Level {
      return this.level;
    }

    public addStairsToLevel(cols, rows, level): void {
        const midX = Math.floor(cols / 2);
        const stairsNorth = new ElementStairs('stairsUp', level);
        level.addStairs(stairsNorth, midX, 0);
        const stairsSouth = new ElementStairs('stairsUp', level);
        level.addStairs(stairsSouth, midX, rows - 1);
    }

}
