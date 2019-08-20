
import {LevelGenerator, ILevelGenOpts} from './level-generator';
import {Nests} from '../../data/tiles.nests';
import {ShellConstr} from '../interfaces';
import {MapGenerator, MapConf} from './map.generator';
import {Level} from '../level';

interface NestOpts extends ILevelGenOpts {
    actorConstr: ShellConstr;
    mapConf: MapConf;
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

}
