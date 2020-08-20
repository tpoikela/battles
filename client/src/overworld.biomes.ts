
/* Code to generate overworld biomes. */


import * as ROT from '../../lib/rot-js';
import {ELEM} from '../data/elem-constants';

type Level = import('./level').Level;
type OWMap = import('./overworld.map').OWMap;

const Simplex = ROT.Noise.Simplex;

const TEMP_LOW = 0.85;
const MOUNT_WALL = 5.0; // Elevation for huge mountain walls

export class OWBiomes {

    public static debug: boolean;

    public static addBiomes(ow: OWMap, level: Level): void {
        const debug = OWBiomes.debug;
        const elevNoise = new Simplex();
        const tempNoise = new Simplex();
        const moistNoise = new Simplex();

        const elevMap: number[][] = [];
        const _map = level.getMap()._map;
        const {cols, rows} = level.getMap();

        for (let x = 0; x < cols; x++) {
            // noiseMap.push([]);
            for (let y = 0; y < rows; y++) {
                let elev = _map[x][y].isFree() ? 0 : MOUNT_WALL;
                let temp = getTemp(x, y, cols, rows);

                const moist = (moistNoise.get(x / 10, y / 10) + 1.0
                    + 0.5 * moistNoise.get(x / 20, y / 20) + 0.5) / 1.5;
                elev += ((elevNoise.get(x / 20, y / 20) + 1.0)
                    + (0.5 * elevNoise.get(x / 8, y / 8) + 0.5)) / 1.5;
                /*
                const elevHarm = (1.0 * elevNoise.get(x, y) + 1.0)
                    + (0.5 * elevNoise.get(2 * x, 2 * y) + 0.5)
                    + (0.25 * elevNoise.get(4 * x, 4 * y) + 0.25);
                elev += Math.sqrt(Math.pow(elevHarm, 1.07));
                */

                if (debug) {
                    console.log(x, y, 'temp before:', temp);
                }
                temp += (tempNoise.get(x, y) + 1.0) * 0.1;
                if (debug) {
                    console.log('temp after:', temp);
                }

                if (elev < MOUNT_WALL) {
                    if (x === (cols - 1)) {
                        console.log('Found border x @', x, y, 'elev is', elev);
                    }
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
    elev -= 0.2;
    if (elev < 0.3) {
        if (temp < TEMP_LOW) {
            return ELEM.WATER_FROZEN;
        }
        else {
            return ELEM.WATER;
        }
    }
    else if (elev <= 0.5) {
        if (temp < TEMP_LOW) {
            return ELEM.SNOW;
        }
        else {
            return ELEM.FLOOR;
        }
    }
    else if (elev > 0.5 && elev < 1.0) {
        if (moist < 1.0) {
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
            else {
                return ELEM.TREE;
            }
        }
    }
    else if (elev < MOUNT_WALL) {
        if (temp < TEMP_LOW) {
            return ELEM.SNOW;
        }
        else {
            return ELEM.FLOOR;
        }
    }

}
