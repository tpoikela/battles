
import RG from '../rg';
import {SystemBase} from './system.base';

/* Processes entities with hunger component.*/
export class SystemHunger extends SystemBase {
    constructor(compTypes, pool?) {
        super(RG.SYS.MOVEMENT, compTypes, pool);
    }

    updateEntity(ent): void {
        const hungerComp = ent.get('Hunger');
        const actionComp = ent.get('Action');
        hungerComp.decrEnergy(actionComp.getEnergy());
        actionComp.resetEnergy();
        if (hungerComp.isStarving()) {

            if (ent.has('Health') && RG.isSuccess(RG.HUNGER_PROB)) {
                const dmg = new RG.Component.Damage(RG.HUNGER_DMG,
                    RG.DMG.HUNGER);
                ent.add(dmg);
                RG.gameWarn(ent.getName() + ' is starving!');
            }
        }
    }
}
