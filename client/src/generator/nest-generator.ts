
import RG from '../rg';
import {LevelGenerator, ILevelGenOpts} from './level-generator';
// import {Nests} from '../../data/tiles.nests';
import {TCoord, ShellConstr, IShell } from '../interfaces';
import {MapGenerator, MapConf} from './map.generator';
import {Level} from '../level';
import {Placer} from '../placer';
import {Geometry} from '../geometry';
import {BBox} from '../bbox';
import {Random} from '../random';
import {ELEM} from '../../data/elem-constants';
import {DungeonPopulate} from '../dungeon-populate';
import {ActorGen} from '../../data/actor-gen';
import {ObjectShell} from '../objectshellparser';
import {SentientActor} from '../actor';
import {EvaluatorGuardArea} from '../evaluators';
import {BrainGoalOriented} from '../brain';
import {ItemGen} from '../../data/item-gen';

type Cell = import('../map.cell').Cell;
type CellMap = import('../map').CellMap;

const RNG = Random.getRNG();

export interface NestOpts extends ILevelGenOpts {
    actorConstr: ShellConstr;
    mapConf: MapConf;
    embedOpts: {
        alwaysEmbed?: boolean; // Embed even if no free area
        level: Level; // Target level for embedding the nest
        bbox?: BBox; // Bbox for the nest
    };
}

type PartialNestOpts = Partial<NestOpts>;

export class NestGenerator extends LevelGenerator {

