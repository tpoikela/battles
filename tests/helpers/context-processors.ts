
import RG from '../../client/src/rg';
import {Brain, BrainPlayer} from '../../client/src/brain';
import {Random} from '../../client/src/random';
import {TCoord} from '../../client/src/interfaces';
import { GoalExplore } from '../../client/src/goals';

type PlayerDriver = import('./player-driver').PlayerDriver;
type DriverContext = import('./player-driver').DriverContext;
type Level = import('../../client/src/level').Level;
type Cell = import('../../client/src/map.cell').Cell;

import dbg = require('debug');
const debug = dbg('bitn:ContextProcessor');

debug.enabled = true;

const RNG = Random.getRNG();

/* Base class for context processing. */
export class ContextProcessor {

    constructor(public name: string, public drv: PlayerDriver) {
    }

    public processContext(): boolean {
        if (this.isWithinContext()) {
            const action = this.drv.action;
            console.log(`${this.name} isWithinContext() OK, start action |${action}|`);
            const ok = this._process();
            const newAction = this.drv.action;
            if (action !== newAction) {
                console.log(`${this.name} modified action |${action}| -> |${newAction}|`);
            }
            return ok;
        }
        return false;
    }

    public isWithinContext(): boolean {
        return false;
    }

    protected _process(): boolean {
        return false;
    }

    protected dbg(...args: any[]): void {
        if (debug.enabled) {
            debug(`${this.name}: `, ...args);
        }
    }
}

export class EnemyContextProcessor extends ContextProcessor {

    public hpLow: number;
    public ppRestLimit: number;
    public hpRestLimit: number;

    constructor(public name: string, public drv: PlayerDriver) {
        super(name, drv);

        this.ppRestLimit = RNG.getUniformRange(0.10, 0.25);

        this.hpLow = RNG.getUniformRange(0.10, 0.25);
        this.hpRestLimit = RNG.getUniformRange(0.25, 0.5);
    }

    public isWithinContext(): boolean {
        return true;
    }

    /* Checks for surrounding enemies and whether to attack or not. Checks also
     * for requirement to rest and gain health. */
    public checkForEnemies(): void {
        const drv = this.drv;
        const brain = drv.player.getBrain() as BrainPlayer;
        // const around = Brain.getCellsAroundActor(drv.player);
        // const actorsAround = around.map((c: Cell) => c.getFirstActor());
        const actorsAround = Brain.getSeenHostiles(drv.player);

        drv.enemy = null;
        actorsAround.forEach(actor => {
            if (drv.enemy === null) {
                if (actor && actor.isEnemy(drv.player)) {
                    drv.enemy = actor;
                    if (this.hasEnoughHealth()) {
                        drv.action = 'attack';
                    }
                    else if (!brain.isRunModeEnabled()) {
                        drv.action = 'run';
                    }
                    else {
                        drv.action = 'flee';
                    }
                    drv.state.path = [];
                }
            }
        });
        if (drv.action === '' && this.shouldRest()) {
            drv.action = 'rest';
        }
    }

    public hasEnoughHealth(): boolean {
        const drv = this.drv;
        const health = drv.player.get('Health');
        const maxHP = health.getMaxHP();
        const hp = health.getHP();
        if (hp > Math.round(this.hpLow * maxHP)) {
            return true;
        }
        return false;
    }

    public shouldRest(): boolean {
        const player = this.drv.player;
        if (player.has('SpellPower')) {
            const spellPower = player.get('SpellPower');
            const pp = spellPower.getPP();
            const maxPP = spellPower.getMaxPP();
            if (pp < (this.ppRestLimit * maxPP)) {
                return true;
            }
        }
        const health = player.get('Health');
        const maxHP = health.getMaxHP();
        const hp = health.getHP();
        return hp < (this.hpRestLimit * maxHP);
    }


    protected _process(): boolean {
        this.checkForEnemies();
        return true;
    }

}

/* Processor is used when player is on level belonging to Area. */
export class AreaContextProcessor extends ContextProcessor {

    protected visitedLevels: {[key: string]: number};
    protected maxVisitWait: number;

