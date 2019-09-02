
/* Player driver is used in testing instead of real human player to find
 * possibly buggy scenarios. Basically it's an AI based of if-elsif-else
 * statements.
 */

import RG from '../../client/src/rg';
import {Path} from '../../client/src/path';
import {Screen} from '../../client/gui/screen';
import {Keys} from '../../client/src/keymap';
import {EventPool} from '../../client/src/eventpool';
import {BrainPlayer} from '../../client/src/brain';
import {Random} from '../../client/src/random';

import {SentientActor} from '../../client/src/actor';

import {CmdInput, IPlayerCmdInput,
    RandWeights, NoFunctionObject,
    ICoordXY, TCoord} from '../../client/src/interfaces';

import {ContextProcessor, EnemyContextProcessor,
    ZoneContextProcessor,
    AreaContextProcessor, ExploreContextProcessor} from './context-processors';

type Stairs = import('../../client/src/element').ElementStairs;
type Level = import('../../client/src/level').Level;
type Cell = import('../../client/src/map.cell').Cell;

const RNG = Random.getRNG();
const {KEY, KeyMap} = Keys;
const {getShortestPath} = Path;

import dbg = require('debug');
const debug = dbg('bitn:PlayerDriver');

debug.enabled = true;

const MOVE_DIRS = [-1, 0, 1];
const LINE = '='.repeat(78);
const POOL = EventPool.getPool();

// Object for storing data between context processors
export interface DriverContext {
    ammoShot: {[key: string]: TCoord[]};
}

/* Base class for player drivers. A driver can be attached to the player actor
*  and the driver will act as an AI controlling the player. */
export class DriverBase {

    public player: SentientActor;
    protected _game: any;
    protected _keyBuffer: CmdInput[];

    constructor(player?: SentientActor, game?: any) {
        if (player) {
            this.player = player;
        }
        this._game = game;
        this._keyBuffer = [];
    }

    public setGame(game: any): void {
        this._game = game;
    }

    public setKeys(keys: CmdInput[]): void {
        this._keyBuffer = keys.slice();
    }

    public handleClick(x: number, y: number, cell: Cell, cmd): void {
        // Do nothing
    }

    public reset(): void {
        this._keyBuffer = [];
    }

    public hasKeys(): boolean {
        return this._keyBuffer.length > 0;
    }

    /* Returns the next keycode or null if buffer is empty. */
    public getNextCode(): null | CmdInput {
        if (this._keyBuffer.length > 0) {
            return this._keyBuffer.shift()!;
        }
        return null;
    }

}

interface CoordMap {
    [key: string]: TCoord;
}

interface DriverState {
    exploreTurns: number;
    usePassage: boolean;
    useStairs: boolean;
    exitZone: boolean;
    path: ICoordXY[];
    stairsStack: Array<[number, number, number]>;
    tilesVisited: {[key: string]: number};
    visitedStairs: {[key: string]: CoordMap};
    visited: NoFunctionObject; // cell: id,x,y
}

type StateKey = keyof DriverState;

/* Action processor executes the given action based on context. */
class ActionProcessor {

    constructor() {
    }

    public process(drv: PlayerDriver): null | IPlayerCmdInput {
        return null;
    }

}

class BasicAttackProcessor extends ActionProcessor {

    public ammoShotAt: {[key: string]: TCoord[]};

    constructor() {
        super();
        this.ammoShotAt = {};
    }

