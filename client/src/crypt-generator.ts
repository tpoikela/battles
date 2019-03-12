
import RG from './rg';
import {LevelGenerator} from './level-generator';
import {MapGenerator} from './map.generator';
import {Level} from './level';

export interface CryptOpts {
    preserveMarkers: boolean;
    tilesX: number;
    tilesY: number;
    genParams: [number, number, number, number];
    roomCount: number;
    maxValue: number;
    maxDanger: number;
}

type PartialCryptOpts = Partial<CryptOpts>;

/* Class for generating crypt levels. */
export class CryptGenerator extends LevelGenerator {

    public static getOptions(): CryptOpts {
        return {
            preserveMarkers: true,
            tilesX: 12, tilesY: 7,
            genParams: [2, 2, 2, 2],
            roomCount: 40,
            maxDanger: 1, maxValue: 50
        };
    }

    constructor() {
        super();
        this.shouldRemoveMarkers = true;
    }


    public create(cols, rows, conf: PartialCryptOpts): Level {
        return this.createLevel(cols, rows, conf);
    }

    public createLevel(
        cols: number, rows: number, conf: PartialCryptOpts
    ): Level {
        const mapgen = new MapGenerator();
        const level = new Level();
        mapgen.setGen('crypt', cols, rows);
        // TODO adjust crypt size based on cols/rows
        const mapObj = mapgen.createCryptNew(cols, rows, conf);
        level.setMap(mapObj.map);
        return level;
    }

}
