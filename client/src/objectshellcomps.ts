/* Contains code for creating components for object shells. */


import RG from './rg';
import * as Component from './component';
import {IAddCompObj, IShell} from './interfaces';
import {Random} from './random';
import {Dice} from './dice';

import dbg = require('debug');
const debug = dbg('bitn:objectshellcomps');

type ComponentBase = Component.ComponentBase;
type Entity = import('./entity').Entity;
const RNG = Random.getRNG();

interface ICompData {
    [key: string]: any;
}

interface IAddOnComp {
    setOnDamage(a0: boolean): void;
    setOnAttackHit(a0: boolean): void;
}

export class ObjectShellComps {

    protected debug: boolean;

    constructor(args?: any) {
        this.debug = debug.enabled;
        if (args && args.debug) {this.debug = args.debug;}
    }

    /* This function makes a pile of mess if used on non-entities. */
    public addComponents(shell: IShell, entity: Entity): void {
        if (typeof shell.addComp === 'string') {
            this._addCompFromString(shell.addComp, entity);
        }
        else if (Array.isArray(shell.addComp)) {
            shell.addComp.forEach((comp: any) => {
                let usedComp = comp;
                if (comp && typeof comp === 'object' && comp.random) {
                    usedComp = RNG.arrayGetRand(comp.random);
                }
                if (typeof usedComp === 'string') {
                    this._addCompFromString(usedComp, entity);
                }
                else {
                    this._addCompFromObj(entity, usedComp);
                }
            });
        }
        else if (typeof shell.addComp === 'object') {
            let usedComp = shell.addComp;
            if (shell.addComp && shell.addComp.random) {
                usedComp = RNG.arrayGetRand(shell.addComp.random);
            }
            this._addCompFromObj(entity, usedComp);
        }
        else {
            RG.err('Creator', 'addComponents',
                'Giving up. shell.addComp must be string, array or object.');
        }
    }

    /* Adds a component to the newly created object, or updates existing
     * component if it exists already.*/
    public addCompToObj(newObj: Entity, compData: ICompData, val: any): void {
        if (this.debug) {
            console.log((newObj as any).getName(), ': compData with val', compData, val);
        }
        if (compData.hasOwnProperty('func')) {

            // This 1st branch is used by Health only (needed?)
            if (Array.isArray(compData.func)) {
                compData.func.forEach(fname => {
                    const compName = compData.comp;
                    if (newObj.has(compName)) {
                        // 1. Call existing comp with setter (fname)
                        if (typeof newObj.get(compName)[fname] === 'function') {
                            newObj.get(compName)[fname](val);
                        }
                        else {
                            this.noFuncError(compName, fname, compData);
                        }
                    }
                    else { // 2. Or create a new component
                        const comp = this.createComponent(compName);
                        if (typeof comp[fname] === 'function') {
                            comp[fname](val); // Then call comp setter
                            newObj.add(comp);
                        }
                        else {
                            this.noFuncError(compName, fname, compData);
                        }
                    }
                });
            }
            else {
                const fname = compData.func;
                const compName = compData.comp;
                if (newObj.has(compName) && typeof fname === 'string') {
                    if (this.debug) {
                        console.log('hasComp already KKK222 here now:', fname);
                    }
                    // 1. Call existing comp with setter (fname)
                    const comp = newObj.get(compName);
                    if (typeof comp[fname] === 'function') {
                        comp[fname](val);
                    }
                    else {
                        RG.err('ObjectShellComps', 'addCompToObj',
                           `${fname} is not a function on comp ${compName}`);
                    }
                }
                else { // 2. Or create a new component
                    let comp = null;
                    if (!newObj.has(compName) || !compData.useOld) {
                        comp = this.createComponent(compName);
                        newObj.add(comp);
                    }
                    comp = newObj.get(compName);

                    if (typeof comp[fname] === 'function') {
                        comp[fname](val); // Then call comp setter
                        if (this.debug) {
                            console.log('KKK333 new comp created and called', fname, val);
                        }
                    }
                    else if (typeof fname === 'object') {
                        const funcNames = Object.keys(compData.func);
                        funcNames.forEach(funcName => {

                            const newCompData: ICompData = {
                                func: funcName,
                                comp: compName
                            };
                            if (compData.useOld) {
                                newCompData.useOld = compData.useOld;
                            }

                            const newVal = compData.func[funcName];
                            if (this.debug) {
                                console.log('Calling addCompToObj recursively', newCompData,
                                    newVal);
                            }
                            this.addCompToObj(newObj, newCompData, newVal);
                        });
                    }
                    else {
                        RG.log(JSON.stringify(fname));
                        RG.err('ObjectShellComps', 'addCompToObj',
                            `No function ${fname} in ${compName}`);
                    }
                }
            }
        }
        else if (newObj.has(compData.comp)) {
            console.log('newObj: ', newObj, 'compData: ', compData);
            RG.err('ObjectShellComps', 'addCompToObj',
                'else-if branch Not implemented');
        }
        else {
            newObj.add(this.createComponent(compData.comp, val));
        }
    }

