
import RG from '../rg';
import {LevelGenerator, ILevelGenOpts} from './level-generator';
// import {Nests} from '../../data/tiles.nests';
import {ShellConstr} from '../interfaces';
import {MapGenerator, MapConf} from './map.generator';
import {Level} from '../level';
import {Placer} from '../placer';
import {Geometry} from '../geometry';
import {BBox} from '../bbox';
import {Random} from '../random';

type Cell = import('../map.cell').Cell;
type CellMap = import('../map').CellMap;

const RNG = Random.getRNG();

export interface NestOpts extends ILevelGenOpts {
    actorConstr: ShellConstr;
    mapConf: MapConf;
    embedOpts: {
        alwaysEmbed?: boolean; // Embed even if no free area
        level: Level; // Target level for embedding the nest
    };
}

type PartialNestOpts = Partial<NestOpts>;

export class NestGenerator extends LevelGenerator {

    public static getOptions(): NestOpts {
        const opts = LevelGenerator.getOptions() as NestOpts;
        opts.actorConstr = {
            roleTypes: ['assassin'],
            race: 'human'
        };
        opts.mapConf = {
            tilesX: 3,
            tilesY: 3,
            genParams: {x: [1, 1, 1], y: [1, 1, 1]},
            wallType: 'floor',
            floorType: 'floor'
        };
        return opts;
    }

    constructor() {
        super();
        // this.addDoors = true;
        // this.shouldRemoveMarkers = true;
    }

    public create(cols: number, rows: number, conf: PartialNestOpts): Level {
        const mapgen = new MapGenerator();
        const mapObj = mapgen.createNest(cols, rows, conf.mapConf);
        const level = new Level(mapObj.map);
        return level;
    }

    public createAndEmbed(cols: number, rows: number, conf: PartialNestOpts): boolean {
        if (!conf.embedOpts.level) {
            RG.err('NestGenerator', 'createAndEmbed',
                'No level in conf.embedOpts. Got: ' + JSON.stringify(conf));
        }
        const nestLevel: Level = this.create(cols, rows, conf);
        return this.embedIntoLevel(nestLevel, conf);
    }

    public embedIntoLevel(level: Level, conf: PartialNestOpts): boolean {
        const parentLevel: Level = conf.embedOpts.level;
        const map: CellMap = parentLevel.getMap();
        const cellFunc = (c: Cell) => !c.isFree();
        const [sizeX, sizeY] = level.getSizeXY();
        const bboxes: BBox[] = Placer.findCellArea(map, sizeX, sizeY, cellFunc);
        if (bboxes.length === 0) {return false;}

        const bbox = RNG.arrayGetRand(bboxes);
        // If we get a bbox, merge Nest level map with the parent level map
        if (bbox.getArea() > 0) {
            Geometry.mergeLevels(parentLevel, level, bbox.ulx, bbox.uly);
            return true;
        }
        else if (conf.embedOpts.alwaysEmbed) {
        }
        return false;
    }

}
