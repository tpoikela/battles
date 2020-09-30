
import RG from '../rg';
import {SystemBase} from './system.base';
import {executeCompCb} from './system.utils';

type Entity = import('../entity').Entity;

export class SystemOnCbs extends SystemBase {

    constructor(compTypes: string[], pool?) {
        super(RG.SYS.ON_CBS, compTypes, pool);
        this.compTypesAny = true; // Triggered on at least one component
    }

    public updateEntity(ent: Entity) {
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


    protected processAddComp(ent: Entity, comp): void {
        if (ent.has('Callbacks')) {
            const compName = comp.getCompName();
            const cbs = ent.get('Callbacks');
            const cbName = 'onAdd' + compName;
            if (cbs.hasCb(cbName)) {
                const cbData = cbs.cb(cbName);
                executeCompCb(ent, cbData);
            }
        }
        if (ent.has('Location')) {
            const location = ent.get('Location');
            if (location.isValid()) {
                const cell = location.getCell();
                const baseElem = cell.getBaseElem();
                if (baseElem.has('Callbacks')) {
                    const cbs = baseElem.get('Callbacks');
                    const compName = comp.getCompName();
                    const cbName = 'onAdd' + compName + 'Entity';
                    if (cbs.hasCb(cbName)) {
                        console.log('addComp Processing ' + cbName + 'for ' + baseElem.getName());
                        const cbData = cbs.cb(cbName);
                        executeCompCb(ent, cbData);
                    }
                }
            }
        }
    }

    protected processRemoveComp(ent: Entity, comp): void {
        if (ent.has('Callbacks')) {
            const compName = comp.getCompName();
            const cbs = ent.get('Callbacks');
            const cbName = 'onRemove' + compName;
            if (cbs.hasCb(cbName)) {
                const cbData = cbs.cb(cbName);
                executeCompCb(ent, cbData);
            }
        }
        if (ent.has('Location')) {
            const location = ent.get('Location');
            if (location.isValid()) {
                const cell = location.getCell();
                const baseElem = cell.getBaseElem();
                if (baseElem.has('Callbacks')) {
                    const cbs = baseElem.get('Callbacks');
                    const compName = comp.getCompName();
                    const cbName = 'onRemove' + compName + 'Entity';
                    if (cbs.hasCb(cbName)) {
                        console.log('removeComp Processing ' + cbName + 'for ' + baseElem.getName());
                        const cbData = cbs.cb(cbName);
                        executeCompCb(ent, cbData);
                    }
                }
            }
        }
    }

}

