
/* Contains code to generate various types of caverns in the game.
 */

import RG from '../rg';
import {MapGenerator} from './map.generator';
import {NestGenerator, NestOpts} from './nest-generator';
import {Level, LevelExtras} from '../level';
// const Random = require('../random');
import {DungeonPopulate} from '../dungeon-populate';
import {LevelGenerator, ILevelGenOpts} from './level-generator';
import {Path} from '../path';
import {Geometry} from '../geometry';
import {Random} from '../random';
import {ELEM} from '../../data/elem-constants';
import * as Element from '../element';
import {TCoord, ConstBaseElem, ICoordXY, IMiner} from '../interfaces';

type Cell = import('../map.cell').Cell;
type CellMap = import('../map').CellMap;

const RNG = Random.getRNG();

const NEST_RACES = ['orc', 'naga', 'ratling', 'gnome', 'teradin', 'elf'];

const ElementMarker = Element.ElementMarker;

interface FreeCellMap {
    [key: string]: Cell;
}


export interface MinersMap {
    [key: string]: IMiner;
}


interface MapOpts {
    isCollapsed?: boolean;
    floorElem?: ConstBaseElem;
    startX?: number;
    startY?: number;
    dirWeights?: {[key: string]: number};
    addMiners?: IMiner[];
}

interface CaveOpts extends ILevelGenOpts {
    dungeonType: string;
    isCollapsed: boolean;
}

type PartialCaveOpts = Partial<CaveOpts>;


export class CaveGenerator extends LevelGenerator {
    public static getOptions(): CaveOpts {
        const opts = LevelGenerator.getOptions();
        return Object.assign(opts, {
            dungeonType: 'Lair',
            isCollapsed: false
        });
    }

    constructor() {
        super();
        this.shouldRemoveMarkers = true;
    }

    /* Main function to call when a cave is created. */
    public create(cols: number, rows: number, conf: PartialCaveOpts): Level {
        if (RG.isNullOrUndef([cols, rows])) {
            RG.err('CaveGenerator', 'create',
                `cols or rows not defined: cols: ${cols} / rows: ${rows}`);
        }
        const level = this._createLevel(cols, rows, conf);

        this.addStairsLocations(level);

        this._addSpecialFeatures(level);

        this._addEncounters(level, conf);

        this.embedNest(level, conf);

        this.removeMarkers(level, conf);
        return level;
    }

    /* Creates the Map.Level object with walls/floor and cave-flavor. */
    public _createLevel(cols: number, rows: number, conf): Level {
        const mapOpts: MapOpts = this._createMapOptions(cols, rows, conf);
        const mapgen = new MapGenerator();
        mapgen.setGen('cave', cols, rows);

        const mapObj = mapgen.createCave(cols, rows, mapOpts);
        const level = new Level(mapObj.map);
        this.setLevelExtras(level, mapObj.mapGen);
        if (mapOpts.isCollapsed) {
            level.getExtras().isCollapsed = true;
        }
        return level;
    }

    public setLevelExtras(level: Level, mapGen): void {
        const extras = mapGen.getMapData();
        // Need to uniquify start points
        extras.startPoints = RG.uniquifyCoord(extras.startPoints);
        level.setExtras(extras);
    }

    /* Creates the options how to generate the level map. This depends on the type
     * of cave that needs to be generated. */
    public _createMapOptions(cols, rows, conf): MapOpts {
        let {dungeonType} = conf;
        let opts: MapOpts = {};
        const miners = getMiners(cols, rows);

        dungeonType = dungeonType.capitalize();
        switch (dungeonType) {
            case 'Cave': opts = Miners.getRandOpts(cols, rows, 1, 3); break;
            case 'Grotto': opts = Miners.getRandOpts(cols, rows, 2, 4); break;
            case 'Lair': {
                const edgeMiners = Miners.getMinersAndExclude(cols, rows, ['C']);
                const edgeMiner = RNG.arrayGetRand(edgeMiners);
                const lairMiners = [edgeMiner, miners.C];
                opts = Miners.getOptsWithMiners(lairMiners);
                break;
            }
            case 'Cavern': opts = Miners.getRandOpts(cols, rows, 3, 9); break;
            default: opts = Miners.getRandOpts(cols, rows);
        }

        let isCollapsed = RNG.getUniform() <= 0.1;
        if (conf.isCollapsed === false) {
            isCollapsed = false;
        }
        if (isCollapsed || conf.isCollapsed) {
            opts.floorElem = ELEM.CHASM;
            opts.isCollapsed = true;
        }

        return opts;
    }

