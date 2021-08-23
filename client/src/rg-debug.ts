/* Module used for playtesting/debug only. Imported in game-manager as
 * window.DEBUG to have access to all the functions here. */

import RG from './rg';
import {ObjectShell, Parser} from '../src/objectshellparser';

type SentientActor = import('./actor').SentientActor;

export class RGDebug {

    public parser: Parser;

    constructor() {
        this.parser = ObjectShell.getParser();
    }

    /* Creates a full armor set and adds to actor inventory. */
    public createItems(actor: SentientActor, type: string): void {
        const re = new RegExp(type);
        Object.keys(RG.EQUIP).forEach((eqType: string) => {
            const procGen = this.parser.getProcGen();
            const shells = procGen.filterCategWithFunc('items', shell => re.test(shell.name));
            shells.forEach(shell => {
                const item = this.parser.createItem(shell.name);
                if (item) {
                    actor.getInvEq().addItem(item);
                }
            });
        });
    }
}