    public process(drv: PlayerDriver): null | IPlayerCmdInput {
        const enemy = drv.enemy;
        // const map = drv.player.getLevel().getMap();
        const [pX, pY] = drv.player.getXY();
        let keycodeOrCmd: null | IPlayerCmdInput = null;
        if (!enemy) {
            RG.err('PlayerDriver', 'getPlayerCmd',
                `Got action 'attack' but enemy is null`);
            return null;
        }
        const [eX, eY] = enemy!.getXY();
        const dX = eX - pX;
        const dY = eY - pY;
        const code = KeyMap.dirToKeyCode(dX, dY);

        if (this.canCastSpell(drv)) {
            keycodeOrCmd = {code: KEY.POWER};
            const spellCode = this.getCodeForSpell(drv);
            if (spellCode >= 0) {
                drv.setKeys([spellCode, code]);
            }
            else {
                keycodeOrCmd = {code};
            }
        }
        else if (this.willDoRangedAttack(drv)) {
            drv.setKeys([Keys.VK_t]);
            return {code: Keys.VK_t};
        }
        else {
            if (Math.abs(dX) <= 1 && Math.abs(dY) <= 1) {
                keycodeOrCmd = {code};
            }
            else {
                drv.setPathAction([eX, eY]);
                return null;
            }
        }
        return keycodeOrCmd;
    }

    /* Returns true if the player can cast any spells. */
    private canCastSpell(drv: PlayerDriver): boolean {
        const spellPower = drv.player.get('SpellPower');
        if (spellPower) {
            const book = drv.player.getBook();
            if (book) {
                const spell = book.getSpells()[0];
                return spell.canCast();
            }
        }
        return false;
    }

    private willDoRangedAttack(drv: PlayerDriver): boolean {
        const player = drv.player;
        const [eX, eY] = drv.enemy!.getXY();
        const [aX, aY] = player.getXY();
        const miss = player.getInvEq().getEquipment().getItem('missile');

        if (miss) {
            const range = RG.getMissileRange(player, miss);
            const getDist = Path.shortestDist(eX, eY, aX, aY);
            if (getDist <= range && getDist > 1) {
                const levelId = player.getLevel().getID();
                if (!this.ammoShotAt[levelId]) {
                    this.ammoShotAt[levelId] = [];
                }
                this.ammoShotAt[levelId].push([eX, eY]);
                return true;
            }
            console.log(`Has missile but range check failed: r: ${range} dist: ${getDist}`);
            // TODO test for a clean shot
        }
        else {
            console.log('No missile equipped. Cannot do attack');
        }
        return false;
    }

    /* Returns the keyCode for a spell that will be cast. */
    private getCodeForSpell(drv: PlayerDriver): number {
        const book = drv.player.getBook();
        const spells = book.getSpells();

        // Check if we have any damaging spells, if not then terminate
        const dmgSpells = spells.filter(spell => spell.hasDice('damage'));
        if (dmgSpells.length === 0) {return -1;}

        const dmgIndices: RandWeights = {};
        let totalPower = 0;
        dmgSpells.forEach((spell, i) => {
            if (spell.canCast()) {
                const castPower = spell.getCastingPower();
                totalPower += castPower;
                dmgIndices[i] = castPower;
            }
        });

        // Create spell weights inversely proportional to the
        // casting power of each
        const keys = Object.keys(dmgIndices);
        keys.forEach(key => {
            dmgIndices[key] = totalPower - dmgIndices[key];
        });

        const index: string = RNG.getWeighted(dmgIndices);
        const numIndex = parseInt(index, 10);
        const menuIndex = Keys.menuIndices[numIndex];
        return Keys.selectIndexToCode(menuIndex);
    }

}

/* This object can be used to simulate player actions in the world. It has 2
 * main uses:
 *  1. An AI to play the game and simulate player actions to find bugs
 *  2. A driver to automate some player actions like path-finding
 * */
export class PlayerDriver extends DriverBase {

    public static fromJSON: (json: any) => any;

    public action: string;
    public enemy: null | SentientActor;
    public cmds: CmdInput[];
    public actions: string[];
    public screen: any;
    public state: DriverState;
    public maxExploreTurns: number;
    public nTurns: number;
    public screenPeriod: number;
    public hasNotify: boolean;

    public contextProcs: ContextProcessor[];
    public actionProcs: {[key: string]: ActionProcessor[]};
    public context: DriverContext;

