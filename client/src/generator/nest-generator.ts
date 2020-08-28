
import RG from '../rg';
import {LevelGenerator, ILevelGenOpts} from './level-generator';
// import {Nests} from '../../data/tiles.nests';
import dbg from 'debug';

import {TCoord, ShellConstr, IShell } from '../interfaces';
import {MapGenerator, MapConf} from './map.generator';
import {Level} from '../level';
import {Placer} from '../placer';
import {Geometry} from '../geometry';
import {BBox} from '../bbox';
import {Random} from '../random';
import {ELEM} from '../../data/elem-constants';
//import {DungeonPopulate} from '../dungeon-populate';
import {ActorGen} from '../../data/actor-gen';
import {ObjectShell} from '../objectshellparser';
import {SentientActor} from '../actor';
import {EvaluatorGuardArea, EvaluatorPatrol} from '../evaluators';
import {BrainGoalOriented} from '../brain';
import {ItemGen} from '../../data/item-gen';

type Cell = import('../map.cell').Cell;
type CellMap = import('../map').CellMap;

const RNG = Random.getRNG();

const debug = dbg('bitn:nest');

export interface NestOpts extends ILevelGenOpts {
    actorConstr: ShellConstr;
    mapConf: MapConf;
    embedOpts: {
        alwaysEmbed?: boolean; // Embed even if no free area
        level: Level; // Target level for embedding the nest
        bbox?: BBox; // Bbox for the nest
    };
    removeBorderWall?: boolean; // Removes all wall elements
    scanForDoors?: boolean; // Scans for border doors
    borderElem?: any;
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

    public squaresPerActor: number;


    constructor() {
        super();
        // this.addDoors = true;
        // this.shouldRemoveMarkers = true;
        this._debug = debug.enabled || true;
        this.squaresPerActor = 9;
    }

    public dbg(...args: any[]): void {
        if (this._debug) {
            debug(...args);
        }
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
        if (conf.removeBorderWall) {
            this.removeBorderWall(nestLevel, conf);
        }
        return this.embedIntoLevel(nestLevel, conf);
    }

