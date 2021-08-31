
import RG from '../rg';
import {LevelGenerator, ILevelGenOpts} from './level-generator';
import {DungeonGenerator} from './dungeon-generator';
import {CaveGenerator} from './cave-generator';
import {MapGenerator} from './map.generator';
import {Level} from '../level';
import {DungeonPopulate} from '../dungeon-populate';

type FactoryZone = import('../factory.zone').FactoryZone;

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
            roomCount: 40,
            wallType: 'wallcrypt',
            floorType: 'floorcrypt',

        });
        return opts;
    }

    public factZone?: FactoryZone;

    constructor() {
        super();
        this.shouldRemoveMarkers = true;
    }


    public create(cols: number, rows: number, conf: PartialCryptOpts): Level {
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

        // Create Room object for each tile (required by some algorithms)
        LevelGenerator.tilesToRooms(level, mapObj);

        DungeonGenerator.addStairsToTwoRooms(level);
        DungeonGenerator.addCriticalPath(level);

        if (this.factZone) {
            this.factZone.addExtraDungeonFeatures(level, conf);
        }
        else {
            RG.err('CryptGenerator', 'createLevel',
                'this.factZone must be assigned first');
        }
        const populate = new DungeonPopulate({
            theme: '',
            actorFunc: shell => shell.type === 'undead',
            maxDanger: conf.maxDanger, maxValue: conf.maxValue,
            itemFunc: shell => shell.type !== 'food',
        });
        // Populate the level with items/actors here
        populate.populateLevel(level);

        if (conf.nestProbability) {
            if (RG.isSuccess(conf.nestProbability!)) {
                CaveGenerator.embedNest(level, conf);
            }
        }

        const markerConf: any = {};
        if (conf.shouldRemoveMarkers) {
            markerConf.markersPreserved = false;
        }
        this.removeMarkers(level, markerConf);
        return level;
    }

}