    constructor(player?: SentientActor, game?: any) {
        super(player, game);
        this.action = '';
        this.enemy = null;

        this.cmds = []; // Stores each command executed
        this.actions = ['']; // Stores each action taken
        this.screen = new Screen(30, 14);

        // State contains variables that need to be stored
        this.state = {
            exploreTurns: 0,
            usePassage: false,
            useStairs: false,
            exitZone: false,
            path: [],
            stairsStack: [],
            tilesVisited: {},
            visitedStairs: {},
            visited: {} // cell: id,x,y
        };

        this.context = {
            ammoShot: {}
        };

        // To keep track of stairs used for returning
        this.maxExploreTurns = 500; // Turns to spend in one level


        this.nTurns = 0;
        this.screenPeriod = 10000;

        this._passableCallback = this._passableCallback.bind(this);

        this.hasNotify = true;
        POOL.listenEvent(RG.EVT_TILE_CHANGED, this);

        this.contextProcs = [
            new EnemyContextProcessor('enemyContext', this),
            new AreaContextProcessor('areaContext', this),
            new ZoneContextProcessor('zoneContext', this),
            new ExploreContextProcessor('zoneContext', this)
        ];

        this.actionProcs = {
            attack: [
                new BasicAttackProcessor()
            ]
        };
    }

    public setPlayer(pl: SentientActor): void {this.player = pl;}
    public getPlayer(): SentientActor {return this.player;}

    /* Required for the player driver. */
    public getNextCode(): CmdInput {
        let cmdOrCode = super.getNextCode();
        if (cmdOrCode === null) {
            cmdOrCode = this.nextCmd();
        }
        if ((cmdOrCode as IPlayerCmdInput).code) {
            return (cmdOrCode as IPlayerCmdInput).code!;
        }
        else {return cmdOrCode;}
    }

    public hasPath(): boolean {
        return this.state.path.length > 0;
    }

    public hasKeys(): boolean {return true;}

    public reset(): void {
        this.state.usePassage = false;
        this.state.useStairs = false;
        this.state.exitZone = false;
        this.state.path = [];
    }

    // Returns the next command given to game.update().
    // Few simple guidelines:
    //   1. Attack/flee behaviour has priority
    //   2. Prefer going to north always if possible
    //   3. If any passages in sight, and level not visited, go there
    //      - Start a counter. When that expires, go back up.
    public nextCmd(): IPlayerCmdInput {
        this.action = '';

        // Record current x,y as visited
        const [pX, pY] = this.player.getXY();
        const level: Level = this.player.getLevel();
        this.addVisited(level, pX, pY);

        const visible: Cell[] = this.player.getLevel().getMap().getCellsInFOV(this.player);
        this.printTurnInfo(visible);

        // This is the driver front-end which sets the action type this.action
        if (this.action === '') {this.checkForSelection();}
        this.contextProcs.forEach((proc: ContextProcessor) => {
            if (this.action === '') {
                proc.processContext();
            }
        });
        // if (this.action === '') {this.checkForEnemies();}
        if (this.action === '') {this.tryExploringAround(visible);}

        //-------------------------------------------------------
        // Command post-processing, get command for Brain.Player
        //-------------------------------------------------------
        let keycodeOrCmd = this.getPlayerCmd();
        if (!keycodeOrCmd) {keycodeOrCmd = {code: KEY.REST};}

        if (debug.enabled) {
            const cmdJson = JSON.stringify(keycodeOrCmd);
            const msg = `action: |${this.action}|, cmd: ${cmdJson}`;
            this.debug('>>> PlayerDriver ' + msg);
        }

        ++this.nTurns;
        this.cmds.push(keycodeOrCmd);
        this.actions.push(this.action);
        return keycodeOrCmd;
    }

    public checkForSelection(): void {
        const brain = this.player.getBrain() as BrainPlayer;
        if (brain.isMenuShown()) {
            this.action = 'selection';
        }
    }