    /* Embeds the nestLevel into level given in conf.embedOpts.level. */
    public embedIntoLevel(nestLevel: Level, conf: PartialNestOpts): boolean {
        if (!conf.embedOpts) {
            RG.err('NestGenerator', 'embedIntoLevel',
                `conf.embedOpts must exist. Got: ${JSON.stringify(conf)}`);
            return false;
        }

        if (!conf.maxDanger) {
            conf.maxDanger = 5;
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
            // nestLevel.debugPrintInASCII();
            Geometry.mergeLevels(parentLevel, nestLevel, bbox.ulx, bbox.uly);
            // parentLevel.debugPrintInASCII();
            // 1. Should connect the nest to remaining level now
            const tunnelCoord = this.connectNestToParentLevel(parentLevel, bbox, conf);
            if (tunnelCoord.length > 0) {

                this.addElemsToNestArea(parentLevel, bbox, conf);
                // 2. Here we can populate the nest area now
                this.populateNestArea(parentLevel, bbox, conf);

                // 3. Add items/loot to the area
                this.addLootToNestArea(parentLevel, bbox, conf);

                // 4. Add some interesting elements to tunnel as well
                this.populateTunnel(parentLevel, conf, tunnelCoord);
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

    /* Adds a connection between nest and parent. Returns all coordinates in the
     * connection as a list. List is empty when connection was not done.
     * */
    public connectNestToParentLevel(
        parentLevel: Level, bbox: BBox,
        conf: PartialNestOpts
    ): TCoord[] {

        // Scanning used for Dungeons where we want to connect to a door
        if (conf.scanForDoors) {
            const result = this.scanAndConnect(parentLevel, bbox, conf);
            if (result.length > 0) {
                return result;
            }
        }

        // This section creates a tunnel through walls
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
                let tunnelCoord: TCoord[] = [];
                this.dbg('Tunneling to', chosenDir, 'using', tunnelCoord);
                if (this.getCoordForTunnel(cells, map, chosenDir, tunnelCoord)) {
                    tunnelCoord = tunnelCoord.filter((c: TCoord) => {
                        const [x, y] = c;
                        if (x < 1 || y < 1) {return false;}
                        if (x >= map.cols-1 || y >= map.rows-1) {return false;}
                        return true;
                    });
                    map.setBaseElems(tunnelCoord, ELEM.FLOOR);
                    return tunnelCoord;
                }
            }
        }
        return [];
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

                // We've reached edge of the level
                if (!map.hasXY(cX, cY)) {
                    return false;
                }

                chosenCell = map.getCell(cX, cY);
                tunnelCoord.push([cX, cY]);
                let numTries = 0;

                while (!chosenCell.isFree()) {
                    [cX, cY] = RG.newXYFromDir(tunnelDxDy, [cX, cY]);
                    if (map.hasXY(cX, cY)) {
                        chosenCell = map.getCell(cX, cY);
                        tunnelCoord.push([cX, cY]);
                        let crossCoord = Geometry.getCrossCaveConn(cX, cY, 1);
                        crossCoord = crossCoord.map(c => RNG.shiftCoord(c));
                        // Append all crossCoord to tunneling coordinates
                        tunnelCoord.push(...crossCoord);
                    }
                    else {
                        // Run out ouf bounds from map, select new cell
                        tunnelCoord.length = 0; // Need to clear the array
                        if (freeCells.length > 0) {
                            chosenCell = RNG.arrayGetRand(freeCells);
                            freeCells.splice(freeCells.indexOf(chosenCell), 1);
                            [cX, cY] = chosenCell.getXY();
                            [cX, cY] = RG.newXYFromDir(tunnelDxDy, [cX, cY]);
                            chosenCell = map.getCell(cX, cY);
                            tunnelCoord.push([cX, cY]);
                            numTries = 0;
                            let crossCoord = Geometry.getCrossCaveConn(cX, cY, 1);
                            crossCoord = crossCoord.map(c => RNG.shiftCoord(c));
                            // Append all crossCoord to tunneling coordinates
                            tunnelCoord.push(...crossCoord);
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
            // const dungPopul = new DungeonPopulate();
            const area = bbox.getArea();
            const actors: SentientActor[] = this.getActorsForNest(actorConstr, area);
            //const actorConf = {actors};
            if (Placer.addActorsToBbox(level, bbox, actors)) {
                actors.forEach(actor => {
                    const evalGuard = new EvaluatorGuardArea(0.7, bbox);
                    const brain = actor.getBrain() as BrainGoalOriented;
                    brain.getGoal().addEvaluator(evalGuard);
                });
            }
        }
    }

    public getActorsForNest(actorConstr: ShellConstr, size: number): SentientActor[] {
        const actors: SentientActor[] = [];
        const shells: IShell[] = [];
        const parser = ObjectShell.getParser();
        const numShells = RNG.getUniformInt(3, 8);
        let nCreated = 0;
        const nToCreate = Math.round(size / this.squaresPerActor);

        for (let i = 0; i < numShells; i++) {
            let newShell = ActorGen.genShell(actorConstr);
            let watchdog = 35;

            while (newShell.danger > (actorConstr.maxDanger + 2)) {
                console.log('newShell danger is', newShell.danger, newShell.name);
                newShell = ActorGen.genShell(actorConstr);
                --watchdog;
                if (watchdog === 0) {
                    newShell = null; // Avoid placing too dangerous actors
                    break;
                }
            }

            if (newShell) {
                shells.push(newShell);
            }
            else {
                RG.warn('NestGenerator', 'getActorsForNest',
                    'Failed to create shell with ' + JSON.stringify(actorConstr));
            }
        }

        while (nCreated < nToCreate) {
            const shell = RNG.arrayGetRand(shells);
            actors.push(parser.createFromShell(RG.TYPE_ACTOR, shell));
            ++nCreated;
        }
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


    public removeBorderWall(nestLevel: Level, conf: PartialNestOpts): void {
        const {cols, rows} = nestLevel.getMap();
        let elem = ELEM.FLOOR;
        if (conf.borderElem) {
            elem = conf.borderElem;
        }
        // Row 0
        for (let x = 0; x < cols; ++x) {
            nestLevel.getMap().setBaseElemXY(x, 0, elem);
        }
        // Col 0
        for (let y = 0; y < rows; ++y) {
            nestLevel.getMap().setBaseElemXY(0, y, elem);
        }
        // Last row
        for (let x = 0; x < cols; ++x) {
            nestLevel.getMap().setBaseElemXY(x, rows - 1, elem);
        }
        // Last col
        for (let y = 0; y < rows; ++y) {
            nestLevel.getMap().setBaseElemXY(cols - 1, y, elem);
        }
    }

    public scanAndConnect(
        parentLevel: Level, bbox: BBox,
        conf: PartialNestOpts
    ): TCoord[] {
        // console.log('scanAndConnect bbox', bbox);
        // parentLevel.debugPrintInASCII();
        const result: TCoord[] = [];

        // East wall
        for (let y = bbox.uly; y <= bbox.lry; y++) {
            const x = bbox.lrx;
            const map = parentLevel.getMap();
            const coord = Geometry.getCrossAround(x, y, 1, true);
            const dirMap = Geometry.coordToDirMap([x, y], coord);

            if (dirMap.E) {
                const [eX, eY] = dirMap.E[0];
                const eastCell = map.getCell(eX, eY);
                if (eastCell.isFree()) {
                    // Need to tunnel west until floor found
                    const tunnel = this.tunnelUntilFloor(parentLevel, x, y, RG.DIR.W);
                    result.push(...tunnel);
                }
            }
        }
        // West wall
        for (let y = bbox.uly; y <= bbox.lry; y++) {
            const x = bbox.ulx;
            const map = parentLevel.getMap();
            const coord = Geometry.getCrossAround(x, y, 1, true);
            const dirMap = Geometry.coordToDirMap([x, y], coord);

            if (dirMap.W) {
                const [wX, wY] = dirMap.W[0];
                const westCell = map.getCell(wX, wY);
                if (westCell.isFree()) {
                    console.log('scanAndConnect free west cell at', wX, wY);
                    // Need to tunnel west until floor found
                    const tunnel = this.tunnelUntilFloor(parentLevel, x, y, RG.DIR.E);
                    result.push(...tunnel);
                }
            }
        }

        // South wall
        for (let x = bbox.ulx; x <= bbox.lrx; x++) {
            const y = bbox.lry;
            const map = parentLevel.getMap();
            const coord = Geometry.getCrossAround(x, y, 1, true);
            const dirMap = Geometry.coordToDirMap([x, y], coord);

            if (dirMap.S) {
                const [sX, sY] = dirMap.S[0];
                const southCell = map.getCell(sX, sY);
                if (southCell.isFree()) {
                    console.log('scanAndConnect south cell at', sX, sY);
                    // Need to tunnel west until floor found
                    const tunnel = this.tunnelUntilFloor(parentLevel, x, y, RG.DIR.N);
                    result.push(...tunnel);
                }
            }
        }

        // North wall
        for (let x = bbox.ulx; x <= bbox.lrx; x++) {
            const y = bbox.uly;
            const map = parentLevel.getMap();
            const coord = Geometry.getCrossAround(x, y, 1, true);
            const dirMap = Geometry.coordToDirMap([x, y], coord);

            if (dirMap.N) {
                const [nX, nY] = dirMap.N[0];
                const northCell = map.getCell(nX, nY);
                if (northCell.isFree()) {
                    console.log('scanAndConnect north cell at', nX, nY);
                    // Need to tunnel west until floor found
                    const tunnel = this.tunnelUntilFloor(parentLevel, x, y, RG.DIR.S);
                    result.push(...tunnel);
                }
            }
        }

        // console.log('After TUNNELING bbox', bbox);
        // parentLevel.debugPrintInASCII();
        return result;
    }

    /* Given x,y and direction, tunnels from x,y until FLOOR is reached. */
    public tunnelUntilFloor(level: Level, x, y, dXdY): TCoord[] {
        const [dX, dY] = dXdY;
        const res: TCoord[] = [];
        let done = false;
        const map = level.getMap();
        let i = 0;
        map.setBaseElems([[x, y]], ELEM.FLOOR);

        let wallFound = false;
        let floorFound = false;

        while (!done) {
            const [nX, nY] = [x + i * dX, y + i * dY];
            if (!map.hasXY(nX, nY)) {
                done = false;
                break;
            }
            const cell = map.getCell(nX, nY);
            if (!cell.isFree()) {
                wallFound = true;
                res.push([nX, nY]);
                map.setBaseElemXY(nX, nY, ELEM.FLOOR);
            }
            else if (wallFound) {
                floorFound = true;
            }
            ++i;

            done = wallFound && floorFound;
        }

        if (!done) {return [];}
        return res;
    }

    public populateTunnel(level: Level, conf, tunnelCoord: TCoord[]): void {
        const firstCoord = tunnelCoord[0];
        const lastCoord = tunnelCoord[tunnelCoord.length - 1];
        const patrolCoord: TCoord[] = [firstCoord, lastCoord];
        const {actorConstr} = conf;
        if (actorConstr) {
            // Tunnel has less actor density than the nest
            const size = Math.round(tunnelCoord.length / 5);
            const actors: SentientActor[] = this.getActorsForNest(actorConstr, size);
            if (Placer.addActorsToCoord(level, tunnelCoord, actors)) {
                actors.forEach(actor => {
                    const evalGuard = new EvaluatorPatrol(0.7, patrolCoord);
                    const brain = actor.getBrain() as BrainGoalOriented;
                    brain.getGoal().addEvaluator(evalGuard);
                });
            }
        }
    }

}