    public addStairsLocations(level: Level): void {
        const extras: LevelExtras = level.getExtras();
        const {startPoints} = extras;
        let startPoint = null;
        let endPoint = null;

        if (startPoints.length > 1) {
            [startPoint, endPoint] = RNG.getUniqueItems(startPoints, 2);
        }
        else {
            startPoint = startPoints[0];
            // End point must be determined from the map itself
            endPoint = this.getEndPointFromMap(level, startPoint);
        }

        this.addStartAndEndPoint(level, startPoint, endPoint);

        extras.startPoint = startPoint;
        if (endPoint) {extras.endPoint = endPoint;}

        // Process other points of interest
        const points = startPoints.slice();
        extras.points = [];
        points.splice(points.indexOf(startPoint), 1);
        points.splice(points.indexOf(endPoint), 1);
        points.forEach(point => {
            const [eX, eY] = point;
            const pointMarker = new ElementMarker('>');
            pointMarker.setTag('end_point');
            level.addElement(pointMarker, eX, eY);
            extras.points.push(point);
        });
    }

    /* Adds features like extra obstacles etc. */
    public _addSpecialFeatures(level: Level): void {
        if (level.getExtras().isCollapsed) {
            this._createCollapsedLevel(level);
        }
    }

    public getEndPointFromMap(level: Level, startPoint) {
        const map = level.getMap();
        const freeCellMap = this.getMapOfNonWallCells(level);
        return this.getRandomEndPoint(map, startPoint, freeCellMap);
    }

    public getMapOfNonWallCells(level: Level): FreeCellMap {
        const map = level.getMap();
        const nonWallCells = map.getCells(c => (
            !c.getBaseElem().isWall()
        ));
        const freeCellMap: FreeCellMap = {};
        nonWallCells.forEach(cell => {
            freeCellMap[cell.getKeyXY()] = cell;
        });
        return freeCellMap;
    }

    public _createCollapsedLevel(level) {
        const extras = level.getExtras();
        const map = level.getMap();
        let {endPoint} = extras;
        const {startPoint} = extras;

        const freeCellMap = this.getMapOfNonWallCells(level);

        if (!endPoint) { // Define random endpoint
            endPoint = this.getRandomEndPoint(map, startPoint, freeCellMap);
        }

        if (startPoint && endPoint) {
            const path = this.createPath(map, startPoint, endPoint);
            path.forEach(xy => {
                delete freeCellMap[xy[0] + ',' + xy[1]];
            });
        }

        // Add points used as digger start points
        const pathPoints = [startPoint, endPoint];
        if (extras.points) {
            extras.points.forEach(newPoint => {
                const otherPoint = RNG.arrayGetRand(pathPoints);
                const path = this.createPath(map, newPoint, otherPoint);
                path.forEach(xy => {
                    delete freeCellMap[xy[0] + ',' + xy[1]];
                });
                pathPoints.push(newPoint);
            });
        }

        // Add other misc points into the level
        const numPoints = RNG.getUniformInt(1, 10);
        for (let i = 0; i < numPoints; i++) {
            const newPoint = this.getRandomPoint(map, startPoint, freeCellMap);

            if (newPoint) {
                const otherPoint = RNG.arrayGetRand(pathPoints);
                const path = this.createPath(map, newPoint, otherPoint);
                path.forEach(xy => {
                    delete freeCellMap[xy[0] + ',' + xy[1]];
                });
                pathPoints.push(newPoint);
            }
        }

        // const nPoints = pathPoints.length;
    }

    public createPath(map: CellMap, startPoint: TCoord, endPoint: TCoord): TCoord[] {
        const wallCb = (x, y) => (
            map.hasXY(x, y) && !map.getBaseElemXY(x, y).getType().match(/wall/)
        );
        const [sX, sY] = startPoint;
        const [eX, eY] = endPoint;
        const path: ICoordXY[] = Path.getShortestPath(sX, sY, eX, eY, wallCb);

        const result: TCoord[] = [];

        path.forEach((xy: ICoordXY) => {
            const {x, y} = xy;
            const coord = Geometry.getCrossAround(x, y, 1, true);
            coord.forEach(coordXY => {
                const [cx, cy] = coordXY;
                const cell = map.getCell(cx, cy);
                if (cell.getBaseElem().getType() === 'chasm') {
                    map.setBaseElemXY(cx, cy, ELEM.FLOOR_CAVE);
                    result.push([cx, cy]);
                }
            });
        });

        return result;
    }

