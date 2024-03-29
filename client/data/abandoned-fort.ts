/* Contains code to generate the abandoned fort. */

import RG from '../src/rg';
import {FactoryBase} from '../src/factory';
import {FactoryItem} from '../src/factory.items';
import {FactoryLevel} from '../src/factory.level';
import {ObjectShell} from '../src/objectshellparser';
import {Path} from '../src/path';
import {Builder} from '../src/builder';
import {Level} from '../src/level';
import * as Element from '../src/element';
import {Castle} from '../data/tiles.castle';
import {MapGenerator, CastleGenerator, MountainGenerator} from '../src/generator';
import {Geometry} from '../src/geometry';
import {BBox} from '../src/bbox';
import {ItemConf, ActorConf} from '../src/interfaces';
import {SpawnerActor} from '../src/actor.virtual';
import {Random} from '../src/random';
type BrainVirtual = import('../src/brain/brain.virtual').BrainSpawner;

const TILE_SIZE = 7;

const RNG = Random.getRNG();

export const abandonedFortConf = {
    outerColsRatio: 0.4,
    outerRowsRatio: 0.4,
    outerStartXRatio: 0.4,
    mountainWallRatio: 0.3,
    castleRowsRatio: 0.6,
    castleColsRatio: 0.6
};

export class AbandonedFort {

  public level: Level;

  constructor(cols: number, rows: number, conf) {
    if (!conf) {
        conf = abandonedFortConf;
    }
    const outerColsRatio = conf.outerColsRatio || 0.4;
    const outerRowsRatio = conf.outerRowsRatio || 0.4;
    const outerStartXRatio = conf.outerStartXRatio || 0.4;
    const mountainWallRatio = conf.mountainWallRatio || 0.3;

    const mainWallOpts = {
      meanWx: Math.floor(mountainWallRatio * cols),
      stdDev: 15, // 10,
      filterW: 7,
      north: true, south: true, east: false, west: false,
      alignHorizontal: 'right',
      wallType: 'wallcave',
    };

    const mountConf = {
        nRoadTurns: 0, snowRatio: 0.3
    };
    Object.assign(mountConf, MountainGenerator.getFaceOptions());
    mountConf.nRoadTurns = 0;
    const mainLevel = this.createLevel('mountain', cols, rows, mountConf);
    // mainLevel.debugPrintInASCII();
    const mainMap = mainLevel.getMap();

    const mapGen = new MapGenerator();
    const outerWallConf = {
        startRoomFunc: Castle.startRoomFuncWest
    };
    const outerCols = Math.round(outerColsRatio * cols);
    const outerRows = Math.round(outerRowsRatio * rows);

    const castleGen = new CastleGenerator();
    const outerWallLevel = castleGen.createLevel(outerCols, outerRows,
      outerWallConf);
    // outerWallLevel.debugPrintInASCII();

    const outerWallMap = outerWallLevel.getMap();
    const outerX = Math.round(outerStartXRatio * cols);
    const outerY = Math.round(rows / 2 - outerWallMap.rows / 2);
    // TODO why this merging was originally done?
    //Geometry.mergeLevels(mainLevel, outerWallLevel, outerX, outerY);

    const wallCols = Math.floor(cols / 2);
    const mountWall = this.createLevel('wall', wallCols, rows,
      mainWallOpts);
    const wallX = cols - mountWall.getMap().cols;
    const wallY = 0;
    // MapGenerator.addRandomSnow(mountWall.getMap(), 0.3);

    const mergeOpts = {skip: {floor: true}};
    Geometry.mergeLevels(mainLevel, mountWall, wallX, wallY, mergeOpts);
    MapGenerator.addRandomSnow(mainLevel.getMap(), 0.3);

    const castle = this.getCastleLevel(rows, cols, conf);
    // castle.debugPrintInASCII();
    const castleX = cols - castle.getMap().cols;
    const castleY = Math.round((rows - castle.getMap().rows) / 2);
    Geometry.mergeLevels(mainLevel, castle, castleX, castleY);

    // Add stairs for entrance and exit
    const midY = Math.floor(rows / 2);
    const stairsWest = new Element.ElementStairs('stairsUp', mainLevel);
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
    const stairsEast = new Element.ElementStairs('stairsDown', mainLevel);
    mainLevel.addStairs(stairsEast, sX, sY);

    const castleBbox = BBox.fromBBox({ulx: castleX, uly: castleY,
        lrx: castleX + castleCols - 1, lry: castleY + castleRows - 1
    });

    const parser = ObjectShell.getParser();
    const itemFact = new FactoryItem();

    // Add items to free cells inside the castle
    const castleFreeCells = mainMap.getFreeInBbox(castleBbox);
    const itemConf: ItemConf = {
        itemsPerLevel: 50, nLevel: 0,
        item: item => item.value >= 100 && item.value <= 200,
        maxValue: 500
    };
    itemFact.addItemsToCells(mainLevel, parser, castleFreeCells, itemConf);

    const fortActors = {'mighty raven': true, 'winter demon': true,
        'cryomancer': true, 'ice djinn': true, 'stormrider': true,
        'snow leopard': true};
    const actorConf: ActorConf = {
        actorsPerLevel: 500,
        actor: actor => fortActors.hasOwnProperty(actor.name),
        maxDanger: 15
    };

    const fact = new FactoryBase();
    fact.addNRandActors(mainLevel, parser, actorConf);

    this.createPathToFort(mainLevel, castleX);
    castleGen.populateStoreRooms(mainLevel, {
        actorFunc: shell =>
            shell.base === 'WinterBeingBase' ||
            shell.base === 'construct',
        maxDanger: 15,
        maxValue: 700, maxRarity: 7,
    });

    const markerConf = {
      markersPreserved: false, shouldRemoveMarkers: true,
    };
    castleGen.removeMarkers(mainLevel, markerConf);
    this.addWinterSpawner(mainLevel);
    this.level = mainLevel;
  }