    public tryExploringAround(visible: Cell[]): void {
        const map = this.player.getLevel().getMap();
        const pCell = this.player.getCell();
        const [pX, pY] = [pCell.getX(), pCell.getY()];
        --this.state.exploreTurns;

        if (!this.hasPath()) {
            const nX = pX;
            const nY = pY - 1;
            if (this.shouldPickupFromCell(pCell)) {
                this.action = 'pickup';
            }
            else if (this.shouldReturnBackUp()) {
                this.setState({useStairs: true}, 'Return up true');
            }
            else if (this.levelExploredEnough(visible)) {
                this.setState({useStairs: true}, 'new Stairs seen');
                this.state.exploreTurns = this.maxExploreTurns;
            }
            // this.player not at the top of area tile yet
            else if (!this.movingToConnect() && nY >= 0) {
                const nCell = map.getCell(nX, nY);
                if (nCell.isPassable() && !this.cellVisited(nCell)) {
                    this.action = 'move north';
                }
                else { // Try to find more complex path to north
                    console.log('Trying to find a path to move');
                    this.findPathToMove(visible);
                }
            }
            else if (this.state.useStairs && pCell.hasStairs()) {
                this.setState({useStairs: false}, 'In stairs cell');
                this.action = 'stairs';
                this.addUsedStairs(pCell);
            }
            else if (this.state.usePassage && pCell.hasPassage()) {
                this.setState({usePassage: false}, 'cell hasPassage()');
                this.action = 'stairs';
            }
            else if (pCell.hasPassage() && !this.passageVisited(pCell)) {
                this.action = 'stairs';
            }
            else {
                // Try to passage out
                this.tryToFindPassage(visible);
            }
        }
        else { // Move using pre-computed path
            this.action = 'path';
        }
    }

    public tryToSetPathToCell(cells: Cell[]): void {
        // const [pX, pY] = this.player.getXY();
        this.state.path = [];
        cells.forEach(pCell => {
            if (!this.hasPath()) {
                // const [cX, cY] = [pCell.getX(), pCell.getY()];
                if (this.setPathAction(pCell.getXY())) {
                }

                /*
                const path = getShortestPath(pX, pY, cX, cY,
                                             this._passableCallback);
                if (path.length > 1) {
                    this.debug('Found a non-zero path');
                    this.state.path = path;
                    this.state.path.shift(); // Discard 1st coord
                    this.action = 'path';
                }*/
            }
        });
    }

    /* Tries to find a path to from current direction. */
    public findPathToMove(visible: Cell[], acceptVisited = false) {
        const [pX, pY] = this.player.getXY();

        let passable = visible.filter(cell => cell.isPassable());
        const doors = visible.filter(cell => cell.hasDoor());

        if (!acceptVisited) {
            passable = passable.filter(cell => (
                !this.cellVisited(cell)
            ));
        }

        const cells = {
            north: passable.filter(cell => cell.getY() < pY),
            south: passable.filter(cell => cell.getY() > pY),
            east: passable.filter(cell => cell.getX() > pX),
            west: passable.filter(cell => cell.getX() < pX),
            doors
        };

        let ind = '';
        if (acceptVisited) {ind = '>>>>';}

        let dirOrder = ['north', 'west', 'east', 'south'];
        if (acceptVisited) {
            // Shuffle direction if doing 2nd pass with visited cells
            // Avoids taking stuck and repeating same path forever
            dirOrder = RNG.shuffle(dirOrder);
            console.log('Shuffled order is now', dirOrder);
        }

        let arrInd = '>';
        dirOrder.forEach(dir => {
            if (!this.hasPath()) {
                this.debug(ind + arrInd + ' Looking path to ' + dir);
                this.tryToSetPathToCell(cells[dir]);
                if (this.hasPath()) {
                    this.action = 'path';
                    return;
                }
                arrInd += '>';
            }
        });

        if (this.action === '') {
            this.tryToSetPathToCell(cells.doors);
        }

        if (this.action === '') {
            if (acceptVisited) {
                // Last-ditch effort to do something
                console.log('We are screwed, no path found');
                this.debug('We are screwed');
            }
            else {
                // Still some hope left
                this.debug(ind + '>>>> Looking passage out');
                this.tryToFindPassage(visible, false);
                if (!this.hasPath()) {
                    this.debug(ind + '>>>>> Looking visited cells now');
                    this.findAlreadySeenPassage();
                    if (!this.hasPath()) {
                        console.log('Trying now from visited cells');
                        this.findPathToMove(visible, true);
                    }
                }
                else {
                    this.action = 'path';
                }
            }
        }
    }