    public getRandomEndPoint(map, startPoint, freeCellMap: FreeCellMap): TCoord {
        const wallCb = (x, y) => (
            map.hasXY(x, y) && !map.getBaseElemXY(x, y).getType().match(/wall/)
        );
        const [sX, sY] = startPoint;
        let endPoint = null;

        const minDist = map.cols > map.rows ? map.rows : map.cols;
        let currDist = 0;
        let watchdog = 10;

        const freeCells: Cell[] = Object.values(freeCellMap);
        let currPath = null;

        while (currDist < minDist) {
            const endCell = RNG.arrayGetRand(freeCells);
            const [eX, eY] = endCell.getXY();
            endPoint = [eX, eY];
            currPath = Path.getShortestPath(eX, eY, sX, sY, wallCb);
            currDist = currPath.length;
            if (watchdog === 0) {break;}
            --watchdog;
        }

        // Delete each path cell from list of free cells
        if (endPoint && currPath) {
            currPath.forEach(xy => {
                const key = xy.x + ',' + xy.y;
                delete freeCellMap[key];
            });
        }

        return endPoint;
    }

    public getRandomPoint(map, startPoint, freeCellMap: FreeCellMap): TCoord {
        const wallCb = (x, y) => (
            map.hasXY(x, y) && !map.getBaseElemXY(x, y).getType().match(/wall/)
        );
        const [sX, sY] = startPoint;
        const freeCells: Cell[] = Object.values(freeCellMap);

        const endCell = RNG.arrayGetRand(freeCells);
        const [eX, eY] = endCell.getXY();
        const point = [eX, eY] as TCoord;
        const currPath = Path.getShortestPath(eX, eY, sX, sY, wallCb);

        // Delete each path cell from list of free cells
        if (point && currPath) {
            currPath.forEach(xy => {
                const key = xy.x + ',' + xy.y;
                delete freeCellMap[key];
            });
        }

        return point;
    }

    public _addEncounters(level: Level, conf) {
        const {dungeonType} = conf;
        if (dungeonType === 'Lair') {
            this._addLairBoss(level, conf);
        }

        this.populatePoints(level, conf);
    }

    public _addLairBoss(level: Level, conf) {
        const {maxDanger, maxValue} = conf;
        const endPoint = level.getExtras().endPoint;
        if (endPoint) {
            const populate = new DungeonPopulate({});
            if (level.getExtras().isCollapsed) {
                populate.setActorFunc(actor => actor.flying);
            }
            populate.addPointGuardian(level, endPoint, maxDanger + 4);
            populate.addMainLoot(level, endPoint, maxValue);
        }
        else {
            const json = JSON.stringify(level.getExtras());
            RG.err('CaveGenerator', '_addLairBoss',
                'No endPoint in extras: ' + json);
        }
    }

    /* Processes points of interest other than start/end points. */
    public populatePoints(level: Level, conf) {
        const extras = level.getExtras();
        const {points} = extras;
        const populate = new DungeonPopulate({});
        points.forEach(point => {
            populate.populatePoint(level, point, conf);
        });
    }

    public embedNest(level: Level, conf): boolean {
        const maxTries = 10;
        let numTries = 0;

        while (numTries < maxTries) {
            const tilesX = RNG.getUniformInt(2, 5);
            const tilesY = RNG.getUniformInt(2, 5);
            const nest = new NestGenerator();
            const nestConf: Partial<NestOpts> = {
                actorConstr: {
                    race: RNG.arrayGetRand(NEST_RACES)
                },
                mapConf: {
                    tilesX, tilesY,
                    genParams: {x: [1, 1, 1], y: [1, 1, 1]},
                    wallType: 'wallcave',
                    floorType: 'floorcave'
                },
                embedOpts: {level}
            };
            if (nest.createAndEmbed(tilesX * 7, tilesY * 7, nestConf)) {
                return true;
            }
            ++numTries;
        }
        return false;
    }
}

