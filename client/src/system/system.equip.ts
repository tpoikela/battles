/* System for handling of equipped items. */

import RG from '../rg';
import {SystemBase} from './system.base';
import * as Component from '../component/component';

export class SystemEquip extends SystemBase {
    constructor(compTypes, pool?) {
        super(RG.SYS.EQUIP, compTypes, pool);
    }

    public updateEntity(ent) {
        const eqComp = ent.get('Equip');
        if (eqComp.getIsRemove()) {
            this.unequipItem(ent, eqComp.getArgs());
        }
        else {
            this.equipItem(ent, eqComp.getArgs());
        }
        ent.remove(eqComp);
    }

    public unequipItem(ent, obj) {
        const slotName = obj.slot;
        const slotNumber = obj.slotNumber;
        const invEq = ent.getInvEq();
        let result = false;
        let msg = `Failed to remove item from slot ${slotName}.`;

        if (slotName === 'missile') {
            const eqItem = invEq.getEquipment().getItem('missile');

            if (eqItem !== null) {
                if (invEq.unequipItem(slotName, obj.count)) {
                    result = true;
                }
            }
        }
        else if (invEq.unequipItem(slotName, 1, slotNumber)) {
            result = true;
        }

        if (obj.hasOwnProperty('callback')) {
            if (result) {
                msg = `Unequipping from ${slotName} succeeded!`;
            }
            obj.callback({msg, result});
        }

        const item = invEq.getEquipment().getUnequipped(slotName, slotNumber);
        // If unequip was success, handle unequip effects
        if (result && item.has('AddOnEquip')) {
            const addComps = item.getList('AddOnEquip');
            addComps.forEach(addComp => {
                const isEquip = false;
                this.handleAddOnEquip(ent, addComp, isEquip);
            });
        }
    }

    public equipItem(ent, obj): void {
        const invEq = ent.getInvEq();
        const item = obj.item;
        let result = false;
        let msg = `Failed to equip ${item.getName()}`;
        if (item.getType().match(/^(missile|ammo)$/)) {
            if (invEq.equipNItems(item, obj.count)) {
                result = true;
            }
        }
        else if (invEq.equipItem(item)) {
            result = true;
        }

        // Callback is mainly used to connect to the GUI inventory
        if (obj.hasOwnProperty('callback')) {
            if (result) {
                msg = `Equipping ${item.getName()} succeeded!`;
            }
            obj.callback({msg, result});
        }
        else {
            const equipMsg = `${ent.getName()} equips ${item.getName()}`;
            RG.gameMsg({msg: equipMsg, cell: ent.getCell()});
        }

        // If equip was success, handle equip effects
        if (result && item.has('AddOnEquip')) {
            const addComps = item.getList('AddOnEquip');
            addComps.forEach(addComp => {
                this.handleAddOnEquip(ent, addComp);
            });
        }
    }

    public handleAddOnEquip(ent, addComp, equip = true): void {
        if (equip) {
            const comp = addComp.getComp();
            if (comp.setSource) {
                comp.setSource(addComp.getEntity());
            }
            if (comp.is('Duration')) {
                const dur = comp.rollDuration();
                const msg = comp.getExpireMsg();
                Component.addToExpirationComp(ent, comp, dur, msg);
            }
            else {
                ent.add(comp);
            }
            addComp.setAddedToActor(true);
        }
        else {
            const compID = addComp.getComp();
            if (typeof compID === 'number') {
                const compToRemove = ent.get(compID);
                ent.remove(compID);
                addComp.setComp(compToRemove);
                addComp.setAddedToActor(false);
            }
            else {
                RG.err('System.Equip', 'handleAddOnEquip',
                    'Expected comp ID number. Got: ' + compID);
            }
        }
    }
}
