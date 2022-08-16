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
import {House} from './generator/house-generator';

import {ICellDirMap, TCoord} from './interfaces';
type BBox = import('./bbox').BBox;

const RNG = Random.getRNG();

type TSurroundData = [string, BBox[]];

const reCliffs = /\b(cliff|stone|steep cliff)\b/;

export class LevelSurroundings {

    public offsetFunc!: (x: number, y: number) => TCoord;
    public adjustCoord!: (xy: TCoord[]) => TCoord[];
    public lastLevelID!: number;

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
        const nMounts = this.hasNMountains(cellsAround);
        if (nMounts > 0) {
            const mergeOpts = {skip: {'floor': true}};
            const wallConf: any = this.getWallConfFromCells(conf, xSize, ySize);
            const mapObj = mapgen.createWall(colsArea, rowsArea, wallConf);
            chosenMap = mapObj.map;

            if (cellsAround.S === 'wallmount') {
                const sConf = {cellsAround: {S: 'wallmount'}};
                const sWallConf: any = this.getWallConfFromCells(sConf, xSize, ySize);
                console.log('Using SS wall conf', sWallConf);
                const sMapObj = mapgen.createWall(colsArea, rowsArea, sWallConf);
                console.log('before merge S');
                chosenMap.debugPrintInASCII();
                Geometry.mergeMapBaseElems(chosenMap, sMapObj.map, 0, 0, mergeOpts);
                console.log('after merge S');
                chosenMap.debugPrintInASCII();
            }

            if (cellsAround.W === 'wallmount') {
                const wConf = {cellsAround: {W: 'wallmount'}};
                const wWallConf: any = this.getWallConfFromCells(wConf, xSize, ySize);
                console.log('Using WW wall conf', wWallConf);
                const wMapObj = mapgen.createWall(colsArea, rowsArea, wWallConf);
                console.log('before merge W');
                chosenMap.debugPrintInASCII();
                Geometry.mergeMapBaseElems(chosenMap, wMapObj.map, 0, 0, mergeOpts);
                console.log('after merge W');
                chosenMap.debugPrintInASCII();
            }
        }
        else {
            const emptyMap = new CellMap(colsArea, rowsArea);
            chosenMap = emptyMap;
        }
        const mountLevel = new Level(chosenMap);

        const skipTypes = {wallmount: true};

        // COnvert each direction to bbox proportional to dir and the size of
        // level. For example, 30x30 level would create 10x10 bboxes
        const type2Bbox: {[key: string]: BBox[]} = {};
        Object.keys(cellsAround).forEach(dir => {
            let type = cellsAround[dir];
            // TODO: Add proper type remap for other types
            if (type.match(reCliffs)) {
                type = 'cliffs';
            }
            const bbox: null | BBox = Geometry.dirToBbox(colsArea, rowsArea, dir);
            if (bbox) {
                if (!type2Bbox[type]) {
                    type2Bbox[type] = [];
                }
                type2Bbox[type].push(bbox);
            }
            else {
                RG.err('LevelSurroundings', 'surroundWithCellsAround',
                    `Received null bbox from dir ${dir}, type ${type}`);
            }
        });

        // Combine same type of bboxes to create continuous regions, instead
        // of separate 8 small bboxes for each direction
        const surroundData: TSurroundData[] = [];
        Object.keys(type2Bbox).forEach((type: string) => {
            const boxes: BBox[] = type2Bbox[type];
            const combined: BBox[] = Geometry.combineAdjacent(boxes);
            surroundData.push([type, combined]);
        });

        surroundData.forEach((entry: TSurroundData) => {
            const [type, bboxes]: [string, BBox[]] = entry;
            bboxes.forEach((bbox: BBox) => {
                if (type === 'water') {
                    const lakeConf = {
                        ratio: 0.6, skipTypes,
                        forestSize: 300, nForests: 10
                    };
                    mapgen.addLakes(mountLevel.getMap(), lakeConf, bbox);
                }
                else if (type === 'tree') {
                    const forestConf = {ratio: 1, skipTypes, nForests: 10};
                    mapgen.addForest(mountLevel.getMap(), forestConf, bbox);
                }
                else if (type === 'cliffs') {
                    const mountConf = MapGenerator.getOptions('mountain');
                    mountConf.nRoadTurns = 0;
                    mountConf.highRockThr = 100; // No blocking cells
                    mountConf.snowRatio = 0;
                    mountConf.chasmThr = -100;
                    mountConf.skipTypes = skipTypes;
                    mapgen.addCliffs(mountLevel.getMap(), mountConf, bbox);
                }
                else if (type !== 'wallmount' && type !== 'floor') {
                    // If type matches element, do random splashes
                    const splashConf = {ratio: 0.85, skipTypes, forestSize: 200,
                        nForests: 10};
                    const elems = [type];
                    console.log('levSurr Adding splashes for elems', elems);
                    mapgen.addSplashes(mountLevel.getMap(), splashConf, bbox, elems);
                }
            });
        });

        if (dirsHaveElem(cellsAround, ['N', 'S', 'E', 'W'], 'wallmount')) {
            // Need to tunnel one corner, otherwise passage is blocked
            RG.DIAG_DIR_ABBR.forEach(dir => {
                if (cellsAround[dir] !== 'wallmount') {
                    const bbox: null | BBox = Geometry.dirToBbox(colsArea, rowsArea, dir);
                    if (bbox) {
                        let [x0, y0] = [bbox.ulx, bbox.uly];
                        let [x1, y1] = [bbox.lrx, bbox.lry];
                        const path = Geometry.getCaveConnLine(x0, y0, x1, y1);
                        console.log('path is now', path);
                        const map = mountLevel.getMap();
                        path.forEach(xy => {
                            if (map.hasXY(xy[0], xy[1])) {
                                map.setBaseElemXY(xy[0], xy[1], ELEM.FLOOR);
                            }
                        });
                    }
                }
            });
        }

        console.log('mountlevel');
        mountLevel.debugPrintInASCII();
        console.log('just level');
        level.debugPrintInASCII();
        const mOpts = {skip: {floor: true}};
        Geometry.mergeLevels(mountLevel, level, xSize / 2, ySize / 2, mOpts);

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

    public hasNMountains(cellsAround: ICellDirMap): number {
        const values = Object.values(cellsAround);
        let n = 0;
        values.forEach((val: string) => {
            if (val === 'wallmount') {
                ++n;
            }
        });
        return n;
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

        if (extras.houses) {
            extras.houses.forEach((house: House) => {
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
    public getNonBlockedDirs(cellsAround: ICellDirMap): string[] {
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

function dirsHaveElem(cells: ICellDirMap<string>, dirs: string[], type: string): boolean {
    let match = true;
    dirs.forEach((dir) => {
        if (cells[dir] !== type) {
            match = false;
        }
    });
    return match;
}
