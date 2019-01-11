
/* Player driver is used in testing instead of real human player to find
 * possibly buggy scenarios. Basically it's an AI based of if-elsif-else
 * statements.
 */

import RG from '../../client/src/rg';
import {Path} from '../../client/src/path';
import {Screen} from '../../client/gui/screen';
import {Keys} from '../../client/src/keymap';
import {EventPool} from '../../client/src/eventpool';
import {Brain} from '../../client/src/brain';
import {Random} from '../../client/src/random';

import {Cell} from '../../client/src/map.cell';
import {SentientActor} from '../../client/src/actor';

const RNG = Random.getRNG();
const {KEY, KeyMap} = Keys;
const {getShortestPath} = Path;

import dbg = require('debug');
const debug = dbg('bitn:PlayerDriver');

const MOVE_DIRS = [-1, 0, 1];
const LINE = '='.repeat(78);
const POOL = EventPool.getPool();

/* This object can be used to simulate player actions in the world. It has 2
 * main uses:
 *  1. An AI to play the game and simulate player actions to find bugs
 *  2. A driver to automate some player actions like path-finding
 * */
export const PlayerDriver = function(player?: SentientActor) {

    this._player = player;
    this.action = '';
    this.enemy = null;

    this.cmds = []; // Stores each command executed
    this.actions = ['']; // Stores each action taken
    this.screen = new Screen(30, 14);

    this.cache = {
    };

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

    // To keep track of stairs used for returning
    this.maxExploreTurns = 500; // Turns to spend in one level

    this.hpLow = 0.3;

    this.nTurns = 0;
    this.screenPeriod = 10000;

    this.setPlayer = pl => {this._player = pl;};

    /* Used by the path-finding algorith. */
    const _passableCallback = (x, y) => {
        const map = this._player.getLevel().getMap();
        let res = map.isPassable(x, y);

        // Actor cell must be always passable, otherwise no path found
        if (!res) {
            res = (x === this._player.getX()) && (y === this._player.getY());
        }
        return res;
    };

    /* Required for the player driver. */
    this.getNextCode = () => {
        const cmdOrCode = this.nextCmd();
        if (cmdOrCode.code) {return cmdOrCode.code;}
        else {return cmdOrCode;}
    };

    this.hasKeys = (): boolean => true;

    this.reset = (): void => {
        this.state.usePassage = false;
        this.state.useStairs = false;
        this.state.exitZone = false;
        this.state.path = [];

    };

    // Returns the next command given to game.update().
    // Few simple guidelines:
    //   1. Attack/flee behaviour has priority
    //   2. Prefer going to north always if possible
    //   3. If any passages in sight, and level not visited, go there
    //      - Start a counter. When that expires, go back up.
    this.nextCmd = () => {
        this.action = '';

        // Record current x,y as visited
        const [pX, pY] = this._player.getXY();
        const level = this._player.getLevel();
        this.addVisited(level, pX, pY);

        const visible = this._player.getLevel().getMap().getVisibleCells(this._player);
        this.printTurnInfo(visible);

        this.checkForSelection();
        if (this.action === '') {this.checkForEnemies();}
        if (this.action === '') {this.tryExploringAround(visible);}

        //-------------------------------------------------------
        // Command post-processing, get command for Brain.Player
        //-------------------------------------------------------
        let keycodeOrCmd = this.getPlayerCmd();
        if (!keycodeOrCmd) {keycodeOrCmd = {code: KEY.REST};}

        const cmdJson = JSON.stringify(keycodeOrCmd);
        const msg = `action: |${this.action}|, cmd: ${cmdJson}`;
        this.debug('>>> PlayerDriver ' + msg);

        ++this.nTurns;
        this.cmds.push(keycodeOrCmd);
        this.actions.push(this.action);
        return keycodeOrCmd;
    };

    this.checkForSelection = () => {
        const brain = this._player.getBrain();
        if (brain.isMenuShown()) {
            this.action = 'selection';
        }
    };

    /* Checks for surrounding enemies and whether to attack or not. Checks also
     * for requirement to rest and gain health. */
    this.checkForEnemies = () => {
        const brain = this._player.getBrain();
        const around = Brain.getCellsAroundActor(this._player);
        const actorsAround = around.map(cell => cell.getFirstActor());
        this.enemy = null;
        actorsAround.forEach(actor => {
            if (this.enemy === null) {
                if (actor && actor.isEnemy(this._player)) {
                    this.enemy = actor;
                    if (this.hasEnoughHealth()) {
                        this.action = 'attack';
                    }
                    else if (!brain.isRunModeEnabled()) {
                        this.action = 'run';
                    }
                    else {
                        this.action = 'flee';
                    }
                    this.state.path = [];
                }
            }
        });
        if (this.action === '' && this.shouldRest()) {
            this.action = 'rest';
        }
    };

    this.tryExploringAround = visible => {
        const map = this._player.getLevel().getMap();
        const pCell = this._player.getCell();
        const [pX, pY] = [pCell.getX(), pCell.getY()];
        --this.state.exploreTurns;
        if (this.state.exploreTurns === 0) {
            console.log('ZERO EXPLORE TURNS NOW');
        }

        if (this.state.path.length === 0) {
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
            // this._player not at the top of area tile yet
            else if (!this.movingToConnect() && nY >= 0) {
                const nCell = map.getCell(nX, nY);
                if (nCell.isPassable() && !this.cellVisited(nCell)) {
                    this.action = 'move north';
                }
                else { // Try to find more complex path to north
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
    };

    this.tryToSetPathToCell = (cells: Cell[]): void => {
        const [pX, pY] = this._player.getXY();
        this.state.path = [];
        cells.forEach(pCell => {
            if (this.state.path.length === 0) {
                const [cX, cY] = [pCell.getX(), pCell.getY()];
                this.debug(`>> Looking for shortest path to cell ${cX},${cY}`);
                const path = getShortestPath(pX, pY, cX, cY, _passableCallback);
                if (path.length > 1) {
                    this.debug('Found a non-zero path');
                    this.state.path = path;
                    this.state.path.shift(); // Discard 1st coord
                    this.action = 'path';
                }
            }
        });
    };

    /* Tries to find a path to from current direction. */
    this.findPathToMove = (visible, acceptVisited = false) => {
        const [pX, pY] = this._player.getXY();
        const northCells = visible.filter(cell => (
            cell.getY() < pY && cell.isPassable()
            && (acceptVisited || !this.cellVisited(cell))
        ));
        let ind = '';
        if (acceptVisited) {ind = '>>>>';}
        this.tryToSetPathToCell(northCells);
        this.debug(ind + '> Looking path to North');
        if (this.state.path.length > 0) {this.action = 'path';}
        else {
            const westCells = visible.filter(cell => (
                cell.getX() < pX && cell.isPassable()
                && (acceptVisited || !this.cellVisited(cell))
            ));
            this.tryToSetPathToCell(westCells);
            this.debug(ind + '>> Looking path to west');
            if (this.state.path.length > 0) {this.action = 'path';}
            else {
                const eastCells = visible.filter(cell => (
                    cell.getX() > pX && cell.isPassable()
                    && (acceptVisited || !this.cellVisited(cell))
                ));
                this.tryToSetPathToCell(eastCells);
                this.debug(ind + '>>> Looking path to east');
                if (this.state.path.length > 0) {this.action = 'path';}
                else {
                    const southCells = visible.filter(cell => (
                        cell.getY() > pY && cell.isPassable()
                        && (acceptVisited || !this.cellVisited(cell))
                    ));
                    this.tryToSetPathToCell(southCells);
                    this.debug(ind + '>>> Looking path to south east');
                    if (this.state.path.length > 0) {this.action = 'path';}
                    else if (acceptVisited) {
                        this.debug('We are screwed');
                    }
                    else {
                        // Still some hope left
                        this.debug(ind + '>>>> Looking passage out');
                        this.tryToFindPassage(visible, false);
                        if (this.state.path.length === 0) {
                            this.debug(ind + '>>>>> Looking visited cells now');
                            this.findAlreadySeenPassage();
                            if (this.state.path.length === 0) {
                                this.findPathToMove(visible, true);
                            }
                        }
                        else {
                            this.action = 'path';
                        }
                    }
                }
            }
        }
    };

    this.levelVisited = level => {
        return this.state.visited.hasOwnProperty(level.getID());
    };

    this.cellVisited = cell => {
        const id = this._player.getLevel().getID();
        if (this.state.visited.hasOwnProperty(id)) {
            const [x, y] = [cell.getX(), cell.getY()];
            return this.state.visited[id].hasOwnProperty(x + ',' + y);
        }
        return false;
    };

    /* Adds a visited cell for the this._player. */
    this.addVisited = (level, x, y) => {
        const id = level.getID();
        if (!this.state.visited.hasOwnProperty(id)) {
            this.state.visited[id] = {};
        }
        const cell = this._player.getCell();
        this.state.visited[id][x + ',' + y] = {
            x, y, hasPassage: cell.hasPassage()
        };
    };

    this.hasEnoughHealth = function() {
        const health = this._player.get('Health');
        const maxHP = health.getMaxHP();
        const hp = health.getHP();
        if (hp > Math.round(this.hpLow * maxHP)) {
            return true;
        }
        return false;
    };

    this.shouldRest = function(): boolean {
        const health = this._player.get('Health');
        const maxHP = health.getMaxHP();
        const hp = health.getHP();
        return hp < maxHP;
    };

    /* Tries to find unvisited stairs from visible cells and calculate a path
     * there. */
    this.newStairsSeen = (visible: Cell[]): boolean => {
        const levelID = this._player.getLevel().getID();
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
            if (this.state.path.length > 0) {
                this.debug('Found path to stairs. Going there.');
                return true;
            }
        }
        return false;
    };

    this.tryToFindPassage = (visible: Cell[], moveAfter = true): void => {
        // const level = this._player.getLevel();
        // const maxY = level.getMap().rows - 1;
        this.debug('> Looking for north passage cells');
        const passageCells: Cell[] = visible.filter(cell => (
            cell.hasPassage() && cell.getY() === 0
            && !this.passageVisited(cell)
        ));
        this.debug('> N passageCells ' + passageCells.length);
        this.tryToSetPathToCell(passageCells);
        if (this.state.path.length > 0) {
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
            if (this.state.path.length > 0) {
                this.setState({usePassage: true}, 'west passage');
                this.action = 'path';
            }
            else {
                this.debug('>> Looking for any passage cells');
                const anyPassageCell = visible.filter(cell => (
                    cell.hasPassage() && !this.passageVisited(cell)
                ));
                this.tryToSetPathToCell(anyPassageCell);
                if (this.state.path.length > 0) {
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
    };

    this.passageVisited = cell => {
        const passage = cell.getPassage();
        const target = passage.getTargetLevel();
        return this.levelVisited(target);
    };

    this.findAlreadySeenPassage = () => {
        this.debug('Looking at remembered passages');

        // const cellData = Object.values(this.state.visited[id]);
        const newPassages = this.findVisitedCells(cell => (
            cell.hasPassage() && !this.passageVisited(cell)
        ));

        /* const newPassages = cells.filter(cell => (
            cell.hasPassage() && !this.passageVisited(cell)
        ));*/
        this.debug('Looking at non-visited passages');
        this.tryToSetPathToCell(newPassages);
        if (this.state.path.length > 0) {
            this.setState({usePassage: true}, 'already seen passage');
            this.action = 'path';
        }
        else {
            this.debug('Looking at visited passages');
            const allPassages = this.findVisitedCells(cell => (
                cell.hasPassage()
            ));
            this.tryToSetPathToCell(allPassages);
            if (this.state.path.length > 0) {
                this.setState({usePassage: true}, 'already seen passage');
                this.action = 'path';
            }
            else {
                this.debug('Nothing found among passages. Screwed!');
            }
        }

    };

    this.findVisitedCells = (func) => {
        const map = this._player.getLevel().getMap();
        const id = this._player.getLevel().getID();
        const cellObjs = Object.values(this.state.visited[id]);
        const cells = cellObjs.map((obj: any) => map.getCell(obj.x, obj.y));
        return cells.filter(func);
    };

    /* Returns the command (or code) give to game.update(). */
    this.getPlayerCmd = () => {
        const enemy = this.enemy;
        let keycodeOrCmd = null;
        const map = this._player.getLevel().getMap();
        const [pX, pY] = this._player.getXY();
        if (this.action === 'attack') {
            const [eX, eY] = [enemy.getX(), enemy.getY()];
            const dX = eX - pX;
            const dY = eY - pY;
            const code = KeyMap.dirToKeyCode(dX, dY);
            keycodeOrCmd = {code};
        }
        else if (this.action === 'pickup') {
            keycodeOrCmd = {code: KEY.PICKUP};
        }
        else if (this.action === 'flee') {
            const pCell = this._player.getCell();
            if (pCell.hasPassage()) {
                keycodeOrCmd = {code: KEY.USE_STAIRS_DOWN};
            }
            else {
                const [eX, eY] = [enemy.getX(), enemy.getY()];
                // Invert direction for escape
                const dX = -1 * (eX - pX);
                const dY = -1 * (eY - pY);
                const newX = pX + dX;
                const newY = pY + dY;

                if (map.isPassable(newX, newY)) {
                    const code = KeyMap.dirToKeyCode(dX, dY);
                    this.debug(`flee to dx,dy ${dX},${dY}`);
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
            let {x, y} = this.state.path.shift();
            x = parseInt(x, 10);
            y = parseInt(y, 10);
            const dX = x - pX;
            const dY = y - pY;
            this.debug(`Taking action path ${x},${y}, dX,dY ${dX},${dY}`);
            const code = KeyMap.dirToKeyCode(dX, dY);
            keycodeOrCmd = {code};
            if (this.state.path.length === 0) {
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
    };

    this.getLastAction = () => {
        return this.actions[this.actions.length - 1];
    };


    this.printTurnInfo = visible => {
        const [pX, pY] = this._player.getXY();
        const level = this._player.getLevel();
        const map = level.getMap();
        const hp = this._player.get('Health').getHP();

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

    };

    this.addUsedStairs = (cell: Cell) => {
        if (this.state.exitZone) {
            this.state.stairsStack.pop();
            this.debug('POP: stairsStack is now ', this.state.stairsStack);
            this.setState({exitZone: false}, 'addUserStairs');
            return;
        }

        const stairs = cell.getStairs();
        const targetStairs = stairs.getTargetStairs();
        const targetLevel = stairs.getTargetLevel();
        const targetID = targetLevel.getID();
        const id = this._player.getLevel().getID();
        if (!this.state.visitedStairs.hasOwnProperty(id)) {
            this.state.visitedStairs[id] = {};
        }

        const [sx, sy] = [stairs.getX(), stairs.getY()];
        this.state.visitedStairs[id][sx + ',' + sy] = [sx, sy];

        const [tx, ty] = [targetStairs.getX(), targetStairs.getY()];
        this.state.stairsStack.push([targetID, tx, ty]);
        this.debug('PUSH: stairsStack is now ', this.state.stairsStack);
        if (!this.state.visitedStairs[targetID]) {
            this.state.visitedStairs[targetID] = {};
        }
        // Prevent immediate return
        this.state.visitedStairs[targetID][tx + ',' + ty] = [targetID, tx, ty];

    };

    this.movingToConnect = () => (
        this.state.useStairs || this.state.usePassage
    );

    this.getStairsMRU = () => {
        const lastN = this.state.stairsStack.length - 1;
        return this.state.stairsStack[lastN];
    };

    /* Checks if actor has explored a level long enough. */
    this.shouldReturnBackUp = () => {
        if (this.state.stairsStack.length > 0 && this.state.exploreTurns <= 0) {
            const stairsXY = this.getStairsMRU();
            const x = stairsXY[1];
            const y = stairsXY[2];
            const cell = this._player.getLevel().getMap().getCell(x, y);
            this.tryToSetPathToCell([cell]);
            if (this.state.path.length > 0) {
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

    };

    /* Can be used to serialize the driver object. */
    this.toJSON = () => {
        return {
            cmds: this.cmds,
            actions: this.actions,
            nTurns: this.nTurns,
            state: this.state
        };
    };

    this.debug = (msg, obj = null) => {
        if (debug.enabled) {
            const pre = `T${this.nTurns}: `;
            let post = '';
            if (obj) {post = '\n' + JSON.stringify(obj);}
            debug(`${pre}${msg}${post}`);
        }
    };

    this.setState = (obj, msg = null) => {
        if (msg && debug.enabled) {
            const str = JSON.stringify(obj);
            this.debug(`setState with ${str} |${msg}|`);
        }
        Object.keys(obj).forEach(key => {
            this.state[key] = obj[key];
        });

    };

    this.levelExploredEnough = visible => {
        const exploreDone = this.state.exploreTurns <= 0;
        return (
            exploreDone && !this.movingToConnect() &&
            this.newStairsSeen(visible)
        );
    };

    /* Returns true if player should pick up item from this cell. */
    this.shouldPickupFromCell = pCell => {
        if (pCell.hasItems()) {
            const items = pCell.getItems();
            if (items[0].getType() !== RG.ITEM_CORPSE) {
                return this.getLastAction() !== 'pickup';
            }
        }
        return false;
    };

    this.hasNotify = true;
    this.notify = (evtName, args) => {
        if (evtName === RG.EVT_TILE_CHANGED) {
            const {actor, target} = args;
            if (actor === player) {
                const id = target.getID();
                if (!this.state.tilesVisited[id]) {
                    this.state.tilesVisited[id] = 0;
                }
                this.state.tilesVisited[id] += 1;
            }
        }
    };
    POOL.listenEvent(RG.EVT_TILE_CHANGED, this);

};

PlayerDriver.fromJSON = function(json) {
    const driver = new PlayerDriver();
    Object.keys(json).forEach(key => {
        driver[key] = json[key];
    });
    return driver;
};
