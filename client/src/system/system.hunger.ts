
import RG from '../rg';
import {SystemBase} from './system.base';
import * as Component from '../component';

type EventPool = import('../eventpool').EventPool;

/* Processes entities with hunger component.*/
export class SystemHunger extends SystemBase {
    constructor(compTypes: string[], pool: EventPool) {
        super(RG.SYS.HUNGER, compTypes, pool);
    }

    public updateEntity(ent): void {
        const hungerComp = ent.get('Hunger');
        const actionComp = ent.get('Action');
        hungerComp.decrEnergy(actionComp.getEnergy());
        actionComp.resetEnergy();
        if (hungerComp.isStarving()) {

            if (ent.has('Health') && RG.isSuccess(RG.HUNGER_PROB)) {
                const dmg = new Component.Damage(RG.HUNGER_DMG,
                    RG.DMG.HUNGER);
                ent.add(dmg);
                RG.gameWarn(ent.getName() + ' is starving!');
            }
        }
    }
}
