/* Handler for game logic when user presses spacebar (multi-purpose key).
 * The action depends heavily on the context. */

import RG from '../src/rg';
import {Brain} from '../src/brain/brain';
import {Keys} from '../src/keymap';
import {SentientActor} from '../src/actor';

const currCell = {
    hasItems: () => [Keys.KEY.PICKUP],
    hasConnection: () => [Keys.KEY.USE_STAIRS_DOWN],
    hasUsable: () => []
};

// Determines which commands get priority if multiple options
const currCellOrder = ['hasItems', 'hasConnection', 'hasUsable'];

const cellsAroundFuncs = {
    hasDoor: () => [Keys.KEY.DOOR],
    hasActors: (actor, cell) => {
        const dXdY = RG.dXdY(cell, actor);
        const dirKey = Keys.KeyMap.dirToKeyCode(dXdY);
        return [Keys.KEY.CHAT, dirKey];
    }
};
const cellsAroundOrder = ['hasDoor', 'hasActors'];

export class MultiKeyHandler {

    getKeys(actor: SentientActor) {
        const cell = actor.getCell();

        // First check if current cell of actor has anything
        // interesting
        for (let i = 0; i < currCellOrder.length; i++) {
            const funcName = currCellOrder[i];
            if (cell[funcName]()) {
                return currCell[funcName](actor, cell);
            }
        }

        // If current cell had nothing interesting, try surrounding cells
        const cellsAround = Brain.getCellsAroundActor(actor);
        for (let i = 0; i < cellsAroundOrder.length; i++) {
            const funcName = cellsAroundOrder[i];
            for (let j = 0; j < cellsAround.length; j++) {
                const cell = cellsAround[j];
                if (cell[funcName]()) {
                    return cellsAroundFuncs[funcName](actor, cell);
                }
            }
        }

        return null;
    }
}
