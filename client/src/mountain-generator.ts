
/* Contains code for generating mountain levels. There are two mains levels to
 * generate:
 *   1. The climb part or Mountain
 *   2. The summit part
 */
import RG from './rg';
import {MapGenerator} from './map.generator';
import {Level} from './level';
import {Geometry} from './geometry';
import {Path} from './path';
import {DungeonPopulate} from './dungeon-populate';
import {Random} from './random';
import {ELEM} from '../data/elem-constants';

const RNG = Random.getRNG();

/*
const PROB = {
    actorGroup: 0.2
};

const preferredActorTypes = [
    'avian', 'animal', 'goblin', 'dwarf', 'wildling'
];
*/

export class MountainGenerator {

    public static options: {[key: string]: any}; // TODO fix typings

    static getSummitOptions() {
        return MountainGenerator.options.summit;
    }

    static getFaceOptions() {
        const mapOpts = MapGenerator.getOptions('mountain');
        const opts = Object.assign({}, mapOpts, MountainGenerator.options.face);
        // Usually overridden by top-level conf
        opts.maxDanger = 5;
        opts.maxValue = 100;
        return opts;
    }

    createFace(cols, rows, conf) {
        const mapgen = new MapGenerator();
        const level = new Level();
        mapgen.setGen('mountain', cols, rows);
        conf.nRoadTurns = 0;
        const mapObj = mapgen.createMountain(cols, rows, conf);
        // const {paths} = mapObj;
        level.setMap(mapObj.map);

        this.createCrux(level, conf);
        // level.setExtras({paths});
        // this.createExtraFeats(level, conf);
        return level;
    }

    createSummit(cols, rows, conf) {
        const mapgen = new MapGenerator();
        const level = new Level();
        mapgen.setGen('mountain', cols, rows);
        const mapObj = mapgen.createSummit(cols, rows, conf);
        level.setMap(mapObj.map);
        level.setExtras({});
        return level;
    }

    /* Creates the most difficult part of the level. */
    createCrux(level, conf) {
        const map = level.getMap();
        const cols = map.cols;
        const wallRows = Math.round(map.rows / 6);
        const wallConf = {
            wallElem: ELEM.HIGH_ROCK,
            meanWy: Math.round(wallRows / 2.5)
        };

        const mapgen = new MapGenerator();
        mapgen.setGen('wall', cols, wallRows);
        const wallMapObj = mapgen.createWall(cols, wallRows, wallConf);

        const wallMap = wallMapObj.map;

        // Carve a path through the wall
        const xTop = RNG.getUniformInt(0, cols - 1);
        const xBottom = RNG.getUniformInt(0, cols - 1);
        const carvedXY = this.carvePath(wallMap, xTop, 0, xBottom, wallRows - 1);

        const wallStartY = Math.round(map.rows / 5);
        const mergeCb = (c1, c2) => {
            // const baseElem1 = c1.getBaseElem();
            const baseElem2 = c2.getBaseElem();
            return !(/(floor)/).test(baseElem2.getType());
        };
        Geometry.mergeMaps(map, wallMap, 0, wallStartY, mergeCb);

        // Create a path which goes through the level
        /* const bbox = {bbox: {
            ulx: 0, uly: wallStartY, lrx: cols - 1, lry: wallStartY + wallRows - 1
        }};*/
        const pathConf = {
            // exclude: bbox,
            startX: 0,
            startY: 0, maxY: wallStartY,
            yPerTurn: Math.round(wallStartY / 4),
            endX: xTop
        };
        let paths = mapgen.createMountainPath(map, pathConf);

        pathConf.startY = wallStartY + wallRows;
        pathConf.maxY = map.rows - 1;
        pathConf.startX = xBottom;
        pathConf.yPerTurn = 0;
        paths = paths.concat(mapgen.createMountainPath(map, pathConf));

        level.addExtras('paths', paths);
        // Add some guardians to the crux points, offset Y-coord first
        carvedXY.forEach(xyCoord => {
            xyCoord[1] += wallStartY;
        });

        const nGuardians = 3;
        const dungPopul = new DungeonPopulate(conf);
        for (let i = 0; i < nGuardians; i++) {
            const guardPoint = RNG.arrayGetRand(carvedXY);
            dungPopul.addPointGuardian(level, guardPoint, conf.maxDanger);
        }
    }

    /* Adds extra features such as actor groups or buildings etc. into the
     * level. */
    /* MountainGenerator.prototype.createExtraFeats = function(level, conf) {
        const groupProb = RNG.getUniform();
        if (groupProb <= PROB.actorGroup) {
            const dungPopul = new DungeonPopulate(conf);

        }
    };*/

    /* Carves a path between x0,y0 and x1,y1 using a shortest distance. */
    carvePath(map, x0, y0, x1, y1) {
        const result = [];
        const path = Path.getShortestPath(x0, y0, x1, y1);
        path.forEach(xy => {
            const brush = Geometry.getCrossAround(xy.x, xy.y, 2, true);
            brush.forEach(xy => {
                const [x, y] = xy;
                if (map.hasXY(x, y)) {
                    result.push(xy);
                    map.setBaseElemXY(x, y, ELEM.STONE);
                }
            });
        });
        return result;
    }
}

MountainGenerator.options = {};

MountainGenerator.options.face = {

};

MountainGenerator.options.summit = {
    ratio: 0.3
};
