
import RG from '../rg';
import {ObjectShellComps} from '../objectshellcomps';
import * as Component from '../component';

type Level = import('../level').Level;
type Entity = import('../entity').Entity;

type ICmdObject = {[key: string]: any};

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
