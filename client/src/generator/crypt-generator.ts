
import {LevelGenerator, ILevelGenOpts} from './level-generator';
import {MapGenerator} from './map.generator';
import {Level} from '../level';

export interface CryptOpts extends ILevelGenOpts {
    tilesX: number;
    tilesY: number;
    genParams: [number, number, number, number];
    roomCount: number;
}

type PartialCryptOpts = Partial<CryptOpts>;

/* Class for generating crypt levels. */
export class CryptGenerator extends LevelGenerator {

    public static getOptions(): CryptOpts {
        let opts = LevelGenerator.getOptions() as CryptOpts;
        opts = Object.assign(opts, {
            tilesX: 12, tilesY: 7,
            genParams: [2, 2, 2, 2],
            roomCount: 40
        });
        return opts;
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
        mapgen.setGen('crypt', cols, rows);
        // TODO adjust crypt size based on cols/rows
        const mapObj = mapgen.createCryptNew(cols, rows, conf);
        const level = new Level(mapObj.map);
        return level;
    }

}
