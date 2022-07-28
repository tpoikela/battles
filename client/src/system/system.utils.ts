
import RG from '../rg';
import {ObjectShellComps} from '../objectshellcomps';
import * as Component from '../component';
import {IEffArgs} from '../interfaces';

type Level = import('../level').Level;
type Entity = import('../entity').Entity;

type ICmdObject = {[key: string]: any};

let DEBUG_CB = true;

export function setCbDebug(debug): void {
    DEBUG_CB = debug;
}

/* Can be used to emit zone event with specified data, which will be processed
 * by System.ZoneEvent.
 */
export function emitZoneEvent(level: Level, evt: string, data?: any): void {
    const parentZone = level.getParentZone();
    if (parentZone) {
        const zoneEvent = new Component.ZoneEvent();
        zoneEvent.setEventType(evt);
        if (data) {
            zoneEvent.setEventData(data);
        }
        parentZone.add(zoneEvent);
    }
    if (RG.debugZoneEvents) {
    }
}

const _compGen: ObjectShellComps = new ObjectShellComps({debug: false});

/* Executes a component callback from Callbacks component. Callback is actually
 * an cmd object which describes what should happen. Some examples of objects:
 * (properties marked with ? are optional):
 *
 * This can be used in any System which should process callbacks from Callbacks
 * component.
 *
 * 1. Adding a component:
 *   {addComp: [{comp: 'Flying', duration?: '2d4'}]}
 * 2. Removing a component:
 *   {removeComp: [{comp: 'Paralysis'}]
 * 3. Modify a component:
 *   {modifyComp: {
 *      comp: 'Stats', get: 'getStrength', set: 'setStrength', value: 2
 *   }}
 * 4. Adding an entity:
 */
export function executeCompCb(ent: Entity, cbObj: ICmdObject): void {

    // Adding a new component
    if (cbObj.addComp) {
        let addComps = [];
        if (typeof cbObj.addComp === 'string') {
            addComps = [{comp: cbObj.addComp}];
        }
        else {
            addComps = cbObj.addComp;
        }
        addComps.forEach(addComp => {
            const effArgs: IEffArgs = {
                name: addComp.comp,
                target: ent,
                effectType: 'AddComp',
                targetType: RG.PROP_TYPES,
                //rm duration: cbObj.addComp.duration
            };
            if (addComp.duration) {
                effArgs.duration = cbObj.addComp.duration;
            }
            if (addComp.func) {
                effArgs.setters = cbObj.addComp.func;
            }
            if (addComp.expireMsg) {
                effArgs.expireMsg = cbObj.addComp.expireMsg;
            }
            if (addComp.area) {
                effArgs.area = addComp.area;
            }
            if (addComp.anim) {
                effArgs.anim = addComp.anim;
            }
            if (addComp.applyToAllTargets) {
                effArgs.applyToAllTargets = true;
            }

            // Level cannot be present in addComp, get it from cbObj
            if (cbObj.level) {
                effArgs.level = cbObj.level;
            }
            const effComp = new Component.Effects(effArgs);
            ent.add(effComp);
            if (DEBUG_CB) {
                const id = ent.getID();
                const entNamed = ent as any;
                console.log(`addComp Cb exec for @${id} |${entNamed.getName()}|`);
            }
        });
        /*}
        else {
            _compGen.addComponents(cbObj, ent);
        }*/
    }

    // Removing a component
    if (cbObj.removeComp) {
        cbObj.removeComp.forEach(obj => {
            if (ent.has(obj.comp)) {
                ent.remove(obj.comp);
            }
        });
    }

    // Modifying a component value
    if (cbObj.modifyComp) {
        const effArgs = {
            name: cbObj.modifyComp.comp,
            target: ent,
            get: cbObj.modifyComp.get,
            set: cbObj.modifyComp.set,
            value: cbObj.modifyComp.value,
            effectType: 'ModifyCompValue',
        };
        const effComp = new Component.Effects(effArgs);
        ent.add(effComp);
    }

    // Changing an element
    if (cbObj.changeElement) {
        RG.err('system.on-cb.ts', 'executeCompCb',
            'changelement not supported yet. Need to write some code');
    }

    // Adding an entity
    if (cbObj.addEntity) {
        const location = ent.get('Location');
        if (location && location.isValid()) {
            const effArgs: any = {
                name: cbObj.modifyComp.comp,
                target: {target: location.getCell()},
                entityName: cbObj.addEntity.entityName,
                effectType: 'AddEntity',
            };
            if (cbObj.addEntity.duration) {
                effArgs.duration = cbObj.addEntity.duration;
            }
            const effComp = new Component.Effects(effArgs);
            ent.add(effComp);
        }
        else {
            RG.err('system.on-cb.ts', 'executeCompCb',
                'In addEntity, no valid location for adding.');
        }
    }

    if (cbObj.removeEntity) {
        const removeEnt = cbObj.removeEntity;
        const effArgs: IEffArgs = {
            effectType: 'RemoveEntity',
            target: removeEnt.target,
            targetType: ['self'],
        }
        const effComp = new Component.Effects(effArgs);
        ent.add(effComp);
        if (DEBUG_CB) {
            const id = ent.getID();
            const entNamed = ent as any;
            console.log(`removeEnt Cb exec for @${id} |${entNamed.getName()}|`);
        }
    }

    // Adding an element
    if (cbObj.addElement) {
        RG.err('system.on-cb.ts', 'executeCompCb',
            'addElement not supported yet. Need to write some code');
    }

    // Removing an element
    if (cbObj.removeElement) {
        RG.err('system.on-cb.ts', 'executeCompCb',
            'removelement not supported yet. Need to write some code');
    }
}

export function addRegenEffects(ent: Entity): void {
    const regenList = ent.getList('Regeneration');
    const regenEffects = ent.getList('RegenEffect');
    regenList.forEach(regenComp => {
        const id = regenComp.getID();
        const regenEff = regenEffects.findIndex(eff => eff.getRegenID() === id);
        if (regenEff < 0) {
            const regenEffect = new Component.RegenEffect();
            regenEffect.initEffect(regenComp);
            ent.add(regenEffect);
        }
    });
}

export function removeStatsModsOnLeave(ent: Entity, prevType: string): void {
    const statsList = ent.getList('StatsMods');
    const combatList = ent.getList('CombatMods');
    // TODO add a list of comps to check to this._bonuses
    statsList.forEach(modComp => {
        if (modComp.getTag() === prevType) {
            ent.remove(modComp);
        }
    });
    combatList.forEach(modComp => {
        if (modComp.getTag() === prevType) {
            ent.remove(modComp);
        }
    });
}
