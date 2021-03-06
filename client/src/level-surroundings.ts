/* Code to create a surroundings for a level. This is useful for example
 * if city is close to water or mountain, and those features must
 * be added around the city. */
import RG from './rg';
import {Geometry} from './geometry';
import {Random} from './random';
import {Level} from './level';
import {CellMap} from './map';
import {MapGenerator} from './generator';
import {ELEM} from '../data/elem-constants';

import {TCoord} from './interfaces';
type BBox = import('./bbox').BBox;

const RNG = Random.getRNG();

export class LevelSurroundings {

    public offsetFunc: (x, y) => TCoord;
    public adjustCoord: (xy: TCoord[]) => TCoord[];
    public lastLevelID: number;

    /* Surrounds the given level with features based on different params:
     * conf: {
     *     surroundX,surroundY: <size of the padding>
     *     cellsAround: {N: 'water', S: 'wallmount', E: 'snow' ...}
     * }
     */
    public surround(level: Level, conf): null | Level {
        if (conf.cellsAround) {
            return this.surroundWithCellsAround(level, conf);
        }
        const json = JSON.stringify(conf);
        RG.err('LevelSurroundings', 'surround',
            `No conf given for surround. Got: ${json}`);
        return null;
    }

    public surroundWithCellsAround(level: Level, conf): Level {
        const xSize = 2 * conf.surroundX || 2 * 10;
        const ySize = 2 * conf.surroundY || 2 * 10;

        const {cols, rows} = level.getMap();
        const colsArea = cols + xSize;
        const rowsArea = rows + ySize;
        const {cellsAround} = conf;

        const mapgen = new MapGenerator();
        let chosenMap = null;
        if (this.hasAnyMountains(cellsAround)) {
            const wallConf: any = this.getWallConfFromCells(conf, xSize, ySize);
            const mapObj = mapgen.createWall(colsArea, rowsArea, wallConf);
            chosenMap = mapObj.map;
        }
        else {
            const emptyMap = new CellMap(colsArea, rowsArea);
            chosenMap = emptyMap;
        }
        const mountLevel = new Level(chosenMap);

        const skipTypes = {wallmount: true};

        Object.keys(cellsAround).forEach(dir => {
            if (cellsAround[dir] === 'water') {
                const lakeConf = {
                    ratio: 0.6, skipTypes,
                    forestSize: 300, nForests: 10
                };
                const bbox: null | BBox = Geometry.dirToBbox(colsArea, rowsArea, dir);
                if (bbox) {
                    mapgen.addLakes(mountLevel.getMap(), lakeConf, bbox);
                }
                else {
                    RG.err('LevelSurroundings', 'surroundWithCellsAround',
                        `Received null bbox from dir ${dir}, if water`);
                }
            }
            else if (cellsAround[dir] === 'tree') {
                const forestConf = {ratio: 1, skipTypes, nForests: 10};
                const bbox: null | BBox = Geometry.dirToBbox(colsArea, rowsArea, dir);
                if (bbox) {
                    mapgen.addForest(mountLevel.getMap(), forestConf, bbox);
                }
                else {
                    RG.err('LevelSurroundings', 'surroundWithCellsAround',
                        `Received null bbox from dir ${dir}, if tree`);
                }
            }
        });

        Geometry.mergeLevels(mountLevel, level, xSize / 2, ySize / 2);

        // This can be used to adjust coord external to this object
        this.offsetFunc = (x, y) => [x + xSize / 2, y + ySize / 2];
        this.adjustCoord = (coord: TCoord[]): TCoord[] => (
            coord.map(xy => this.offsetFunc(xy[0], xy[1])
        ));
        this.lastLevelID = mountLevel.getID();
        return mountLevel;
    }

    /* TODO does not support E/W or N/S walls yet. */
    public getWallConfFromCells(conf, xSize, ySize): any {
        const {cellsAround} = conf;
        const wallConf: any = {};

        if (cellsAround.E === 'wallmount') {
            wallConf.alignHorizontal = 'right';
            wallConf.east = false;
            wallConf.west = false;
            wallConf.north = true;
            wallConf.south = true;
        }
        else if (cellsAround.W === 'wallmount') {
            wallConf.alignHorizontal = 'left';
            wallConf.east = false;
            wallConf.west = false;
            wallConf.north = true;
            wallConf.south = true;
        }

        if (cellsAround.N === 'wallmount') {
            wallConf.alignVertical = 'top';
            wallConf.east = true;
            wallConf.west = true;
        }
        else if (cellsAround.S === 'wallmount') {
            wallConf.alignVertical = 'bottom';
            wallConf.east = true;
            wallConf.west = true;
        }

        wallConf.meanWx = RNG.getUniformInt(5, xSize);
        wallConf.meanWy = RNG.getUniformInt(5, ySize);
        wallConf.wallElem = ELEM.WALL_MOUNT;
        return wallConf;
    }

    public hasAnyMountains(cellsAround): boolean {
        const values = Object.values(cellsAround);
        let hasMount = false;
        values.forEach((val: string) => {
            if (val === 'wallmount') {
                hasMount = true;
            }
        });
        return hasMount;
    }

    public scaleExtras(level: Level): void {
        if (this.lastLevelID !== level.getID()) {
            RG.err('LevelSurroundings', 'scaleExtras',
                'Previous surrounded level not given. Scaling will not work');
        }
        const extras = level.getExtras();
        const props = ['corridor', 'entrance', 'room', 'storeroom',
            'vault'];
        props.forEach(prop => {
            if (prop in extras) {
                this.scaleRooms(extras[prop] as any[]);
            }
        });

        if (extras.hasOwnProperty('houses')) {
            Object.values(extras.houses).forEach(house => {
                const bbox = house.getBbox();
                const [nX, nY] = this.offsetFunc(bbox.ulx, bbox.uly);
                house.adjustCoord(nX, nY);
            });
        }
    }

    /* Scales all Room objects to the new level. */
    public scaleRooms(rooms: any[]): void {
        rooms.forEach(room => {
            [room._x1, room._y1] = this.offsetFunc(room._x1, room._y1);
            [room._x2, room._y2] = this.offsetFunc(room._x2, room._y2);
        });
    }

    /* Returns non-blocking dirs assuming mountains will be the whole side
     * of cardinal direction. */
    public getNonBlockedDirs(cellsAround: {[key: string]: string}): string[] {
        const res: string[] = [];
        const dirBlocked: {[key: string]: boolean} = {};
        // Loop through cardinal dir first
        const dirs = ['N', 'S', 'E', 'W'];
        dirs.forEach(dir => {
            if (!cellBlocked(cellsAround[dir])) {
                res.push(dir);
            }
            else {
                dirBlocked[dir] = true;
            }
        });

        if (!dirBlocked.E && !dirBlocked.N && !cellBlocked(cellsAround.NE)) {
            res.push('NE');
        }
        if (!dirBlocked.W && !dirBlocked.N && !cellBlocked(cellsAround.NW)) {
            res.push('NW');
        }
        if (!dirBlocked.E && !dirBlocked.S && !cellBlocked(cellsAround.SE)) {
            res.push('SE');
        }
        if (!dirBlocked.W && !dirBlocked.S && !cellBlocked(cellsAround.SW)) {
            res.push('SW');
        }
        return res;
    }

}

function cellBlocked(type): boolean {
    switch (type) {
        case 'wallmount': return true;
        // case 'water': return true;
        default: return false;
    }
}
