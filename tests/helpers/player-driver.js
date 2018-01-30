
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

/* This object can be used to simulate player actions in the world. It has 2
 * main uses:
 *  1. An AI to play the game and simulate player actions to find bugs
 *  2. 
 * */
const PlayerDriver = function(player) {

    this.cmds = []; // Stores each command executed
    this.actions = ['']; // Stores each action taken
    this.path = [];
    let action = '';
    this.screen = new Screen(30, 14);
    this.usePassage = false;

    this.hpLow = 0.3;

    this.visited = {};
    this.seen = {};

    this.nTurns = 0;
    this.screenPeriod = 100;

    const _passableCallback = (x, y) => {
        const map = player.getLevel().getMap();
        let res = map.isPassable(x, y);

        // Actor cell must be always passable, otherwise no path found
        if (!res) {
            res = (x === player.getX()) && (y === player.getY());
        }
        return res;
    };

    // Few simple guidelines:
    //   Prefer going to north always if possible
    //   If any passages in sight, and level not visited, go there
    this.nextCmd = () => {
        const brain = player.getBrain();
        const visible = player.getLevel().getMap().getVisibleCells(player);
        const around = RG.Brain.getCellsAroundActor(player);
        const actorsAround = around.map(cell => cell.getFirstActor());
        action = '';

        // Only attack enemies very close
        let enemy = null;
        actorsAround.forEach(actor => {
            if (enemy === null) {
                if (actor && actor.isEnemy(player)) {
                    enemy = actor;
                    if (this.hasEnoughHealth()) {
                        action = 'attack';
                    }
                    else if (!brain.isRunModeEnabled()) {
                        action = 'run';
                    }
                    else {
                        action = 'flee';
                    }
                    this.path = [];
                }
            }
        });
        if (action === '' && this.shouldRest()) {
            action = 'rest';
        }

        const [pX, pY] = [player.getX(), player.getY()];
        const level = player.getLevel();
        this.addVisited(level, pX, pY);

        const map = player.getLevel().getMap();
        const hp = player.get('Health').getHP();

        const pos = `@${pX},${pY} ID: ${level.getID()}`;
        debug(`T: ${this.nTurns} ${pos} | HP: ${hp}`);

        if (this.nTurns % this.screenPeriod === 0) {
            this.screen.render(pX, pY, map, visible);
            this.screen.printRenderedChars();
        }
        ++this.nTurns;
        if (action === '') {this.tryExploringAround(visible);}

        let result = this.getPlayerCmd(enemy);
        if (!result) {result = {code: RG.KEY.REST};}

        const cmdJson = JSON.stringify(result);
        const msg = `Action: |${action}|, cmd: ${cmdJson}`;
        debug('>>> PlayerDriver ' + msg);

        this.cmds.push(result);
        this.actions.push(action);
        return result;
    };

    this.tryExploringAround = visible => {
        const map = player.getLevel().getMap();
        const pCell = player.getCell();
        const [pX, pY] = [pCell.getX(), pCell.getY()];
        if (this.path.length === 0) {
            const nX = pX;
            const nY = pY - 1;
            if (pCell.hasItems() && this.getLastAction() !== 'pickup') {
                action = 'pickup';
            }
            else if (!this.usePassage && nY >= 0) { // Player not at the top
                const nCell = map.getCell(nX, nY);
                if (nCell.isPassable() && !this.cellVisited(nCell)) {
                    action = 'move north';
                }
                else { // Try to find more complex path to north
                    this.findPathToMove(visible);
                }
            }
            else if (this.usePassage && pCell.hasPassage()) {
                this.usePassage = false;
                action = 'stairs';
            }
            else if (pCell.hasPassage() && !this.passageVisited(pCell)) {
                action = 'stairs';
            }
            else {
                // Try to passage out
                this.tryToFindPassage(visible);
            }
        }
        else { // Move using pre-computed path
            action = 'path';
        }
    };


    this.tryToSetPathToCell = cells => {
        // const map = player.getLevel().getMap();
        const [pX, pY] = player.getXY();
        this.path = [];
        cells.forEach(pCell => {
            if (this.path.length === 0) {
                const [cX, cY] = [pCell.getX(), pCell.getY()];
                debug(`>> Looking for shortest path to cell ${cX},${cY}`);
                const path = shortestPath(pX, pY, cX, cY, _passableCallback);
                if (path.length > 1) {
                    debug('Found a non-zero path');
                    this.path = path;
                    this.path.shift(); // Discard 1st coord
                    action = 'path';
                }
            }
        });
    };

    /* Tries to find a path to from current direction. */
    this.findPathToMove = (visible, acceptVisited = false) => {
        const [pX, pY] = player.getXY();
        const nCells = visible.filter(cell => (
            cell.getY() < pY && cell.isPassable()
            && (acceptVisited || !this.cellVisited(cell))
        ));
        let ind = '';
        if (acceptVisited) {ind = '>>>>';}
        this.tryToSetPathToCell(nCells);
        debug(ind + '> Looking path to North');
        if (this.path.length > 0) {action = 'path';}
        else {
            const wCells = visible.filter(cell => (
                cell.getX() < pX && cell.isPassable()
                && (acceptVisited || !this.cellVisited(cell))
            ));
            this.tryToSetPathToCell(wCells);
            debug(ind + '>> Looking path to west');
            if (this.path.length > 0) {action = 'path';}
            else {
                const eCells = visible.filter(cell => (
                    cell.getX() > pX && cell.isPassable()
                    && (acceptVisited || !this.cellVisited(cell))
                ));
                this.tryToSetPathToCell(eCells);
                debug(ind + '>>> Looking path to east');
                if (this.path.length > 0) {action = 'path';}
                else {
                    const sCells = visible.filter(cell => (
                        cell.getY() > pY && cell.isPassable()
                        && (acceptVisited || !this.cellVisited(cell))
                    ));
                    this.tryToSetPathToCell(sCells);
                    debug(ind + '>>> Looking path to south east');
                    if (this.path.length > 0) {action = 'path';}
                    else if (acceptVisited) {
                        debug('We are screwed');
                    }
                    else {
                        // Still hope to home
                        debug(ind + '>>>> Looking passage out');
                        this.tryToFindPassage(visible, false);
                        if (this.path.length === 0) {
                            debug(ind + '>>>>> Looking visited cells now');
                            this.findAlreadySeenPassage();
                            if (this.path.length === 0) {
                                this.findPathToMove(visible, true);
                            }
                        }
                        else {
                            action = 'path';
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
        const id = player.getLevel().getID();
        if (this.visited.hasOwnProperty(id)) {
            const [x, y] = [cell.getX(), cell.getY()];
            return this.visited[id].hasOwnProperty(x + ',' + y);
        }
        return false;
    };

    /* Adds a visited cell for the player. */
    this.addVisited = (level, x, y) => {
        const id = level.getID();
        if (!this.visited.hasOwnProperty(id)) {
            this.visited[id] = {};
        }
        this.visited[id][x + ',' + y] = player.getCell();
    };

    this.hasEnoughHealth = function() {
        const health = player.get('Health');
        const maxHP = health.getMaxHP();
        const hp = health.getHP();
        if (hp > Math.round(this.hpLow * maxHP)) {
            return true;
        }
        return false;
    };

    this.shouldRest = function() {
        const health = player.get('Health');
        const maxHP = health.getMaxHP();
        const hp = health.getHP();
        return hp < maxHP;
    };

    this.tryToFindPassage = (visible, moveAfter = true) => {
        // const level = player.getLevel();
        // const maxY = level.getMap().rows - 1;
        debug('> Looking for north passage cells');
        const passageCells = visible.filter(cell => (
            cell.hasPassage() && cell.getY() === 0
            && !this.passageVisited(cell)
        ));
        debug('> N passageCells' + passageCells.length);
        this.tryToSetPathToCell(passageCells);
        if (this.path.length > 0) {
            this.usePassage = true;
            action = 'path';
        }
        else {
            debug('>> Looking for west passage cells');
            const wPassageCells = visible.filter(cell => (
                cell.hasPassage() && cell.getX() === 0
                && !this.passageVisited(cell)
            ));
            this.tryToSetPathToCell(wPassageCells);
            if (this.path.length > 0) {
                this.usePassage = true;
                action = 'path';
            }
            else {
                debug('>> Looking for any passage cells');
                const anyPassageCell = visible.filter(cell => (
                    cell.hasPassage() && !this.passageVisited(cell)
                ));
                this.tryToSetPathToCell(anyPassageCell);
                if (this.path.length > 0) {
                    this.usePassage = true;
                    action = 'path';
                }
                else if (moveAfter) {
                    debug('>>> No passages. Trying to move.');
                    this.findPathToMove(visible);
                }
                else {
                    debug('>>> No passages. Terminating.');
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
        debug('Looking at remembered passages');
        const id = player.getLevel().getID();
        const cells = Object.values(this.visited[id]);
        const newPassages = cells.filter(cell => (
            cell.hasPassage() && !this.passageVisited(cell)
        ));
        debug('Looking at non-visited passages');
        this.tryToSetPathToCell(newPassages);
        if (this.path.length > 0) {
            this.usePassage = true;
            action = 'path';
        }
        else {
            debug('Looking at visited passages');
            const allPassages = cells.filter(cell => (
                cell.hasPassage()
            ));
            this.tryToSetPathToCell(allPassages);
            if (this.path.length > 0) {
                this.usePassage = true;
                action = 'path';
            }
            else {
                debug('Nothing found among passages. Screwed!');
            }
        }

    };

    /* Returns the command (or code) give to game.update(). */
    this.getPlayerCmd = (enemy) => {
        let result = null;
        const map = player.getLevel().getMap();
        const [pX, pY] = player.getXY();
        if (action === 'attack') {
            const [eX, eY] = [enemy.getX(), enemy.getY()];
            const dX = eX - pX;
            const dY = eY - pY;
            const code = RG.KeyMap.dirToKeyCode(dX, dY);
            result = {code};
        }
        else if (action === 'pickup') {
            result = {code: RG.KEY.PICKUP};
        }
        else if (action === 'flee') {
            const pCell = player.getCell();
            if (pCell.hasPassage()) {
                result = {code: RG.KEY.USE_STAIRS_DOWN};
            }
            else {
                const [eX, eY] = [enemy.getX(), enemy.getY()];
                // Invert direction for escape
                let dX = -1 * (eX - pX);
                let dY = -1 * (eY - pY);
                const newX = pX + dX;
                const newY = pY + dY;
                if (map.isPassable(newX, newY)) {
                    const code = RG.KeyMap.dirToKeyCode(dX, dY);
                    result = {code};
                }
                else { // Pick a random direction
                    let randX = RG.RAND.arrayGetRand(MOVE_DIRS);
                    let randY = RG.RAND.arrayGetRand(MOVE_DIRS);
                    const maxTries = 20;
                    let tries = 0;
                    while (!map.isPassable(randX, randY) && tries < maxTries) {
                        randX = RG.RAND.arrayGetRand(MOVE_DIRS);
                        randY = RG.RAND.arrayGetRand(MOVE_DIRS);
                        ++tries;
                    }

                    if (map.isPassable(randX, randY)) {
                        dX = randX - pX;
                        dY = randY - pY;
                        const code = RG.KeyMap.dirToKeyCode(dX, dY);
                        result = {code};
                    }
                    else {
                        // can't escape, just attack
                        const [eX, eY] = [enemy.getX(), enemy.getY()];
                        const eName = enemy.getName();
                        debug(`No escape! Attack ${eName} @${eX},${eY}`);
                        const dX = eX - pX;
                        const dY = eY - pY;
                        const code = RG.KeyMap.dirToKeyCode(dX, dY);
                        result = {code};
                    }
                }
            }
        }
        else if (action === 'move north') {
            result = {code: RG.KEY.MOVE_N};
        }
        else if (action === 'stairs') {
            result = {code: RG.KEY.USE_STAIRS_DOWN};
        }
        else if (action === 'path') {
            let {x, y} = this.path.shift();
            x = parseInt(x, 10);
            y = parseInt(y, 10);
            const dX = x - pX;
            const dY = y - pY;
            debug(`Taking action path ${x},${y}, dX,dY ${dX},${dY}`);
            const code = RG.KeyMap.dirToKeyCode(dX, dY);
            result = {code};
            if (this.path.length === 0) {
                debug('PlayerDriver finished a path');
            }
        }
        else if (action === 'run') {
            result = {code: RG.KEY.RUN};
        }

        return result;
    };

    this.getLastAction = () => {
        return this.actions[this.actions.length - 1];
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
            nTurns: this.nTurns
        };
    };

};

module.exports = PlayerDriver;