    public levelVisited(level): boolean {
        return this.state.visited.hasOwnProperty(level.getID());
    }

    public cellVisited(cell: Cell): boolean {
        const id = this.player.getLevel().getID();
        if (this.state.visited.hasOwnProperty(id)) {
            const [x, y] = [cell.getX(), cell.getY()];
            return this.state.visited[id].hasOwnProperty(x + ',' + y);
        }
        return false;
    }

    /* Adds a visited cell for the this.player. */
    public addVisited(level, x, y): void {
        const id = level.getID();
        if (!this.state.visited.hasOwnProperty(id)) {
            this.state.visited[id] = {};
        }
        const cell = this.player.getCell();
        this.state.visited[id][x + ',' + y] = {
            x, y, hasPassage: cell.hasPassage()
        };
    }


    /* Tries to find unvisited stairs from visible cells and calculate a path
     * there. */
    public newStairsSeen(visible: Cell[]): boolean {
        const levelID = this.player.getLevel().getID();
        const cellStairs: Cell = visible.find(cell => {
            const [x, y] = [cell.getX(), cell.getY()];
            if (!this.state.visitedStairs.hasOwnProperty(levelID)) {
                return cell.hasStairs();
            }
            else if (!this.state.visitedStairs[levelID][x + ',' + y]) {
                return cell.hasStairs();
            }
            return false;
        });
        if (cellStairs) {
            this.tryToSetPathToCell([cellStairs]);
            if (this.hasPath()) {
                this.debug('Found path to stairs. Going there.');
                return true;
            }
        }
        return false;
    }

    public tryToFindPassage(visible: Cell[], moveAfter = true): void {
        this.debug('> Looking for north passage cells');
        const passageCells: Cell[] = visible.filter(cell => (
            cell.hasPassage() && cell.getY() === 0
            && !this.passageVisited(cell)
        ));
        this.debug('> N passageCells ' + passageCells.length);
        this.tryToSetPathToCell(passageCells);
        if (this.hasPath()) {
            this.setState({usePassage: true}, 'north passage');
            this.action = 'path';
        }
        else {
            this.debug('>> Looking for west passage cells');
            const wPassageCells = visible.filter(cell => (
                cell.hasPassage() && cell.getX() === 0
                && !this.passageVisited(cell)
            ));
            this.tryToSetPathToCell(wPassageCells);
            if (this.hasPath()) {
                this.setState({usePassage: true}, 'west passage');
                this.action = 'path';
            }
            else {
                this.debug('>> Looking for any passage cells');
                const anyPassageCell = visible.filter(cell => (
                    cell.hasPassage() && !this.passageVisited(cell)
                ));
                this.tryToSetPathToCell(anyPassageCell);
                if (this.hasPath()) {
                    this.setState({usePassage: true}, 'any passage');
                    this.action = 'path';
                }
                else if (moveAfter) {
                    this.debug('>>> No passages. Trying to move.');
                    this.findPathToMove(visible);
                }
                else {
                    this.debug('>>> No passages. Terminating.');
                }
            }
        }
    }