    public static getOptions(): NestOpts {
        const opts = LevelGenerator.getOptions() as NestOpts;
        opts.actorConstr = {
            // roleTypes: ['assassin'],
            race: 'orc'
        };
        opts.mapConf = {
            tilesX: 3,
            tilesY: 3,
            genParams: {x: [1, 1, 1], y: [1, 1, 1]},
            wallType: 'wall',
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
        // const {tiles} = mapObj; TODO
        const level = new Level(mapObj.map);
        level.updateLevelFromMap();
        return level;
    }

    /* Creates a new nest level and embeds it into the parent level. */
    public createAndEmbed(cols: number, rows: number, conf: PartialNestOpts): boolean {
        if (!conf.embedOpts || !conf.embedOpts.level) {
            RG.err('NestGenerator', 'createAndEmbed',
                'No level in conf.embedOpts. Got: ' + JSON.stringify(conf));
        }
        const nestLevel: Level = this.create(cols, rows, conf);
        return this.embedIntoLevel(nestLevel, conf);
    }

    /* Embeds the nestLevel into level given in conf.embedOpts.level. */
    public embedIntoLevel(nestLevel: Level, conf: PartialNestOpts): boolean {
        if (!conf.embedOpts) {
            RG.err('NestGenerator', 'embedIntoLevel',
                `conf.embedOpts must exist. Got: ${JSON.stringify(conf)}`);
            return false;
        }

        const parentLevel: Level = conf.embedOpts.level;
        const map: CellMap = parentLevel.getMap();
        const cellFunc = (c: Cell) => !c.isFree();
        const [sizeX, sizeY] = nestLevel.getSizeXY();
        let bbox = null;

        if (conf.embedOpts.bbox) {
            bbox = conf.embedOpts.bbox;
        }
        else {
            const bboxes: BBox[] = Placer.findCellArea(map, sizeX, sizeY, cellFunc);
            if (bboxes.length === 0) {return false;}
            bbox = RNG.arrayGetRand(bboxes);
        }

        // If we get a bbox, merge Nest level map with the parent level map
        if (bbox.getArea() > 0) {
            console.log('XYZ NEST:');
            nestLevel.debugPrintInASCII();
            Geometry.mergeLevels(parentLevel, nestLevel, bbox.ulx, bbox.uly);
            console.log('XYZ PARENT:');
            parentLevel.debugPrintInASCII();
            // 1. Should connect the nest to remaining level now
            if (this.connectNestToParentLevel(parentLevel, bbox)) {

                this.addElemsToNestArea(parentLevel, bbox, conf);
                // 2. Here we can populate the nest area now
                this.populateNestArea(parentLevel, bbox, conf);

                // 3. Add items/loot to the area
                this.addLootToNestArea(parentLevel, bbox, conf);
                return true;
            }
            else {
                RG.warn('NestGenerator', 'embedIntoLevel',
                    'Nest was merged into parent, but no connection was done');
            }
        }
        else if (conf.embedOpts && conf.embedOpts.alwaysEmbed) {
            // TODO embedding will overwrite some existing cells
        }
        return false;
    }

    /* Adds a connection between nest and parent. Returns false if unsuccesful.
     * */
    public connectNestToParentLevel(parentLevel: Level, bbox: BBox): boolean {
        const map: CellMap = parentLevel.getMap();
        let dir: string = '';
        const [sizeX, sizeY] = parentLevel.getSizeXY();
        // 1. For y, if uly < sizeY/2, connect S side of nest
        // 2. For y, if uly > sizeX/2, connect N side of nest
        if (bbox.uly < sizeY / 2) {dir += 'S';}
        else if (bbox.uly >= sizeY / 2) {dir += 'N';}
        // 3. For x, if ulx < sizeX/2, connect E side of nest
        // 4. For x, if ulx > sizeX/2, connect W side of nest
        if (bbox.ulx < sizeX / 2) {dir += 'E';}
        else if (bbox.ulx >= sizeX / 2) {dir += 'W';}

        // Select dir for tunneling, could try another if 1st fails
        const possibleDirs: string[] = dir.split('');
        possibleDirs.push(dir);

        while (possibleDirs.length > 0) {
            const chosenDir = RNG.arrayGetRand(possibleDirs);
            possibleDirs.splice(possibleDirs.indexOf(chosenDir), 1);

            let cells: Cell[] = [];
            let coord: TCoord[] = [];
            let adjust = 0;
            const maxSearchDepth = 5; // How deep into bbox we search
            while (cells.length === 0) {
                coord = bbox.getBorderXY(chosenDir, adjust++);
                cells = map.getCellsWithCoord(coord);
                cells = cells.filter(c => c.isFree());
                if (adjust > maxSearchDepth) {
                    break;
                }
            }

            if (cells.length > 0) {
                const tunnelCoord: TCoord[] = [];
                if (this.getCoordForTunnel(cells, map, chosenDir, tunnelCoord)) {
                    map.setBaseElems(tunnelCoord, ELEM.FLOOR);
                    return true;
                }
            }
        }
        return false;
    }


    /* Returns true if coordinates are found for tunneling. They will be pushed
     * into tunnelCoord in that case. */
    public getCoordForTunnel(
        cells: Cell[], map: CellMap, dir: string, tunnelCoord: TCoord[]
    ): boolean {
        let chosenCell: null | Cell = null;
        const freeCells: Cell[] = cells; // cells already filtered with isFree()
        if (freeCells.length > 0) {
            chosenCell = RNG.arrayGetRand(freeCells);
            freeCells.splice(freeCells.indexOf(chosenCell), 1);
        }
        else {
            return false;
        }

        // If free cell found within nest, start tunneling based on direction
        if (chosenCell.isFree()) {
            let [cX, cY] = chosenCell.getXY();
            const tunnelDxDy = RG.dirTodXdY(dir);
            if (tunnelDxDy) {
                [cX, cY] = RG.newXYFromDir(tunnelDxDy, [cX, cY]);
                chosenCell = map.getCell(cX, cY);
                tunnelCoord.push([cX, cY]);
                let numTries = 0;

                while (!chosenCell.isFree()) {
                    [cX, cY] = RG.newXYFromDir(tunnelDxDy, [cX, cY]);
                    if (map.hasXY(cX, cY)) {
                        chosenCell = map.getCell(cX, cY);
                        tunnelCoord.push([cX, cY]);
                    }
                    else {
                        // Run out ouf bounds from map, select new cell
                        tunnelCoord = [];
                        if (freeCells.length > 0) {
                            chosenCell = RNG.arrayGetRand(freeCells);
                            freeCells.splice(freeCells.indexOf(chosenCell), 1);
                            [cX, cY] = chosenCell.getXY();
                            [cX, cY] = RG.newXYFromDir(tunnelDxDy, [cX, cY]);
                            chosenCell = map.getCell(cX, cY);
                            tunnelCoord.push([cX, cY]);
                            numTries = 0;
                        }
                    }
                    if (++numTries === 250) {return false;}
                }
            }
            else {
                RG.err('NestGenerator', 'connectNestToParentLevel',
                    `No dXdY for dir ${dir} found`);
            }
        }
        else {
            return false;
        }
        return true;
    }


    public addElemsToNestArea(
        parentLevel: Level, bbox: BBox, conf: PartialNestOpts
    ): void {
        const doorXY: TCoord[] = super.markersToDoor(parentLevel);
    }

    /* Populates the nest with actors. */
    public populateNestArea(level: Level, bbox: BBox, conf: PartialNestOpts): void {
        const {actorConstr} = conf;
        if (actorConstr) {
            const dungPopul = new DungeonPopulate();
            const actors: SentientActor[] = this.getActorsForNest(actorConstr);
            const actorConf = {actors};
            if (dungPopul.addActorsToBbox(level, bbox, actorConf)) {
                actors.forEach(actor => {
                    const evalGuard = new EvaluatorGuardArea(0.7, bbox);
                    const brain = actor.getBrain() as BrainGoalOriented;
                    brain.getGoal().addEvaluator(evalGuard);
                });
            }
        }
    }

    public getActorsForNest(actorConstr: ShellConstr): SentientActor[] {
        const actors: SentientActor[] = [];
        const shells: IShell = [];
        const parser = ObjectShell.getParser();
        for (let i = 0; i < 5; i++) {
            shells.push(ActorGen.genShell(actorConstr));
        }
        shells.forEach((shell: IShell) => {
            for (let i = 0; i < 5; i++) {
                actors.push(parser.createFromShell(RG.TYPE_ACTOR, shell));
            }
        });
        return actors;
    }

    public addLootToNestArea(level: Level, bbox: BBox, conf: PartialNestOpts): void {
        let {maxValue} = conf;
        if (!maxValue) {
            maxValue = 100;
        }
        maxValue *= 1.5;

        const parser = ObjectShell.getParser();
        const lootXY: TCoord[] = super.removeOneMarkerType(level, '?', 'nest_loot');
        const itemFunc = (item: IShell) => (
            item.value <= maxValue! && item.value >= 0.5*maxValue!);
        lootXY.forEach((xy: TCoord) => {
            const item = parser.createRandomItem(itemFunc);
            level.addItem(item, xy[0], xy[1]);
        });

        // Add main loot
        const mainShell = ItemGen.genItems(1)[0];
        const mainLootItem = parser.createFromShell(RG.TYPE_ITEM, mainShell);
        if (mainLootItem) {
            const [x, y] = RNG.arrayGetRand(lootXY);
            level.addItem(mainLootItem, x, y);
        }
    }

}
