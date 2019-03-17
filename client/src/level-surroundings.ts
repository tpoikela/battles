/* Code to create a surroundings for a level. This is useful for example
 * if city is close to water or mountain, and those features must
 * be added around the city. */
import RG from './rg';
import {Geometry} from './geometry';
import {Random} from './random';
import {Level} from './level';
import {CellMap} from './map';
import {MapGenerator} from './map.generator';
import {ELEM} from '../data/elem-constants';

const RNG = Random.getRNG();

export class LevelSurroundings {
    /* Surrounds the given level with features based on different params:
     * conf: {
     *     surroundX,surroundY: <size of the padding>
     *     cellsAround: {N: 'water', S: 'wallmount', E: 'snow' ...}
     * }
     */
    public surround(level: Level, conf): Level {
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
        const mountLevel = new Level();
        if (this.hasAnyMountains(cellsAround)) {
            const wallConf: any = this.getWallConfFromCells(conf, xSize, ySize);
            const mapObj = mapgen.createWall(colsArea, rowsArea, wallConf);
            mountLevel.setMap(mapObj.map);
        }
        else {
            const emptyMap = new CellMap(colsArea, rowsArea);
            mountLevel.setMap(emptyMap);
        }

        const skipTypes = {wallmount: true};

        Object.keys(cellsAround).forEach(dir => {
            if (cellsAround[dir] === 'water') {
                const lakeConf = {
                    ratio: 0.6, skipTypes,
                    forestSize: 300, nForests: 10
                };
                const bbox = Geometry.dirToBbox(colsArea, rowsArea, dir);
                mapgen.addLakes(mountLevel.getMap(), lakeConf, bbox);
            }
            else if (cellsAround[dir] === 'tree') {
                const forestConf = {ratio: 1, skipTypes, nForests: 10};
                const bbox = Geometry.dirToBbox(colsArea, rowsArea, dir);
                mapgen.addForest(mountLevel.getMap(), forestConf, bbox);
            }
        });

        Geometry.mergeLevels(mountLevel, level, xSize / 2, ySize / 2);
        return mountLevel;

    }

    public getWallConfFromCells(conf, xSize, ySize): any {
        const {cellsAround} = conf;
        const wallConf: any = {};
        if (cellsAround.N === 'wallmount') {
            wallConf.alignVertical = 'top';
        }
        else if (cellsAround.S === 'wallmount') {
            wallConf.alignVertical = 'bottom';
        }

        if (cellsAround.E === 'wallmount') {
            wallConf.alignHorizontal = 'right';
            wallConf.north = true;
            wallConf.south = true;
        }
        else if (cellsAround.W === 'wallmount') {
            wallConf.alignHorizontal = 'left';
            wallConf.north = true;
            wallConf.south = true;
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
}
