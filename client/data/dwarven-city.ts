
import RG from '../src/rg';
import {FactoryLevel} from '../src/factory.level';
import {Castle} from '../data/tiles.castle';
import {Placer} from '../src/placer';
import {Level} from '../src/level';
import {ElementStairs} from '../src/element';
import {
    MapGenerator,
    CastleGenerator,
    CityGenerator} from '../src/generator';
import {Geometry} from '../src/geometry';
import {ELEM} from './elem-constants';
import {ObjectShell} from '../src/objectshellparser';
import {LevelUtils} from '../src/level-utils';
import {House} from '../src/generator';
import {Room} from '../../lib/rot-js/map/features';

import {BBox} from '../src/bbox';
import {BaseActor} from '../src/actor';
import {SpawnerActor} from '../src/actor.virtual';
type BrainVirtual = import('../src/brain/brain.virtual').BrainSpawner;

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

    constructor(cols: number, rows: number, conf = dwarvenCityConf) {
      const wallOpts = {
        meanWy: Math.floor(0.85 * rows / 2),
        stdDev: 10,
        filterW: 7,
        wallType: 'wallcave',
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
      const mainCols = outerCols + 2 * TILE_SIZE;
      const mainRows = outerRows + 2 * TILE_SIZE;
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

      // console.log('mainFortLevel extras are now:', mainFortLevel.getExtras());
      const tiledLevels = [mainFortLevel, entrFortLevel, passageLevel];

      Geometry.tileLevels(mainLevel, tiledLevels, tileConf);

      // Bounding box for fort levels
      const bbox = BBox.fromBBox({
          ulx: fortStartX, uly: fortStartY,
          lrx: fortEndX, lry: fortEndY
      });
      this.addItemsAndActors(mainLevel, bbox);

      this.addStairsToLevel(cols, rows, mainLevel);

      const terms = mainLevel.getExtras().term as any[];
      mainLevel.addExtras('houses', roomsToHouses(terms));

      // Populate with shops/trainers/townsfolk
      const cityGen = new CityGenerator();
      const parser = ObjectShell.getParser();
      const populConf = {nShops: 4, parser};
      cityGen.populateCityLevel(mainLevel, populConf);

      // Refactor: winterspawner
      const winterSpawner = new SpawnerActor('winter spawner');
      const placeConstraint = [
          {op: 'eq', value: 0, func: 'getY'}
      ];
      const actorConstr = [
          {op: 'eq', value: 'WinterBeingBase', prop: 'base'},
          {op: 'gte', value: 5, prop: 'danger'},
      ];
      const brain = winterSpawner.getBrain() as BrainVirtual;
      brain.setConstraint(actorConstr);
      brain.setPlaceConstraint(placeConstraint);
      (brain as any).spawnProb = 0.10;
      (brain as any).spawnLeft = -1;
      mainLevel.addVirtualProp(RG.TYPE_ACTOR, winterSpawner);

      // Remove remaining markers
      const castleGen = new CastleGenerator();
      const markerConf = {
          markersPreserved: false, shouldRemoveMarkers: true,
      };
      castleGen.populateStoreRooms(mainLevel, {
          actorFunc: shell => shell.type === 'construct',
          maxDanger: 15,
          maxValue: 500, maxRarity: 5,
      });
      castleGen.removeMarkers(mainLevel, markerConf);

      this.level = mainLevel;
    }

    public adjustToTileSize(n: number): number {
      while (n % TILE_SIZE !== 0) {
        ++n;
      }
      if (n % (2 * TILE_SIZE) === 0) {
        n += TILE_SIZE;
      }
      return n;
    }

    /* Returns the main fort level with created side-castles. Dimensions of the
     * main fort must be given. */
    public createMainFortLevel(cols: number, rows: number): Level {
      const fortConf = {
          startRoomFunc: Castle.startFuncFourGates
      };
      const mapGen = new MapGenerator();

      const mainFort = mapGen.createCastleWall(cols, rows, fortConf);

      const castleCols = cols - 6 * TILE_SIZE;
      const castleRows = rows - 4 * TILE_SIZE;

      const castleGen = new CastleGenerator();
      const innerConf = {roomCount: -1, nGates: 4, models: 'residential',
          preserveMarkers: true,
      };
      const innerCastle = castleGen.createLevel(castleCols, castleRows, innerConf);

      const mainFortLevel = new Level(mainFort.map);
      Geometry.mergeLevels(mainFortLevel,
          innerCastle, 3 * TILE_SIZE, 2 * TILE_SIZE);

      const mainFortWestLevel = castleGen.createLevel(7 * TILE_SIZE, 5 * TILE_SIZE,
          {startRoomFunc: Castle.startRoomFuncEast,
            roomCount: -1, genParams: [1, 1, 1, 1]}
      );
      const mainFortEastLevel = castleGen.createLevel(7 * TILE_SIZE, 5 * TILE_SIZE,
          {startRoomFunc: Castle.startRoomFuncWest,
            roomCount: -1, genParams: [1, 1, 1, 1]}
      );

      //rm const mainFortWestLevel = new Level(mainFortWest.map);
      //rm const mainFortEastLevel = new Level(mainFortEast.map);
      const mainFortLevels = [mainFortWestLevel, mainFortLevel,
        mainFortEastLevel];

      const wrapConf = {centerY: true, baseElem: ELEM.WALL};
      return LevelUtils.wrapAsLevel(mainFortLevels, wrapConf);
    }

    /* Returns the first entrance fort. */
    public createEntryFortLevel(cols: number, rows: number): Level {
      const mapGen = new MapGenerator();
      const outerFortConf = {
          startRoomFunc: Castle.startFuncFourGates
      };

      const outerFort = mapGen.createCastleWall(cols, rows,
        outerFortConf);

      const castleCols = cols - 6 * TILE_SIZE;
      const castleRows = rows - 6 * TILE_SIZE;
      /*const innerCastle = mapGen.createCastle(castleCols, castleRows,
        {nGates: 2, roomCount: -1});*/
      const innerConf  = {nGates: 4, roomCount: -1, preserveMarkers: true};
      const castleGen = new CastleGenerator();
      const castleLevel = castleGen.createLevel(castleCols, castleRows, innerConf);

      const outerFortLevel = new Level(outerFort.map);
      Geometry.mergeLevels(outerFortLevel, castleLevel,
          3 * TILE_SIZE, 3 * TILE_SIZE);

        /*
      const smallFortWest = mapGen.createCastleWall(3 * TILE_SIZE, 3 * TILE_SIZE,
        {startRoomFunc: Castle.startRoomFuncEast}
      );
      */
      const fortWestLevel = castleGen.createLevel(3 * TILE_SIZE, 3 * TILE_SIZE,
        {startRoomFunc: Castle.startRoomFuncEast});

      const fortEastLevel = castleGen.createLevel(3 * TILE_SIZE, 3 * TILE_SIZE,
        {startRoomFunc: Castle.startRoomFuncWest}
      );

      //const entryFortLevel = new Level(outerFort.map);
      const entryFortLevel = outerFortLevel;
      // entryFortLevel.setMap(outerFort.map);

      // const fortWestLevel = new Level(smallFortWest.map);
      // fortWestLevel.setMap(smallFortWest.map);
      //rm const fortEastLevel = new Level(smallFortEast.map);
      // fortEastLevel.setMap(smallFortEast.map);

      const subLevels = [fortWestLevel, entryFortLevel, fortEastLevel];
      const wrapConf = {centerY: true, baseElem: ELEM.WALL};
      return LevelUtils.wrapAsLevel(subLevels, wrapConf);
    }

    /* Adds actors and items into the level using bbox as constraint.
     * This guarantees that everything's placed inside the fort. */
    public addItemsAndActors(level: Level, bbox: BBox): void {
      const parser = ObjectShell.getParser();
      const freeCells = level.getMap().getFreeInBbox(bbox);

      const actorConf = {
          fighter: 200, axeman: 100,
          elite: 50, rifleman: 50,
          commander: 20
      };
      const actors: BaseActor[] = [];
      Object.keys(actorConf).forEach(key => {
        const name = `dwarven ${key}`;
        const num = actorConf[key];
        for (let i = 0; i < num; i++) {
            const actor = parser.createActor(name);
            actors.push(actor);
        }
      });
      Placer.addPropsToCells(level, freeCells, actors);

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


function roomsToHouses(rooms: Room[]): House[] {
    const res: House[] = [];
    const elemMap = {
        door: '+', floor: ':', wall: '#',
    };
    rooms.forEach(room => {
        if (!room.hasDoor()) {
            RG.err('DwarvenCity', 'roomsToHouses',
                'No Door in room: ' + JSON.stringify(room))
        }
        const roomMap = room.toMap(elemMap);
        //rm console.log('ID:', room.getID(), 'roomMap is:\n', roomMap.join('\n'));
        const house = new House(roomMap);
        house.adjustCoord(room.getLeft(), room.getTop());

        res.push(house);
        //rm console.log('New HouseMap is: \n', house.map.join('\n'));
    });
    return res;
}