export const Miners: any = {};

/* Returns an object containing the base miners for different directions. */
function getMiners(cols: number, rows: number, border = 1): MinersMap {
    const midX = Math.round(cols / 2);
    const midY = Math.round(rows / 2);

    // Need -2 to preserve wall border of level
    const endX = cols - 1 - border;
    const endY = rows - 1 - border;

    const cbTerminateSouth = (x, y, miner) => {
        if (y === endY) {
            miner.dirWeights = {};
        }
    };
    const cbTerminateNorth = (x, y, miner) => {
        if (y === 1) {
            miner.dirWeights = {};
        }
    };

    const miners = {
        N: {x: midX, y: 1, dirWeights: {E: 1, W: 1, S: 5, SE: 5, SW: 5},
            dugCallback: cbTerminateSouth
        },
        S: {x: midX, y: endY, dirWeights: {E: 1, W: 1, N: 5, NE: 5, NW: 5},
            dugCallback: cbTerminateNorth
        },
        E: {x: endX, y: midY, dirWeights: {N: 1, S: 1, NW: 5, W: 5, SW: 5}},
        W: {x: 1, y: midY, dirWeights: {N: 1, S: 1, NE: 5, E: 5, SE: 5}},
        NE: {x: endX, y: 1, dirWeights: {NW: 1, W: 10, SW: 5, S: 10}},
        NW: {x: 1, y: 1, dirWeights: {NE: 1, E: 10, SE: 5, S: 10}},
        SE: {x: endX, y: endY, dirWeights: {SW: 1, W: 10, NW: 5, N: 10}},
        SW: {x: 1, y: endY, dirWeights: {SE: 1, E: 10, NE: 5, N: 10}},
        C: { // Central miner, all equal weights
            x: midX, y: midY,
            dirWeights: {N: 1, S: 1, E: 2, W: 2, NE: 1, SE: 1, NW: 1, SW: 1}
        }
    };
    return miners;
}
Miners.getMiners = getMiners;

function getMinersAndExclude(cols, rows, excluded) {
    const miners = getMiners(cols, rows);
    excluded.forEach(key => {delete miners[key];});
    return Object.values(miners);
}
Miners.getMinersAndExclude = getMinersAndExclude;

function getOptsWithMiners(miners): MapOpts {
    const firstMiner = miners[0];
    const opts: MapOpts = {
        startX: firstMiner.x, startY: firstMiner.y,
        dirWeights: firstMiner.dirWeights
    };
    const addMiners = [];
    for (let i = 1; i < miners.length; i++) {
        addMiners.push(miners[i]);
    }
    opts.addMiners = addMiners;
    return opts;
}
Miners.getOptsWithMiners = getOptsWithMiners;

/* Returns map options with random number of miners. */
function getRandOpts(cols, rows, min = 1, max = 9) {
    const miners = getMiners(cols, rows);
    const minerValues = Object.values(miners);

    const nMiners = RNG.getUniformInt(min, max);
    const randMiners = [];
    for (let i = 0; i < nMiners; i++) {
        const randMiner = RNG.arrayGetRand(minerValues);
        randMiners.push(randMiner);
    }
    return getOptsWithMiners(randMiners);
}
Miners.getRandOpts = getRandOpts;

/* Returns options with miners placed on corners. */
function getMinersCorners(cols, rows, miners) {
    if (!miners) {
        miners = getMiners(cols, rows);
    }
    const minersCorners = {
        cols, rows,
        // maxMinersCreated: 100,
        dirWeights: miners.NW.dirWeights,
        addMiners: [
            miners.SW,
            miners.NE,
            miners.SE
        ],
        startX: miners.NW.x, startY: miners.NW.y
    };
    return minersCorners;
}
Miners.getMinersCorners = getMinersCorners;

/* Returns options containing miners in each cardinal direction NSEW. */
function getMinersNSEW(cols, rows, miners) {
    if (!miners) {
        miners = getMiners(cols, rows);
    }
    const minersNSEW = {
        cols: 100, rows: 100,
        maxMinersCreated: 100,

        startX: miners.N.x, startY: miners.N.y,
        dirWeights: miners.N.dirWeights,

        addMiners: [
            miners.S,
            miners.E,
            miners.W
        ]
    };
    return minersNSEW;
}
Miners.getMinersNSEW = getMinersNSEW;
