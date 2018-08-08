
const RG = require('../src/rg');
const Path = require('../src/path');
const Keys = require('../src/keymap');

const dirToKeyCode = RG.KeyMap.dirToKeyCode;

/* This class handles various actions when player clicks a cell.
 * It creates a key buffer corresponding to the automated command, and then game
 * loop can request these keys.
 * */
export default class CellClickHandler {

    constructor(game) {
        this._game = game;
        this._keyBuffer = []; // Stores keys for the pending command
    }

    /* Returns the next keycode or null if buffer is empty. */
    getNextCode() {
        if (this._keyBuffer.length > 0) {
            return this._keyBuffer.shift();
        }
        return null;
    }

    reset() {
        this._keyBuffer = [];
    }

    hasKeys() {
        return this._keyBuffer.length > 0;
    }

    handleClick(x, y, cell, cmd) {
        // Don't react to click if there are already keys
        if (this.hasKeys()) {return;}

        switch (cmd) {
            case 'attack': this.handleAttack(x, y, cell); break;
            case 'chat': break; // TODO
            case 'move': this.handleMove(x, y, cell); break;
            case 'pickup': this.handlePickup(x, y, cell); break;
            case 'shoot': this.handleShoot(x, y, cell); break;
            case 'usestairs': this.handleUseStairs(x, y, cell); break;
            case 'use-element': this.handleUseElement(x, y, cell); break;
            case 'use-item': break; // TODO
            default: break;
        }

    }

    handleAttack(x, y, cell) {
        this._keyBuffer.push({cmd: 'attack', target: cell});
    }

    handleMove(x, y, cell) {
        const player = this._game.getPlayer();
        const map = player.getLevel().getMap();
        if (map.hasXY(x, y)) {
            if (cell.hasActors()) {
                this.moveTo(player, x, y);
            }
            else {
                this.moveTo(player, x, y);
            }
        }
    }

    handlePickup(x, y, cell) {
        if (cell.hasItems()) {
            const player = this._game.getPlayer();
            this.moveTo(player, x, y);
            this._keyBuffer.push(Keys.KEY.PICKUP);
        }
    }

    handleShoot(x, y, cell) {
        const cmd = {cmd: 'missile', target: cell};
        this._keyBuffer.push(cmd);
    }

    handleUseStairs(x, y) {
        const player = this._game.getPlayer();
        this.moveTo(player, x, y);
        this._keyBuffer.push(Keys.KEY.USE_STAIRS_DOWN);
    }

    // TODO move this into Player.Brain
    handleUseElement(x, y, cell) {
        const cmd = {cmd: 'use-element', target: cell};
        this._keyBuffer.push(cmd);
    }

    /* Tries to compute a path to given coordinate. Uses 2 different methods. */
    moveTo(player, toX, toY) {
        let keyBuf = [];
        let [pX, pY] = [player.getX(), player.getY()];
        let pathPossible = true;
        const map = player.getLevel().getMap();

        if (!map.isExplored(toX, toY)) {
            this._keyBuffer = [];
            RG.gameMsg({msg: 'Cannot move to unexplored cell.'});
            return;
        }

        // Try to move diagonals first
        while (pX !== toX && pY !== toY) {
            const dx = toX - pX;
            const dy = toY - pY;
            keyBuf.push(dirToKeyCode(dx, dy));
            pX += dx / Math.abs(dx);
            pY += dy / Math.abs(dy);
            if (!map.isPassable(pX, pY)) {
                pathPossible = false;
                break;
            }
        }

        // Then proceed to move on straight line
        if (pathPossible && toX !== pX) {
            while (pX !== toX) {
                const dx = toX - pX;
                keyBuf.push(dirToKeyCode(dx, 0));
                pX += dx / Math.abs(dx);
                if (!map.isPassable(pX, pY)) {
                    pathPossible = false;
                    break;
                }
            }
        }
        else if (pathPossible && toY !== pY) {
            while (pY !== toY) {
                const dy = toY - pY;
                keyBuf.push(dirToKeyCode(0, dy));
                pY += dy / Math.abs(dy);
                if (!map.isPassable(pX, pY)) {
                    pathPossible = false;
                    break;
                }
            }
        }

        // Use path finder, if more difficult path to follow
        if (!pathPossible) {
            [pX, pY] = [player.getX(), player.getY()];
            keyBuf = [];
            const path = Path.getShortestActorPath(map, pX, pY, toX, toY);
            path.forEach(xy => {
                const dx = xy.x - pX;
                const dy = xy.y - pY;
                keyBuf.push(dirToKeyCode(dx, dy));
                if (dx !== 0) {pX += dx / Math.abs(dx);}
                if (dy !== 0) {pY += dy / Math.abs(dy);}
            });
        }

        this._keyBuffer = keyBuf;
    }

}