    constructor(public name: string, public drv: PlayerDriver) {
        super(name, drv);
        this.visitedLevels = {};
        this.maxVisitWait = 200;
    }

    /* Processor applies only when player is in Area. */
    public isWithinContext(): boolean {
        const level = this.drv.player.getLevel();
        const parent = level.getParent();
        if (parent) {
            return parent.getType() === 'area';
        }
        return false;
    }

    public hasVisited(level: Level): boolean {
        const currTurns = this.drv.nTurns;
        const visitTurns = this.visitedLevels[level.getID()];
        return (currTurns - visitTurns) < this.maxVisitWait;
    }

    protected _process(): boolean {
        const player = this.drv.getPlayer();
        const pCell = player.getCell();

        // Enter an unvisited passage, if found
        if (pCell.hasPassage()) {
            const conn = pCell.getConnection();
            const targetLevel = conn.getTargetLevel() as Level;
            if (!this.hasVisited(targetLevel)) {
                this.drv.action = 'stairs';
                this.visitedLevels[targetLevel.getID()] = this.drv.nTurns;
                return true;
            }
        }

        // No path set, continue searching
        if (!this.drv.hasPath()) {
            const cells: Cell[] = player.getBrain().getSeenCells();
            const connCells = cells.filter(c => c.hasPassage());
            if (connCells.length > 0) {
                console.log(`Found ${connCells.length} connections`);
                for (let i = 0; i < connCells.length; i++) {
                    const cell = connCells[i];
                    const conn = cell.getConnection();
                    const targetLevel = conn.getTargetLevel();
                    if (!this.hasVisited(targetLevel as Level)) {
                        if (this.drv.setPathAction(conn.getXY())) {
                            return true;
                        }
                    }
                }
            }

            // Main functions:
            // - Move player towards north
            //   - We can find unexplored cell by doing +1 FOV
            // - Move player into zones to explore them
        }
        else {
            this.drv.action = 'path';
            return true;
        }
        return false;
    }

}

export class ExploreContextProcessor extends ContextProcessor {

    constructor(public name: string, public drv: PlayerDriver) {
        super(name, drv);
    }

    /* Explore can be applied anywhere. */
    public isWithinContext(): boolean {
        return true;
    }

    protected _process(): boolean {
        const player = this.drv.getPlayer();
        const map = player.getLevel().getMap();
        const [cells, unseen]: [Cell[], Cell[]] = map.getCellsInFOVPlus(player, 1);
        if (unseen.length > 0) {
            const unExplored = unseen.filter((c: Cell) => !c.isExplored());
            if (unExplored.length > 0) {
                const cell = RNG.arrayGetRand(unExplored);
                if (this.drv.setPathAction(cell.getXY())) {
                    return true;
                }
            }
        }
        return false;
    }
}

export class RandomContextProcessor extends ContextProcessor {

    public prob: number;

    constructor(public name: string, public drv: PlayerDriver) {
        super(name, drv);
        this.prob = 0.10;
    }

    /* Explore can be applied anywhere. */
    public isWithinContext(): boolean {
        return true;
    }

    protected _process(): boolean {
        if (!this.drv.hasPath()) {
            const goal = new GoalExplore(this.drv.player);
            goal.setNewPassableDir();
            const pathLen = RNG.getUniformInt(1, 10);
            const [pX, pY] = this.drv.player.getXY();
            const [newX, newY] = [pX + pathLen * goal.dX, pY + pathLen * goal.dY];
            if (this.drv.setPathAction([newX, newY])) {
                return true;
            }
            else {
                // Take a step to random direction
                const [nX, nY] = [pX + goal.dX, pY + goal.dY];
                if (this.drv.setPathAction([nX, nY])) {
                    return true;
                }
                else {
                    const msg = `Dir: ${[goal.dX, goal.dY]}, ` +
                        `pXY: ${this.drv.player.getXY()}, impassable: ${[nX, nY]}`;
                    this.drv.player.getLevel().debugPrintInASCII();
                    RG.err('RandomContextProcessor', '_process',
                        `Fallback proc failed! ${msg}`);
                }
            }
        }
        else {
            this.drv.action = 'path';
            return true;
        }
        return false;
    }
}