    /* Creates a component of specified type.*/
    public createComponent(type: string, val?: any): ComponentBase | null {
        switch (type) {
            case 'Health': return new Component.Health(val);
            default:
                if (Component.hasOwnProperty(type)) {
                    return new Component[type]();
                }
                else {
                    RG.err('Creator', 'createComponent',
                        'Component |' + type + '| does not exist.');
                }
        }
        return null;
    }

    /* Adds Poison as addOnHit property. */
    public addPoison(shell: IShell, obj: Entity): void {
        const poison = shell.poison;
        /*
        const poisonComp = new Component.Poison();
        poisonComp.setProb(poison.prob);
        poisonComp.setSource(obj);
        poisonComp.setDamageDie(Dice.create(poison.damage));

        if (!poison.duration) {
            const json = JSON.stringify(shell);
            RG.err('ObjectShellComps', 'addPoison',
                `Poison requires "duration". Got shell ${json}`);
        }

        const dieDuration = Dice.create(poison.duration);
        poisonComp.setDurationDie(dieDuration);
        const addOnHit = new Component.AddOnHit();
        addOnHit.setComp(poisonComp);
        obj.add(addOnHit);
        */
        const newShell = JSON.parse(JSON.stringify(shell));
        newShell.onHit = [{
            addComp: 'DirectDamage', func: [
                {setter: 'setDamage', value: poison.damage},
                {setter: 'setDamageType', value: RG.DMG.POISON},
                {setter: 'setDamageCateg', value: RG.DMG.DIRECT},
                {setter: 'setProb', value: poison.prob},
            ],
            duration: poison.duration
        }];
        this.addOnHitProperties(newShell, obj);
    }

    /* Adds any component as AddOnHit property. */
    public addOnHitProperties(shell: IShell, obj: Entity): void {
        shell.onHit.forEach(onHit => {
            this.processAddComp(onHit, obj);
        });
    }

    public addOnAttackHitProperties(shell: IShell, obj: Entity): void {
        shell.onAttackHit.forEach(onHit => {
            const addOnHitComp = this.processAddComp(onHit, obj);
            addOnHitComp.setOnDamage(false);
            addOnHitComp.setOnAttackHit(true);
        });
    }

    public addOnEquipProperties(shell: IShell, newObj: Entity): void {
        shell.onEquip.forEach(onEquip => {
            const isEquip = true;
            this.processAddComp(onEquip, newObj, isEquip);
        });
    }

    public processAddComp(onHit: IAddCompObj, obj: Entity, isEquip = false): IAddOnComp | null {
        // Create the comp to be returned
        let addOnHit = null;
        if (isEquip) {
            addOnHit = new Component.AddOnEquip();
        }
        else {
            addOnHit = new Component.AddOnHit();
        }

        if (onHit.addComp) {
            const comp = this.createComponent(onHit.addComp);
            if ((comp as any).setSource) {
                if (RG.isActor(obj)) {
                    (comp as any).setSource(obj);
                }
            }

            // Set the values of added component using functions provided in
            // func array
            if (Array.isArray(onHit.func)) {
                onHit.func.forEach(func => {
                    if (typeof comp[func.setter] === 'function') {
                        comp[func.setter](func.value);
                    }
                    else {
                        const str = comp.toJSON();
                        RG.err('ObjectShellParser', 'addOnHitProperties',
                            `Not a func: ${func.setter} in comp ${str}`);
                    }
                });
            }

            // Then create the AddOnHit component and wrap the original
            // component into Duration to make it transient
            const addedComp = comp;

            if (onHit.duration) {
                const durDie = Dice.create(onHit.duration);
                const durComponent = new Component.Duration();
                durComponent.setDurationDie(durDie);
                durComponent.setComp(addedComp);
                addOnHit.setComp(durComponent);

                // Set the message for comp expiration, if any are given
                // in the obj shell
                if (onHit.expireMsg) {
                    durComponent.setExpireMsg(onHit.expireMsg);
                }
            }
            else {
                addOnHit.setComp(addedComp);
            }
            obj.add(addOnHit);
            return addOnHit;
        }
        else if (onHit.transientComp) {
            // If createComp given, use the object as it is without creating
            // a new Component

            addOnHit.setComp(JSON.parse(JSON.stringify(onHit)));
            obj.add(addOnHit);
            return addOnHit;
        }
        return null;
    }

    public addCallbacks(shell: IShell, obj: Entity): void {
        const cbs = shell.callbacks;
        if (!obj.has('Callbacks')) {
            obj.add(new Component.Callbacks());
        }
        Object.keys(cbs).forEach((cbName: string) => {
            obj.get('Callbacks').addCb(cbName, cbs[cbName]);
        });
    }

    protected noFuncError(compName: string, fname: string, compData): void {
        const json = 'compData ' + JSON.stringify(compData);
        RG.err('ObjectShellComps', 'addCompToObj',
           `Comp: ${compName} no func ${fname}, ${json}`);
    }

    protected _addCompFromString(compName: string, entity: Entity): void {
        try {
            const comp = new Component[compName]();
            entity.add(comp);
        }
        catch (e) {
            let msg = `shell.addComp |${compName}|`;
            msg += 'Component names are capitalized.';
            RG.err('Creator', '_addCompFromString',
                `${e.message} - ${msg}`);
        }
    }

    protected _addCompFromObj(entity: Entity, compObj): void {
        this.addCompToObj(entity, compObj, null);
    }
}
