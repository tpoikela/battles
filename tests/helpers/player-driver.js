
/* Player driver is used in testing instead of real human player to find
 * possibly buggy scenarios. Basically it's an AI based of if-elsif-else
 * statements.
 */

const RG = require('../../client/src/rg');
const Path = require('../../client/src/path');
const Screen = require('../../client/gui/screen');

const shortestPath = Path.getShortestPath;

const debug = require('debug')('bitn:PlayerDriver');

const MOVE_DIRS = [-1, 0, 1];

/**
 * Possible player states:
 * S_EXPLORE - Finding things based on priority list
 * S_PATH - Following a given path
 *
 */
const S_EXPLORE = 'S_EXPLORE';
/*
const S_PATH = 'S_PATH';
const S_STAIRS = 'S_STAIRS';
const S_PASSAGE = 'S_PASSAGE';
const S_FLEE = 'S_FLEE';
*/

/* This object can be used to simulate player actions in the world. It has 2
 * main uses:
 *  1. An AI to play the game and simulate player actions to find bugs
 *  2. A driver to automate some player actions like path-finding
 * */
const PlayerDriver = function(player) {

    let _player = player;
    this.action = '';
    this.state = S_EXPLORE;

    this.cmds = []; // Stores each command executed
    this.actions = ['']; // Stores each action taken
    this.path = []; // Stores calculated paths
    this.screen = new Screen(30, 14);
    this.usePassage = false;
    this.useStairs = false;

    // To keep track of stairs used for returning
    this.stairsStack = [];
    this.exploreTurns = 0;
    this.maxExploreTurns = 500; // Turns to spend in one level

    // To prevent double visits of dungeons etc
    this.visitedStairs = {};

    this.hpLow = 0.3;

    this.visited = {};
    this.seen = {};

    this.nTurns = 0;
    this.screenPeriod = 100;

    this.setPlayer = player => {_player = player;};

    /* Used by the path-finding algorith. */
    const _passableCallback = (x, y) => {
        const map = _player.getLevel().getMap();
        let res = map.isPassable(x, y);

        // Actor cell must be always passable, otherwise no path found
        if (!res) {
            res = (x === _player.getX()) && (y === _player.getY());
        }
        return res;
    };

    // Few simple guidelines:
    //   Attack/flee behaviour has priority
    //   Prefer going to north always if possible
    //   If any passages in sight, and level not visited, go there
    this.nextCmd = () => {
        const brain = _player.getBrain();
        const visible = _player.getLevel().getMap().getVisibleCells(_player);
        const around = RG.Brain.getCellsAroundActor(_player);
        const actorsAround = around.map(cell => cell.getFirstActor());
        this.action = '';

        // Only attack enemies very close
        let enemy = null;
        actorsAround.forEach(actor => {
            if (enemy === null) {
                if (actor && actor.isEnemy(_player)) {
                    enemy = actor;
                    if (this.hasEnoughHealth()) {
                        this.action = 'attack';
                    }
                    else if (!brain.isRunModeEnabled()) {
                        this.action = 'run';
                    }
                    else {
                        this.action = 'flee';
                    }
                    this.path = [];
                }
            }
        });
        if (this.action === '' && this.shouldRest()) {
            this.action = 'rest';
        }

        const [pX, pY] = _player.getXY();
        const level = _player.getLevel();
        this.addVisited(level, pX, pY);
        this.printTurnInfo(visible);

        ++this.nTurns;
        if (this.action === '') {this.tryExploringAround(visible);}

        //-------------------------------------------------------
        // Command post-processing, get command for Brain.Player
        //-------------------------------------------------------
        let result = this.getPlayerCmd(enemy);
        if (!result) {result = {code: RG.KEY.REST};}

        const cmdJson = JSON.stringify(result);
        const msg = `action: |${this.action}|, cmd: ${cmdJson}`;
        this.debug('>>> PlayerDriver ' + msg);

        this.cmds.push(result);
        this.actions.push(this.action);
        return result;
    };

    this.tryExploringAround = visible => {
        const map = _player.getLevel().getMap();
        const pCell = _player.getCell();
        const [pX, pY] = [pCell.getX(), pCell.getY()];
        --this.exploreTurns;
        if (this.path.length === 0) {
            const nX = pX;
            const nY = pY - 1;
            if (pCell.hasItems() && this.getLastAction() !== 'pickup') {
                this.action = 'pickup';
            }
            else if (this.shouldReturnBackUp()) {
                this.useStairs = true;
            }
            else if (!this.movingToConnect() && this.newStairsSeen(visible)) {
                this.useStairs = true;
                this.exploreTurns = this.maxExploreTurns;
            }
            // _player not at the top of area tile yet
            else if (!this.movingToConnect() && nY >= 0) {
                const nCell = map.getCell(nX, nY);
                if (nCell.isPassable() && !this.cellVisited(nCell)) {
                    this.action = 'move north';
                }
                else { // Try to find more complex path to north
                    this.findPathToMove(visible);
                }
            }
            else if (this.useStairs && pCell.hasStairs()) {
                this.useStairs = false;
                this.action = 'stairs';
                this.addUsedStairs(pCell);
            }
            else if (this.usePassage && pCell.hasPassage()) {
                this.usePassage = false;
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

    this.tryToSetPathToCell = cells => {
        const [pX, pY] = _player.getXY();
        this.path = [];
        cells.forEach(pCell => {
            if (this.path.length === 0) {
                const [cX, cY] = [pCell.getX(), pCell.getY()];
                this.debug(`>> Looking for shortest path to cell ${cX},${cY}`);
                const path = shortestPath(pX, pY, cX, cY, _passableCallback);
                if (path.length > 1) {
                    this.debug('Found a non-zero path');
                    this.path = path;
                    this.path.shift(); // Discard 1st coord
                    this.action = 'path';
                }
            }
        });
    };

    /* Tries to find a path to from current direction. */
    this.findPathToMove = (visible, acceptVisited = false) => {
        const [pX, pY] = _player.getXY();
        const northCells = visible.filter(cell => (
            cell.getY() < pY && cell.isPassable()
            && (acceptVisited || !this.cellVisited(cell))
        ));
        let ind = '';
        if (acceptVisited) {ind = '>>>>';}
        this.tryToSetPathToCell(northCells);
        this.debug(ind + '> Looking path to North');
        if (this.path.length > 0) {this.action = 'path';}
        else {
            const westCells = visible.filter(cell => (
                cell.getX() < pX && cell.isPassable()
                && (acceptVisited || !this.cellVisited(cell))
            ));
            this.tryToSetPathToCell(westCells);
            this.debug(ind + '>> Looking path to west');
            if (this.path.length > 0) {this.action = 'path';}
            else {
                const eastCells = visible.filter(cell => (
                    cell.getX() > pX && cell.isPassable()
                    && (acceptVisited || !this.cellVisited(cell))
                ));
                this.tryToSetPathToCell(eastCells);
                this.debug(ind + '>>> Looking path to east');
                if (this.path.length > 0) {this.action = 'path';}
                else {
                    const southCells = visible.filter(cell => (
                        cell.getY() > pY && cell.isPassable()
                        && (acceptVisited || !this.cellVisited(cell))
                    ));
                    this.tryToSetPathToCell(southCells);
                    this.debug(ind + '>>> Looking path to south east');
                    if (this.path.length > 0) {this.action = 'path';}
                    else if (acceptVisited) {
                        this.debug('We are screwed');
                    }
                    else {
                        // Still some hope left
                        this.debug(ind + '>>>> Looking passage out');
                        this.tryToFindPassage(visible, false);
                        if (this.path.length === 0) {
                            this.debug(ind + '>>>>> Looking visited cells now');
                            this.findAlreadySeenPassage();
                            if (this.path.length === 0) {
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
        return this.visited.hasOwnProperty(level.getID());
    };

    this.cellVisited = cell => {
        const id = _player.getLevel().getID();
        if (this.visited.hasOwnProperty(id)) {
            const [x, y] = [cell.getX(), cell.getY()];
            return this.visited[id].hasOwnProperty(x + ',' + y);
        }
        return false;
    };

    /* Adds a visited cell for the _player. */
    this.addVisited = (level, x, y) => {
        const id = level.getID();
        if (!this.visited.hasOwnProperty(id)) {
            this.visited[id] = {};
        }
        this.visited[id][x + ',' + y] = _player.getCell();
    };

    this.hasEnoughHealth = function() {
        const health = _player.get('Health');
        const maxHP = health.getMaxHP();
        const hp = health.getHP();
        if (hp > Math.round(this.hpLow * maxHP)) {
            return true;
        }
        return false;
    };

    this.shouldRest = function() {
        const health = _player.get('Health');
        const maxHP = health.getMaxHP();
        const hp = health.getHP();
        return hp < maxHP;
    };

    /* Tries to find unvisited stairs from visible cells and calculate a path
     * there. */
    this.newStairsSeen = visible => {
        const levelID = _player.getLevel().getID();
        const cellStairs = visible.find(cell => {
            const [x, y] = [cell.getX(), cell.getY()];
            if (!this.visitedStairs.hasOwnProperty(levelID)) {
                return cell.hasStairs();
            }
            else if (!this.visitedStairs[levelID][x + ',' + y]) {
                return cell.hasStairs();
            }
            return false;
        });
        if (cellStairs) {
            this.tryToSetPathToCell([cellStairs]);
            if (this.path.length > 0) {
                this.debug('Found path to stairs. Going there.');
                return true;
            }
        }
        return false;
    };

    this.tryToFindPassage = (visible, moveAfter = true) => {
        // const level = _player.getLevel();
        // const maxY = level.getMap().rows - 1;
        this.debug('> Looking for north passage cells');
        const passageCells = visible.filter(cell => (
            cell.hasPassage() && cell.getY() === 0
            && !this.passageVisited(cell)
        ));
        this.debug('> N passageCells' + passageCells.length);
        this.tryToSetPathToCell(passageCells);
        if (this.path.length > 0) {
            this.usePassage = true;
            this.action = 'path';
        }
        else {
            this.debug('>> Looking for west passage cells');
            const wPassageCells = visible.filter(cell => (
                cell.hasPassage() && cell.getX() === 0
                && !this.passageVisited(cell)
            ));
            this.tryToSetPathToCell(wPassageCells);
            if (this.path.length > 0) {
                this.usePassage = true;
                this.action = 'path';
            }
            else {
                this.debug('>> Looking for any passage cells');
                const anyPassageCell = visible.filter(cell => (
                    cell.hasPassage() && !this.passageVisited(cell)
                ));
                this.tryToSetPathToCell(anyPassageCell);
                if (this.path.length > 0) {
                    this.usePassage = true;
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
        const id = _player.getLevel().getID();
        const cells = Object.values(this.visited[id]);
        const newPassages = cells.filter(cell => (
            cell.hasPassage() && !this.passageVisited(cell)
        ));
        this.debug('Looking at non-visited passages');
        this.tryToSetPathToCell(newPassages);
        if (this.path.length > 0) {
            this.usePassage = true;
            this.action = 'path';
        }
        else {
            this.debug('Looking at visited passages');
            const allPassages = cells.filter(cell => (
                cell.hasPassage()
            ));
            this.tryToSetPathToCell(allPassages);
            if (this.path.length > 0) {
                this.usePassage = true;
                this.action = 'path';
            }
            else {
                this.debug('Nothing found among passages. Screwed!');
            }
        }

    };

    /* Returns the command (or code) give to game.update(). */
    this.getPlayerCmd = (enemy) => {
        let result = null;
        const map = _player.getLevel().getMap();
        const [pX, pY] = _player.getXY();
        if (this.action === 'attack') {
            const [eX, eY] = [enemy.getX(), enemy.getY()];
            const dX = eX - pX;
            const dY = eY - pY;
            const code = RG.KeyMap.dirToKeyCode(dX, dY);
            result = {code};
        }
        else if (this.action === 'pickup') {
            result = {code: RG.KEY.PICKUP};
        }
        else if (this.action === 'flee') {
            const pCell = _player.getCell();
            if (pCell.hasPassage()) {
                result = {code: RG.KEY.USE_STAIRS_DOWN};
            }
            else {
                const [eX, eY] = [enemy.getX(), enemy.getY()];
                // Invert direction for escape
                const dX = -1 * (eX - pX);
                const dY = -1 * (eY - pY);
                const newX = pX + dX;
                const newY = pY + dY;
                if (map.isPassable(newX, newY)) {
                    const code = RG.KeyMap.dirToKeyCode(dX, dY);
                    this.debug(`flee to dx,dy ${dX},${dY}`);
                    result = {code};
                }
                else { // Pick a random direction
                    this.debug('Pick random direction for fleeing');
                    let randX = RG.RAND.arrayGetRand(MOVE_DIRS);
                    let randY = RG.RAND.arrayGetRand(MOVE_DIRS);
                    const maxTries = 20;
                    let tries = 0;
                    while (!map.isPassable(pX + randX, pY + randY)) {
                        randX = RG.RAND.arrayGetRand(MOVE_DIRS);
                        randY = RG.RAND.arrayGetRand(MOVE_DIRS);
                        ++tries;
                        if (tries >= maxTries) {break;}
                    }

                    if (map.isPassable(randX, randY)) {
                        this.debug(`flee rand dir to dx,dy ${randX},${randY}`);
                        const code = RG.KeyMap.dirToKeyCode(randX, randY);
                        result = {code};
                    }
                    else {
                        // can't escape, just attack
                        const [eX, eY] = [enemy.getX(), enemy.getY()];
                        const eName = enemy.getName();
                        this.debug(`No escape! Attack ${eName} @${eX},${eY}`);
                        const dX = eX - pX;
                        const dY = eY - pY;
                        const code = RG.KeyMap.dirToKeyCode(dX, dY);
                        result = {code};
                    }
                }
            }
        }
        else if (this.action === 'move north') {
            result = {code: RG.KEY.MOVE_N};
        }
        else if (this.action === 'stairs') {
            result = {code: RG.KEY.USE_STAIRS_DOWN};
        }
        else if (this.action === 'path') {
            let {x, y} = this.path.shift();
            x = parseInt(x, 10);
            y = parseInt(y, 10);
            const dX = x - pX;
            const dY = y - pY;
            this.debug(`Taking this.action path ${x},${y}, dX,dY ${dX},${dY}`);
            const code = RG.KeyMap.dirToKeyCode(dX, dY);
            result = {code};
            if (this.path.length === 0) {
                this.debug('PlayerDriver finished a path');
            }
        }
        else if (this.action === 'run') {
            result = {code: RG.KEY.RUN};
        }

        return result;
    };

    this.getLastAction = () => {
        return this.actions[this.actions.length - 1];
    };


    this.printTurnInfo = visible => {
        const [pX, pY] = _player.getXY();
        const level = _player.getLevel();
        const map = level.getMap();
        const hp = _player.get('Health').getHP();

        const pos = `@${pX},${pY} ID: ${level.getID()}`;
        this.debug(`T: ${this.nTurns} ${pos} | HP: ${hp}`);

        if (this.nTurns % this.screenPeriod === 0) {
            this.screen.render(pX, pY, map, visible);
            this.screen.printRenderedChars();
        }

    };

    this.addUsedStairs = cell => {
        const stairs = cell.getStairs();
        const targetStairs = stairs.getTargetStairs();
        const targetLevel = stairs.getTargetLevel();
        const targetID = targetLevel.getID();
        const id = _player.getLevel().getID();
        if (!this.visitedStairs.hasOwnProperty(id)) {
            this.visitedStairs[id] = {};
        }

        const [sx, sy] = [stairs.getX(), stairs.getY()];
        this.visitedStairs[id][sx + ',' + sy] = [sx, sy];

        const [tx, ty] = [targetStairs.getX(), targetStairs.getY()];
        this.stairsStack.push([targetID, tx, ty]);
        if (!this.visitedStairs[targetID]) {
            this.visitedStairs[targetID] = {};
        }
        // Prevent immediate return
        this.visitedStairs[targetID][tx + ',' + ty] = [targetID, tx, ty];

    };

    this.movingToConnect = () => (
        this.useStairs || this.usePassage
    );

    /* Checks if actor has explored a level long enough. */
    this.shouldReturnBackUp = () => {
        if (this.stairsStack.length > 0 && this.exploreTurns <= 0) {
            const stairsXY = this.stairsStack[this.stairsStack.length - 1];
            const x = stairsXY[1];
            const y = stairsXY[2];
            const cell = _player.getLevel().getMap().getCell(x, y);
            this.tryToSetPathToCell([cell]);
            if (this.path.length > 0) {
                this.action = 'path';
                this.debug('Returning back up the stairs now');
                return true;
            }
        }
        return false;

    };

    /* Can be used to serialize the driver object. */
    this.toJSON = () => {
        const visited = {};
        const seen = {};
        return {
            visited,
            seen,
            cmds: this.cmds,
            path: this.path,
            nTurns: this.nTurns,
            stairsStack: this.stairsStack,
            visitedStairs: this.visitedStairs
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

};

module.exports = PlayerDriver;