interface LevelData {
    stairsUp: TCoord[];
    stairsDown: TCoord[];
    turnsExplored: number;
}

export class ZoneContextProcessor extends ContextProcessor {

    public reZones: RegExp;
    public scannedLevels: {[key: number]: LevelData};
    public visitedStairs: {[key: string]: boolean};
    public state: {[key: string]: any};

    constructor(public name: string, public drv: PlayerDriver) {
        super(name, drv);
        this.reZones = /mountain|dungeon/;
        this.scannedLevels = {};
        this.visitedStairs = {};
        this.state = {};
    }

    /* Processor applies only when player is in AreaTiles. */
    public isWithinContext(): boolean {
        const level = this.drv.player.getLevel();
        const parent = level.getParentZone();
        if (parent) {
            return this.reZones.test(parent.getType());
        }
        this.state = {}; // Clear state in non-context
        return false;
    }

    protected _process(): boolean {
        const level = this.drv.player.getLevel();
        const id = level.getID();
        let ok = false;
        // scan the seen the cells first (not every turn)
        if (!this.scannedLevels[id]) {
            this.scanLevel(level);
        }
        this.scannedLevels[id].turnsExplored += 1;

        if (!this.drv.hasPath()) {
            // Check for stairs down, then up
            const stairsDown = this.scannedLevels[id].stairsDown;
            const stairsUp = this.scannedLevels[id].stairsUp;

            // Last level reached, do some exploration, but set goUp
            // variable to prevent going down on stairs again
            if (stairsDown.length === 0) {
                if (!this.state.goUp) {
                    this.dbg(`No stairsDown found. goUp triggered for ${id}`);
                    this.state.goUp = true;
                }
                if (this.scannedLevels[id].turnsExplored < 300) {
                    return false;
                }
            }

            const pCell: Cell = this.drv.player.getCell();
            if (pCell.hasStairs()) {
                this.dbg(`hasStairs() OK at ${pCell.getXY()}`);
                if (this.state.goUp) {
                    const stairs = pCell.getStairs()!;
                    if (stairs.getName() === 'stairsUp') {
                        this.drv.action = 'stairs';
                        this.addVisited(id, pCell.getXY());
                        return true;
                    }
                }
                else if (!this.hasVisited(id, pCell.getXY())) {
                    this.drv.action = 'stairs';
                    this.addVisited(id, pCell.getXY());
                    return true;
                }
            }

            let stairsLists = [stairsUp];
            if (!this.state.goUp) {
                stairsLists = [stairsDown, stairsUp];
            }

            stairsLists.forEach(sList => {
                sList.forEach(sXY => {
                    if (!ok && (this.state.goUp || !this.hasVisited(id, sXY))) {
                        if (this.drv.setPathAction(sXY)) {
                            this.dbg(`Setting path to stairs ${pCell.getXY()} -> ${sXY}`);
                            ok = true;
                        }
                    }
                });
            });
        }
        else {
            this.drv.action = 'path';
            return true;
        }
        return ok;
    }

    protected hasVisited(id: number, xy: TCoord): boolean {
        const key = '' + id + ',' + xy[0] + ',' + xy[1];
        return this.visitedStairs[key];
    }

    protected addVisited(id: number, xy: TCoord): void {
        const key = '' + id + ',' + xy[0] + ',' + xy[1];
        this.visitedStairs[key] = true;
    }

    protected scanLevel(lv: Level): void {
        console.log(`${this.name} scanning level ${lv.getID()} for stairs..`);
        const lvData: LevelData = {
            stairsUp: [], stairsDown: [],
            turnsExplored: 0
        };
        const elems = lv.getElements();
        // TODO show only explored elems
        elems.forEach(elem => {
            if (elem.getName() === 'stairsDown') {
                lvData.stairsDown.push(elem.getXY());
            }
            else if (elem.getName() === 'stairsUp') {
                lvData.stairsUp.push(elem.getXY());
            }
        });

        this.scannedLevels[lv.getID()] = lvData;
    }

}

