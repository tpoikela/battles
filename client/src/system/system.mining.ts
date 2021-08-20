/* Contains code for the mining system in the game. */

import RG from '../rg';
import {SystemBase} from './system.base';
import * as ObjectShell from '../objectshellparser';
import {Constraints} from '../constraints';

import {MineItemEntry, Wall2Items, Wall2Floor} from '../../data/mining';

type EventPool = import('../eventpool').EventPool;
type Entity = import('../entity').Entity;
type Cell = import('../map.cell').Cell;
type Level = import('../level').Level;


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
            const toElem = Wall2Floor[baseType];
            if (toElem) {
                cell.setBaseElem(toElem);
                // Add possible gems/mineral to cell
                const itemEntry: MineItemEntry = Wall2Items[baseType];
                const itemsAlways = itemEntry.always;

                itemsAlways.forEach((itemName: string) => {
                    const item = this.parser.createItem(itemName);
                    if (item) {
                        level.addItem(item, cell.getX(), cell.getY());
                    }
                });

                let entry = '';
                if (itemEntry.rand) {
                    const itemsRand = itemEntry.rand;
                    entry = this.rng.getWeighted(itemsRand);
                    if (entry !== '' && entry !== 'nothing') {
                        const itemFound = this.parser.createItem(entry);
                        if (itemFound) {
                            level.addItem(itemFound, cell.getX(), cell.getY());
                            let msg = `${RG.getName(ent)} discovers ${itemFound.getName()}`;
                            msg += ' while digging';
                            RG.gameMsg({cell, msg});
                        }
                    }
                }
                // We can call func-based item generation if defined
                if (entry === '' || entry === 'nothing') {
                    if (itemEntry.constraint) {
                        const func = new Constraints().getConstraints(itemEntry.constraint);
                    }
                }
            }
        }
    }

}