    public passageVisited(cell: Cell): boolean {
        const passage = cell.getPassage();
        if (passage) {
            const target = passage.getTargetLevel();
            return this.levelVisited(target);
        }
        return false;
    }

    public findAlreadySeenPassage(): void {
        this.debug('Looking at remembered passages');

        const newPassages = this.findVisitedCells(cell => (
            cell.hasPassage() && !this.passageVisited(cell)
        ));

        this.debug('Looking at non-visited passages');
        this.tryToSetPathToCell(newPassages);

        if (this.hasPath()) {
            this.setState({usePassage: true}, 'already seen passage');
            this.action = 'path';
        }
        else {
            this.debug('Looking at visited passages');
            const allPassages = this.findVisitedCells(cell => (
                cell.hasPassage()
            ));
            this.tryToSetPathToCell(allPassages);
            if (this.hasPath()) {
                this.setState({usePassage: true}, 'already seen passage');
                this.action = 'path';
            }
            else {
                this.debug('Nothing found among passages. Screwed!');
            }
        }

    }

    public findVisitedCells(func: (Cell) => boolean): Cell[] {
        const map = this.player.getLevel().getMap();
        const id = this.player.getLevel().getID();
        const cellObjs = Object.values(this.state.visited[id]);
        const cells: Cell[] = cellObjs.map((obj: any) => map.getCell(obj.x, obj.y));
        return cells.filter(func);
    }

    /* Returns the command (or code) give to game.update(). */
    public getPlayerCmd(): IPlayerCmdInput {
        const enemy = this.enemy;
        const map = this.player.getLevel().getMap();
        const [pX, pY] = this.player.getXY();
        let keycodeOrCmd = null;

        if (this.actionProcs[this.action]) {
            const procs = this.actionProcs[this.action];
            for (let i = 0; i < procs.length; i++) {
                keycodeOrCmd = procs[i].process(this);
                if (keycodeOrCmd) {break;}
            }
        }
        if (keycodeOrCmd) {return keycodeOrCmd;}
        // If action changed, we could evaluate action procs again,
        // Maybe a while loop or something

        if (this.action === 'pickup') {
            keycodeOrCmd = {code: KEY.PICKUP};
        }
        else if (this.action === 'flee') {
            const pCell = this.player.getCell();
            if (pCell.hasPassage()) {
                keycodeOrCmd = {code: KEY.USE_STAIRS_DOWN};
            }
            else {
                const [eX, eY] = [enemy.getX(), enemy.getY()];
                const [dX, dY] = RG.dXdYUnit([eX, eY], [pX, pY]);
                // Invert direction for escape
                const newX = pX + -dX;
                const newY = pY + -dY;

                if (map.isPassable(newX, newY)) {
                    const code = KeyMap.dirToKeyCode(-dX, -dY);
                    this.debug(`flee to dx,dy ${-dX},${-dY}`);
                    keycodeOrCmd = {code};
                }
                else { // Pick a random direction
                    this.debug('Pick random direction for fleeing');

                    let randX = RNG.arrayGetRand(MOVE_DIRS);
                    let randY = RNG.arrayGetRand(MOVE_DIRS);
                    const maxTries = 20;
                    let tries = 0;

                    while (!map.isPassable(pX + randX, pY + randY)) {
                        randX = RNG.arrayGetRand(MOVE_DIRS);
                        randY = RNG.arrayGetRand(MOVE_DIRS);
                        ++tries;
                        if (tries >= maxTries) {break;}
                    }

                    if (map.isPassable(randX, randY)) {
                        this.debug(`flee rand dir to dx,dy ${randX},${randY}`);
                        const code = KeyMap.dirToKeyCode(randX, randY);
                        keycodeOrCmd = {code};
                    }
                    else {
                        // can't escape, just attack
                        const [aeX, aeY] = [enemy.getX(), enemy.getY()];
                        const eName = enemy.getName();
                        this.debug(`No escape! Attack ${eName} @${aeX},${aeY}`);
                        const attdX = aeX - pX;
                        const attdY = aeY - pY;
                        const code = KeyMap.dirToKeyCode(attdX, attdY);
                        keycodeOrCmd = {code};
                    }
                }
            }
        }
        else if (this.action === 'move north') {
            keycodeOrCmd = {code: KEY.MOVE_N};
        }
        else if (this.action === 'stairs') {
            keycodeOrCmd = {code: KEY.USE_STAIRS_DOWN};
        }
        else if (this.action === 'path') {
            if (!this.hasPath()) {
                RG.err('PlayerDriver', 'getPlayerCmd',
                       'Tried to shift coord from 0 length path');
            }

            const {x, y} = this.state.path.shift();
            // x = parseInt(x, 10);
            // y = parseInt(y, 10);
            const dX = x - pX;
            const dY = y - pY;
            this.debug(`Taking action path ${x},${y}, dX,dY ${dX},${dY}`);
            const code = KeyMap.dirToKeyCode(dX, dY);
            keycodeOrCmd = {code};
            if (!this.hasPath()) {
                this.debug('PlayerDriver finished a path');
            }
        }
        else if (this.action === 'run') {
            keycodeOrCmd = {code: KEY.RUN};
        }
        else if (this.action === 'selection') {
            // Always choose the first option
            keycodeOrCmd = {code: Keys.selectIndexToCode(0)};
        }
        return keycodeOrCmd;
    }

