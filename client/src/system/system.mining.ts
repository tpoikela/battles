/* Contains code for the mining system in the game. */

import RG from '../rg';
import {SystemBase} from './system.base';
import * as ObjectShell from '../objectshellparser';
import {ELEM} from '../../data/elem-constants';
import {ConstBaseElem, RandWeights} from '../interfaces';

type EventPool = import('../eventpool').EventPool;
type Entity = import('../entity').Entity;
type Cell = import('../map.cell').Cell;
type Level = import('../level').Level;

// Used to change wall to floor based on the type
const wall2Floor: {[key: string]: ConstBaseElem} = {
    'wall': ELEM.FLOOR,
    'wallwooden': ELEM.FLOOR_HOUSE,
    'wallcave': ELEM.FLOOR_CAVE,
    'wallcrypt': ELEM.FLOOR_CRYPT,
    'wallcastle': ELEM.FLOOR_CASTLE
};

interface MineItemEntry {
    always: string[];
    rand?: RandWeights;
}

const wall2Items: {[key: string]: MineItemEntry} = {
    'wall': {
        always: ['piece of stone'],
        rand: {nothing: 97, goldcoin: 3}
    },
    'wallwooden': {always: ['piece of wood']},
    'wallcave': {
        always: ['piece of stone'],
        rand: {nothing: 200,
            goldcoin: 16,
            'iron ore': 8, 'copper ore': 8, amethyst: 8,
            topaz: 4, 'mithril ore': 4,
            sapphire: 2, emerald: 2, 'adamantium ore': 2,
            diamond: 1,
        }
    },
    'wallcrypt': {
        always: ['piece of stone'],
        rand: {
            nothing: 90, goldcoin: 3,
            topaz: 3, amethyst: 3, 'lapis lazuli': 3
        }
    },
    'wallcastle': {
        always: ['piece of stone'],
        rand: {
        }
    },
    'wallice': {
        always: ['piece of ice'],
        rand: {
            nothing: 90,
            'permaice ore': 3, 'ice diamond': 1, 'froststone': 3
        }
    },
};

export class SystemMining extends SystemBase {

    public parser: ObjectShell.Parser;

    constructor(compTypes: string[], pool: EventPool) {
        super(RG.SYS.MINING, compTypes, pool);
        this.parser = ObjectShell.getParser();
    }


    public updateEntity(ent: Entity): void {
        const compList =  ent.getList('Mining');
        compList.forEach((miningComp) => {
            this.processComp(ent, miningComp);
            ent.remove(miningComp);
        });
    }


    public processComp(ent: Entity, miningComp): void {
        const level: Level = ent.get('Location').getLevel();
        const placeComp = level.get('Place');
        const depth = placeComp.getDepth();
        const danger = placeComp.getDanger();

        if (depth > 0) {
            const cell: Cell = miningComp.getTarget();
            const baseElem = cell.getBaseElem();
            const baseType = baseElem.getType();
            const toElem = wall2Floor[baseType];
            if (toElem) {
                cell.setBaseElem(toElem);
                // Add possible gems/mineral to cell
                const itemEntry: MineItemEntry = wall2Items[baseType];
                const itemsAlways = itemEntry.always;

                const item = this.parser.createItem(itemsAlways[0]);
                if (item) {
                    level.addItem(item, cell.getX(), cell.getY());
                }

                if (itemEntry.rand) {
                    const itemsRand = itemEntry.rand;
                    const entry = this.rng.getWeighted(itemsRand);
                    if (entry !== '' && entry !== 'nothing') {
                        const itemFound = this.parser.createItem(entry);
                        if (itemFound) {
                            level.addItem(item, cell.getX(), cell.getY());
                            let msg = `${RG.getName(ent)} discovers ${itemFound.getName()}`;
                            msg += ' while digging';
                            RG.gameMsg({cell, msg});
                        }
                    }
                }
            }
        }
    }

}
