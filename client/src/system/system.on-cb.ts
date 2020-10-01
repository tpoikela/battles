
import RG from '../rg';
import {SystemBase} from './system.base';
import {executeCompCb} from './system.utils';

type Entity = import('../entity').Entity;
type EventPool = import('../eventpool').EventPool;

export class SystemOnCbs extends SystemBase {

    public numRemoveComp: {[key: string]: any};
    public numAddComp: {[key: string]: any};

    constructor(compTypes: string[], pool: EventPool) {
        super(RG.SYS.ON_CBS, compTypes, pool);
        this.compTypesAny = true; // Triggered on at least one component

        this.numRemoveComp = {};
        this.numAddComp = {};
    }

    public updateEntity(ent: Entity) {
        let watchdog = 100;
        /*
        if (ent.has('OnAddCb')) {
            const compList = ent.getList('OnAddCb');
            compList.forEach(addComp => {
                this.processAddComp(ent, addComp);
                ent.remove(addComp);
            });
        }
        */
        while (ent.has('OnAddCb')) {
            const comp = ent.get('OnAddCb');
            this.processAddComp(ent, comp);
            ent.remove(comp);
            --watchdog;
            if (watchdog === 0) {break;}
        }

        watchdog = 100;
        while (ent.has('OnRemoveCb')) {
            const comp = ent.get('OnRemoveCb');
            this.processRemoveComp(ent, comp);
            ent.remove(comp);
            --watchdog;
            if (watchdog === 0) {break;}
        }

        /*
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
        */
    }


    protected processAddComp(ent: Entity, comp): void {
        const compName = comp.getCompName();
        if (ent.has('Callbacks')) {
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
                    // const compName = comp.getCompName();
                    const cbName = 'onAdd' + compName + 'Entity';
                    if (cbs.hasCb(cbName)) {
                        console.log('addComp Processing ' + cbName + 'for ' + baseElem.getName());
                        const cbData = cbs.cb(cbName);
                        executeCompCb(ent, cbData);
                    }
                }
            }
        }
        if (!this.numAddComp[compName]) {
            this.numAddComp[compName] = 0;
        }
        this.numAddComp[compName] += 1;
    }

    protected processRemoveComp(ent: Entity, comp): void {
        const compName = comp.getCompName();
        if (ent.has('Callbacks')) {
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
                    const cbName = 'onRemove' + compName + 'Entity';
                    if (cbs.hasCb(cbName)) {
                        console.log('removeComp Processing ' + cbName + 'for ' + baseElem.getName());
                        const cbData = cbs.cb(cbName);
                        executeCompCb(ent, cbData);
                    }
                }
            }
        }
        if (!this.numRemoveComp[compName]) {
            this.numRemoveComp[compName] = 0;
        }
        this.numRemoveComp[compName] += 1;
    }

}