    public getLastAction(): string {
        return this.actions[this.actions.length - 1];
    }


    public printTurnInfo(visible: Cell[]): void {
        const [pX, pY] = this.player.getXY();
        const level = this.player.getLevel();
        const map = level.getMap();
        const hp = this.player.get('Health').getHP();

        const pos = `@${pX},${pY} ID: ${level.getID()}`;
        if (debug.enabled) {
            console.log(LINE);

        }
        this.debug(`T: ${this.nTurns} ${pos} | HP: ${hp}`);

        if (this.nTurns % this.screenPeriod === 0) {
            this.screen.render(pX, pY, map, visible);
            this.screen.printRenderedChars();
            console.log('='.repeat(78) + '\n');
        }

    }

    public addUsedStairs(cell: Cell): void {
        if (this.state.exitZone) {
            this.state.stairsStack.pop();
            this.debug('POP: stairsStack is now ', this.state.stairsStack);
            this.setState({exitZone: false}, 'addUsedStairs');
            return;
        }

        const stairs = cell.getStairs();
        if (!stairs) {
            RG.err('PlayerDriver', 'addUsedStairs',
                'Called on cell without stairs!');
            return;
        }

        const targetStairs = stairs.getTargetStairs() as Stairs;
        const targetLevel = stairs.getTargetLevel() as Level;
        const targetID = targetLevel.getID();
        const levelID = this.player.getLevel().getID();
        if (!this.state.visitedStairs.hasOwnProperty(levelID)) {
            this.state.visitedStairs[levelID] = {};
        }

        const [sx, sy] = [stairs.getX(), stairs.getY()];
        this.state.visitedStairs[levelID][sx + ',' + sy] = [sx, sy];

        const [tx, ty] = [targetStairs.getX(), targetStairs.getY()];
        this.state.stairsStack.push([targetID, tx, ty]);
        this.debug('PUSH: stairsStack is now ', this.state.stairsStack);
        if (!this.state.visitedStairs[targetID]) {
            this.state.visitedStairs[targetID] = {} as CoordMap;
        }
        // Prevent immediate return
        this.state.visitedStairs[targetID][tx + ',' + ty] = [tx, ty];
    }