  public getCastleLevel(rows, cols, conf) {
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

    const castleGen = new CastleGenerator();
    // const castle = this.createLevel('castle', castleCols, castleRows, castleOpts);
    const castle = castleGen.createLevel(castleCols, castleRows, castleOpts);
    return castle;

  }

  public createLevel(name: string, cols, rows, conf: any): Level {
      return new FactoryLevel().createLevel(name, cols, rows, conf);
  }


  public createPathToFort(level, castleX) {
    const map = level.getMap();
    const x0 = 0;
    const x1 = castleX + 1;
    const y0 = Math.floor(map.rows / 2);
    const y1 = Math.floor(map.rows / 2);
    this.createVariedPath(map, {x0, x1, y0, y1});
  }

  public createVariedPath(map, confObj) {
      const {x0, y0, x1, y1} = confObj;
      const dx = 20;
      let coord = [];
      let prevY = y0;
      for (let x = x0; x < x1; x += dx) {
        let xEnd = x + dx;
        let yEnd = y1 + RNG.getUniformInt(-20, 20);
        // Finishing coordinate
        if (xEnd >= x1) {
          xEnd = x1;
          yEnd = y1;
        }
        const segCoord = Path.getMinWeightPath(map, x, prevY, xEnd, yEnd);
        prevY = yEnd;
        coord = coord.concat(segCoord);
      }
      Builder.addPathToMap(map, coord);
  }

  public getLevel() {
    return this.level;
  }

  public addWinterSpawner(level: Level): void {
    const rows = level.getMap().rows;
    // Refactor: winterspawner
    const winterSpawner = new SpawnerActor('winter spawner');
    const placeConstraint = [
        {op: 'eq', value: 0, func: 'getX'},
        {op: 'eq', value: Math.round(rows/2), func: 'getY'}
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
    level.addVirtualProp(RG.TYPE_ACTOR, winterSpawner);
  }

}
