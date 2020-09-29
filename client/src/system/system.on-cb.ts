
import RG from '../rg';
import {SystemBase} from './system.base';
import * as Component from '../component';

import {ObjectShellComps} from '../objectshellcomps';

export class SystemOnCbs extends SystemBase {

    constructor(compTypes: string[], pool?) {
        super(RG.SYS.ON_CBS, compTypes, pool);
        this.compTypesAny = true; // Triggered on at least one component
    }

    public updateEntity(ent) {
        if (ent.has('OnAddCb')) {
            const compList = ent.getList('OnAddCb');
            compList.forEach(addComp => {
                this.processAddComp(ent, addComp);
                ent.remove(addComp);
            });
        }

        if (ent.has('OnAddCb')) {
            console.log('WARN! Ent still has OnAddCb:', ent.getList('OnAddCb'));
        }

        if (ent.has('OnRemoveCb')) {
            const compList = ent.getList('OnRemoveCb');
            compList.forEach(removeComp => {
                this.processRemoveComp(ent, removeComp);
                ent.remove(removeComp);
            });
        }

        if (ent.has('OnRemoveCb')) {
            console.log('WARN! Ent still has OnAddCb:', ent.getList('OnAddCb'));
        }
    }


    protected processAddComp(ent, comp): void {
        if (ent.has('Callbacks')) {
            const compName = comp.getCompName();
            const cbs = ent.get('Callbacks');
            const cbName = 'onAdd' + compName;
            if (cbs.hasCb(cbName)) {
                const cbData = cbs.cb(cbName);
                executeCb(ent, cbData);
            }
        }
        if (ent.has('Location')) {
            const location = ent.get('Location');
            if (location.isValid()) {
                const cell = ent.getCell();
                const baseElem = cell.getBaseElem();
                if (baseElem.has('Callbacks')) {
                    const cbs = baseElem.get('Callbacks');
                    const compName = comp.getCompName();
                    const cbName = 'onAdd' + compName + 'Entity';
                    if (cbs.hasCb(cbName)) {
                        console.log('addComp Processing ' + cbName + 'for ' + baseElem.getName());
                        const cbData = cbs.cb(cbName);
                        executeCb(ent, cbData);
                    }
                }
            }
        }
    }

    protected processRemoveComp(ent, comp): void {
        if (ent.has('Callbacks')) {
            const compName = comp.getCompName();
            const cbs = ent.get('Callbacks');
            const cbName = 'onRemove' + compName;
            if (cbs.hasCb(cbName)) {
                const cbData = cbs.cb(cbName);
                executeCb(ent, cbData);
            }
        }
        if (ent.has('Location')) {
            const location = ent.get('Location');
            if (location.isValid()) {
                const cell = ent.getCell();
                const baseElem = cell.getBaseElem();
                if (baseElem.has('Callbacks')) {
                    const cbs = baseElem.get('Callbacks');
                    const compName = comp.getCompName();
                    const cbName = 'onRemove' + compName + 'Entity';
                    if (cbs.hasCb(cbName)) {
                        console.log('removeComp Processing ' + cbName + 'for ' + baseElem.getName());
                        const cbData = cbs.cb(cbName);
                        executeCb(ent, cbData);
                    }
                }
            }
        }
    }

}

const _compGen: ObjectShellComps = new ObjectShellComps({debug: false});

function executeCb(ent, cbObj): void {
    // Adding a new component
    if (cbObj.addComp) {
        if (cbObj.addComp.duration) {
            const effArgs: any = {
                name: cbObj.addComp.comp,
                target: ent,
                duration: cbObj.addComp.duration
            };
            if (cbObj.addComp.func) {
                effArgs.setters = cbObj.modifyComp.func;
            }
            if (cbObj.addComp.expireMsg) {
                effArgs.expireMsg = cbObj.addComp.expireMsg;
            }
            const effComp = new Component.Effects(effArgs);
            ent.add(effComp);
        }
        else {
            _compGen.addComponents(cbObj, ent);
        }
    }

    if (cbObj.removeComp) {
        cbObj.removeComp.forEach(obj => {
            if (ent.has(obj.comp)) {
                ent.remove(obj.comp);
            }
        });
    }
    if (cbObj.modifyComp) {
        const effArgs = {
            name: cbObj.modifyComp.comp,
            target: ent,
            get: cbObj.modifyComp.get,
            set: cbObj.modifyComp.set,
            value: cbObj.modifyComp.value,
        };
        const effComp = new Component.Effects(effArgs);
        ent.add(effComp);
    }
    if (cbObj.changeElement) {
    }
    if (cbObj.addEntity) {
        const effArgs: any = {
            name: cbObj.modifyComp.comp,
            target: {target: ent.getCell()},
            entityName: cbObj.addEntity.entityName,
        };
        if (cbObj.addEntity.duration) {
            effArgs.duration = cbObj.addEntity.duration;
        }
        const effComp = new Component.Effects(effArgs);
        ent.add(effComp);
    }
    if (cbObj.addElement) {
    }
    if (cbObj.removeElement) {
    }
}