    public setPathAction(toXY: TCoord): boolean {
        this.debug(`>> Looking for shortest path to cell ${toXY[0]},${toXY[1]}`);
        const pCell = this.player.getCell();
        const [pX, pY] = [pCell.getX(), pCell.getY()];
        const path = getShortestPath(pX, pY, toXY[0], toXY[1],
                                     this._passableCallback);
        if (path.length > 1) {
            this.debug('Found a non-zero path');
            this.state.path = path;
            this.state.path.shift(); // Discard 1st coord
            this.action = 'path';
            return true;
        }
        return false;
    }

    public movingToConnect(): boolean {
        return (this.state.useStairs || this.state.usePassage);
    }

    /* Returns most recently used stairs from the stack. */
    public getStairsMRU(): [number, number, number] {
        const lastN = this.state.stairsStack.length - 1;
        return this.state.stairsStack[lastN];
    }

    /* Checks if actor has explored a level long enough. */
    public shouldReturnBackUp(): boolean {
        if (this.state.stairsStack.length > 0 && this.state.exploreTurns <= 0) {
            const stairsXY = this.getStairsMRU();
            const x = stairsXY[1];
            const y = stairsXY[2];
            const cell = this.player.getLevel().getMap().getCell(x, y);
            this.tryToSetPathToCell([cell]);
            if (this.hasPath()) {
                this.action = 'path';
                this.debug('Returning back up the stairs now');
                this.setState({exitZone: true}, 'shouldReturn');
                return true;
            }
            else {
                this.debug('Cannot find path to return back');
            }
        }
        return false;

    }

    /* Can be used to serialize the driver object. */
    public toJSON(): any {
        return {
            cmds: this.cmds,
            actions: this.actions,
            nTurns: this.nTurns,
            state: this.state
        };
    }

    public debug(msg, obj = null): void {
        if (debug.enabled) {
            const pre = `T${this.nTurns}: `;
            let post = '';
            if (obj) {post = '\n' + JSON.stringify(obj);}
            debug(`${pre}${msg}${post}`);
        }
    }

    public setState(obj: Partial<DriverState>, msg?: string): void {
        if (msg && debug.enabled) {
            const str = JSON.stringify(obj);
            this.debug(`setState with ${str} |${msg}|`);
        }
        Object.keys(obj).forEach((key: StateKey) => {
            // Need to use this cause state contains booleans
            // Apparently breaking change in ts 3.5
            (this.state[key] as any) = obj[key];
        });

    }

    public levelExploredEnough(visible: Cell[]): boolean {
        const exploreDone = this.state.exploreTurns <= 0;
        return (
            exploreDone && !this.movingToConnect() &&
            this.newStairsSeen(visible)
        );
    }

    /* Returns true if player should pick up item from this cell. */
    public shouldPickupFromCell(pCell: Cell): boolean {
        if (pCell.hasItems()) {
            const items = pCell.getItems();
            if (items[0].getType() !== RG.ITEM_CORPSE) {
                return this.getLastAction() !== 'pickup';
            }
        }
        return false;
    }

    public notify(evtName, args): void {
        if (evtName === RG.EVT_TILE_CHANGED) {
            const {actor, target} = args;
            if (actor === this.player) {
                const id = target.getID();
                if (!this.state.tilesVisited[id]) {
                    this.state.tilesVisited[id] = 0;
                }
                this.state.tilesVisited[id] += 1;
            }
        }
    }

    /* Used by the path-finding algorith. */
    private _passableCallback(x, y): boolean {
        const map = this.player.getLevel().getMap();
        let res = map.isPassable(x, y);

        // Actor cell must be always passable, otherwise no path found
        if (!res) {
            res = (x === this.player.getX()) && (y === this.player.getY());
        }
        if (!res) {
            if (map.hasXY(x, y)) {
                const cell = map.getCell(x, y);
                res = cell.hasDoor();
            }
        }
        return res;
    }

}

PlayerDriver.fromJSON = function(json) {
    const driver = new PlayerDriver();
    Object.keys(json).forEach(key => {
        driver[key] = json[key];
    });
    return driver;
};
