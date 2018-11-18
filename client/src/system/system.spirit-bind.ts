
import RG from '../rg';
import {SystemBase} from './system.base';
import * as Component from '../component';

/* System for spirit binding actions. Note: SpiritBind component is added to the
 * gem always. The action performer (binder) and target entity (item/actor) are
 * added to the component. */
export class SystemSpiritBind extends SystemBase {
    constructor(compTypes, pool?) {
        super(RG.SYS.SPIRIT, compTypes, pool);
        this.compTypesAny = true;
    }

    public updateEntity(ent) {
        if (ent.has('SpiritBind')) {
            this._doSpiritBind(ent);
        }
    }

    /* Called when spirit bind is attempted by a binder. */
    public _doSpiritBind(ent) {
        const bindComp = ent.get('SpiritBind');
        const binder = bindComp.getBinder();
        const bName = binder.getName();
        const targetCell = bindComp.getTarget();

        if (!ent.hasSpirit()) {
            const spirits = targetCell.getPropType('spirit');
            // TODO add some kind of power checks, binding should not always
            // succeed ie. weak binder (and gem) vs strong spirit
            if (spirits.length > 0) {
                const spirit = spirits[0];
                spirit.get('Action').disable(); // Trapped spirit cannot act
                const level = spirit.getLevel();
                level.removeActor(spirit);
                ent.setSpirit(spirit);

                const msg = `${spirit.getName()} was bound to gem by ${bName}`;
                RG.gameMsg({cell: targetCell, msg});
            }
            else {
                const msg = 'There are no spirits to capture there!';
                RG.gameMsg({cell: targetCell, msg});
            }
        }
        else if (targetCell.hasItems()) {
            if (binder.has('SpiritItemCrafter')) {
                const topItem = targetCell.getItems()[0];
                const iName = topItem.getName();
                if (!topItem.has('GemBound')) {
                    const gemBindComp = new Component.GemBound();
                    const boundGem = binder.getInvEq().removeAndGetItem(ent);
                    gemBindComp.setGem(boundGem);
                    topItem.add(gemBindComp);

                    const gemName = ent.getName();
                    const msg = `${gemName} was bound to ${iName} by ${bName}`;
                    RG.gameMsg({cell: targetCell, msg});
                }
                else {
                    const msg = `${iName} has already a gem bound to it.`;
                    RG.gameMsg({cell: targetCell, msg});
                }
            }
            else {
                const msg = `${bName} cannot bind gems to items.`;
                RG.gameMsg({cell: targetCell, msg});
            }
        }

        ent.remove('SpiritBind');

    }
}
