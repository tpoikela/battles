
import RG from '../src/rg';
import {Path} from '../src/path';
import {Keys} from '../src/keymap';
import {Cell} from '../src/map.cell';
import {CmdInput} from '../src/interfaces';
import {DriverBase} from '../../tests/helpers/player-driver';

import {IGameMain} from '../src/game';

type SentientActor = import('../src/actor').SentientActor;

const dirToKeyCode = Keys.KeyMap.dirToKeyCode;

/* This class handles various actions when player clicks a cell.
 * It creates a key buffer corresponding to the automated command, and then game
 * loop can request these keys.
 * */
export class CellClickHandler extends DriverBase {

    public _game: IGameMain;
    protected _keyBuffer: CmdInput[];

    constructor(player?, game?: IGameMain) {
        super(player, game);
        this._game = game;
        this._keyBuffer = []; // Stores keys for the pending command
    }


    public handleClick(x: number, y: number, cell: Cell, cmd) {
        // Don't react to click if there are already keys
        if (this.hasKeys()) {return;}

        switch (cmd) {
            case 'attack': this.handleAttack(x, y, cell); break;
            case 'chat': this.handleChat(x, y, cell); break;
            case 'door': this.handleDoor(x, y, cell); break;
            case 'move': this.handleMove(x, y, cell); break;
            case 'pickup': this.handlePickup(x, y, cell); break;
            case 'shoot': this.handleShoot(x, y, cell); break;
            case 'usestairs': this.handleUseStairs(x, y, cell); break;
            case 'use-element': this.handleUseElement(x, y, cell); break;
            case 'use-item': break; // TODO
            default: break;
        }

    }

    public handleAttack(x: number, y: number, cell: Cell): void {
        this._keyBuffer.push({cmd: 'attack', target: cell});
    }

    public handleChat(x: number, y: number, cell: Cell): void {
        const player = this._game.getPlayer();
        if (cell.hasActors()) {
            if (RG.withinRange(1, [x, y], player)) {
                const dXdY = RG.dXdY([x, y], player);
                const dirKey = dirToKeyCode(dXdY);
                console.log('handleChat dXdY: ', dXdY, ' keyCode:', dirKey);
                this._keyBuffer.push(Keys.KEY.CHAT);
                this._keyBuffer.push(dirKey);
            }
        }
    }

    public handleDoor(x: number, y: number, cell: Cell): void {
        const player = this._game.getPlayer();
        if (cell.hasDoor()) {
            this.moveTo(player, x, y);
            this._keyBuffer.push(Keys.KEY.DOOR);
        }
    }

    public handleMove(x: number, y: number, cell: Cell): void {
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

    public handlePickup(x: number, y: number, cell: Cell): void {
        if (cell.hasItems()) {
            const player = this._game.getPlayer();
            this.moveTo(player, x, y);
            this._keyBuffer.push(Keys.KEY.PICKUP);
        }
    }

    public handleShoot(x: number, y: number, cell: Cell): void {
        const cmd = {cmd: 'missile', target: cell};
        this._keyBuffer.push(cmd);
    }

    public handleUseStairs(x: number, y: number, cell: Cell): void {
        const player = this._game.getPlayer();
        this.moveTo(player, x, y);
        this._keyBuffer.push(Keys.KEY.USE_STAIRS_DOWN);
    }

    // TODO move this into Player.Brain
    public handleUseElement(x: number, y: number, cell: Cell): void {
        const cmd = {cmd: 'use-element', target: cell};
        this._keyBuffer.push(cmd);
    }

    /* Tries to compute a path to given coordinate. Uses 2 different methods. */
    public moveTo(player: SentientActor, toX: number, toY: number): void {
        // let keyBuf = [];
        let [pX, pY] = [player.getX(), player.getY()];
        // const [aX, aY] = [pX, pY]; // Keep original position
        // let pathPossible = true;
        const map = player.getLevel().getMap();

        if (!map.isExplored(toX, toY)) {
            this._keyBuffer = [];
            RG.gameMsg('Cannot move to unexplored cell.');
            return;
        }

        /*
        // Try to move diagonals first
        while (pX !== toX && pY !== toY) {
            const dx = toX - pX;
            const dy = toY - pY;
            keyBuf.push(dirToKeyCode(dx, dy));
            pX += dx / Math.abs(dx);
            pY += dy / Math.abs(dy);
            if (!map.isPassable(pX, pY, aX, aY)) {
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
                if (!map.isPassable(pX, pY, aX, aY)) {
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
                if (!map.isPassable(pX, pY, aX, aY)) {
                    pathPossible = false;
                    break;
                }
            }
        }
        */

        // Use path finder, if more difficult path to follow
        // if (!pathPossible) {
            console.log('Using pathfinder to find the fastest path!');
            [pX, pY] = [player.getX(), player.getY()];
            const keyBuf: number[] = [];
            const cb = (x: number, y: number) => (
                map.isExplored(x, y) && map.isPassable(x, y, pX, pY)
            );
            // const cb = () => true;
            const path = Path.getShortestActorPath(map, pX, pY, toX, toY, cb);
            path.forEach(xy => {
                const dx = xy.x - pX;
                const dy = xy.y - pY;
                keyBuf.push(dirToKeyCode(dx, dy));
                if (dx !== 0) {pX += dx / Math.abs(dx);}
                if (dy !== 0) {pY += dy / Math.abs(dy);}
            });
        //}

        this._keyBuffer = keyBuf;
    }

}
