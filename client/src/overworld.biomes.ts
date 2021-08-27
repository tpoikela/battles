
/* Code to generate overworld biomes. */


import {ELEM} from '../data/elem-constants';
import {Noise} from './noise';

type Level = import('./level').Level;
type OWMap = import('./overworld.map').OWMap;

const TEMP_HIGH = 1.45;
const TEMP_LOW = 0.85;
const MOUNT_WALL = 5.0; // Elevation for huge mountain walls

const MOIST_SWAMP = 0.55;

const WATER_LEVEL = 0.6;
const GAP = 0.3;
const TREE_LEVEL_MIN = WATER_LEVEL + 1 * GAP;
const TREE_LEVEL_MAX = WATER_LEVEL + 2 * GAP;

export class OWBiomes {

    public static debug: boolean;

    public static addBiomes(ow: OWMap, level: Level, conf={}): void {
        const debug = OWBiomes.debug;
        const elevNoise = new Noise();
        const tempNoise = new Noise();
        const moistNoise = new Noise();

        // const elevMap: number[][] = [];
        const _map = level.getMap()._map;
        const {cols, rows} = level.getMap();

        const elemOctaves = [1, 2, 4];
        let maxElev = 0;
        elemOctaves.forEach((n: number) => {
            maxElev += (1.0 / n);
        });

        for (let x = 0; x < cols; x++) {
            // noiseMap.push([]);
            for (let y = 0; y < rows; y++) {
                let elev = _map[x][y].isFree() ? 0 : MOUNT_WALL;
                let temp = getTemp(x, y, cols, rows);

                const moist = (moistNoise.get(x / 10, y / 10)
                    + 0.5 * moistNoise.get(x / 20, y / 20)) / 1.5;

                /*
                elev += ((elevNoise.get(x / 20, y / 20))
                    + (0.5 * elevNoise.get(x / 8, y / 8))) / 1.5;
                */
                //elev = elevNoise.getOctaves(x, y, elemOctaves);
                //elev = Math.pow(elev, 1.00);
                elev += elevNoise.getOctavesDiv(x, y, [[1.0, 20], [0.5, 8], [0.25, 1]]);
                /*
                const elevHarm = (1.0 * elevNoise.get(x, y))
                    + (0.5 * elevNoise.get(2 * x, 2 * y))
                    + (0.25 * elevNoise.get(4 * x, 4 * y));
                elev += Math.sqrt(Math.pow(elevHarm, 1.07));
                */

                if (debug) {
                    console.log(x, y, 'temp before:', temp);
                }
                temp += (tempNoise.get(x, y)) * 0.1;
                if (debug) {
                    console.log('temp after:', temp);
                }

                if (elev < MOUNT_WALL) {
                    _map[x][y].setBaseElem(biome(elev, moist, temp));
                }

            }

        }

    }
}

OWBiomes.debug = false;

function getTemp(x: number, y: number, cols: number, rows: number): number {
    return 2.0 * (y / (rows - 1)) - 0.3 * x / (cols - 1);
}

function biome(elev: number, moist: number, temp: number): any {
    if (elev < WATER_LEVEL) {
        if (temp < TEMP_LOW) {
            return ELEM.WATER_FROZEN;
        }
        else {
            if (elev < (WATER_LEVEL - 0.2)) {
                return ELEM.DEEP_WATER;
            }
            else if (elev < (WATER_LEVEL - 0.1)) {
                return ELEM.WATER;
            }
            return ELEM.SHALLOW_WATER;
        }
    }
    else if (elev <= (WATER_LEVEL + GAP)) {
        if (temp < TEMP_LOW) {
            return ELEM.SNOW;
        }
        else {
            return ELEM.FLOOR;
        }
    }
    else if (elev > TREE_LEVEL_MIN && elev < TREE_LEVEL_MAX) {
        if (moist < 0.1) {
            if (temp < TEMP_LOW) {
                return ELEM.SNOW;
            }
            else {
                return ELEM.FLOOR;
            }
        }
        else {
            if (temp < TEMP_LOW) {
                return ELEM.TREE_SNOW;
            }
            else if (temp > TEMP_HIGH) {
                if (moist >= MOIST_SWAMP) {
                    return ELEM.SWAMP;
                }
                return ELEM.TREE;
            }
            else {
                return ELEM.TREE;
            }
        }
    }
    else if (elev < MOUNT_WALL) {
        if (temp < TEMP_LOW) {
            if (elev < (TREE_LEVEL_MAX + 0.15)) {
                return ELEM.SNOWY_CLIFF;
            }
            else if (elev < (TREE_LEVEL_MAX + 0.25)) {
                return ELEM.STONE_SNOW;
            }
            else {
                return ELEM.FROZEN_STEEP_CLIFF;
            }
        }
        else {
            if (elev < (TREE_LEVEL_MAX + 0.15)) {
                return ELEM.CLIFF;
            }
            else if (elev < (TREE_LEVEL_MAX + 0.25)) {
                return ELEM.STONE;
            }
            else {
                return ELEM.STEEP_CLIFF;
            }
        }
    }

}
