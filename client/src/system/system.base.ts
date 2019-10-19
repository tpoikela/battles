
import RG from '../rg';
import * as Component from '../component';
import {Entity} from '../entity';
import {EventPool} from '../eventpool';
import {Random} from '../random';

const dbg = require('debug');
const debug = dbg('bitn:System');
const POOL = EventPool.getPool();

//---------------------------------------------------
/** Base class for all systems in ECS framework.
 * @constructor SystemBase
 * @param {string} type - System type
 * @param {array}  compTypes - Types of comps to listen to
 */
//---------------------------------------------------
export abstract class SystemBase {

    //---------------------------------------------------------
    // Non-member functions used for utility in other systems
    //---------------------------------------------------------

    /* For adding skills experience components. */
    public static addSkillsExp(att, skill, pts = 1): void {
        if (att.has('Skills')) {
            const comp = new Component.SkillsExp();
            comp.setSkill(skill);
            comp.setPoints(pts);
            att.add(comp);
        }
    }

    /* After succesful hit, adds the given comp to specified entity ent. */
    public static addCompToEntAfterHit(comp, ent, src): void {
        const compClone = comp.clone();

        if (compClone.hasOwnProperty('duration')) {
            const compDur = compClone.rollDuration();
            const expiration = new Component.Expiration();
            expiration.addEffect(compClone, compDur);
            ent.add(expiration);
        }

        // Source not present in negative buffs like StatsMods/CombatMods,
        // but needed for Poison etc damage
        if (compClone.getSource) {
            const compSrc = compClone.getSource();
            if (RG.isNullOrUndef([compSrc])) {
                compClone.setSource(src);
            }
        }

        ent.add(compClone);
    }

    public type: symbol; // Type of the system
    public compTypes: string[];
    public entities: {[key: string]: Entity};

    // If set to true, only one comp has to match the compTypes, otherwise all
    // components in compTypes must be present
    public compTypesAny: boolean;

    /* Listens to add/removes for each component type in compTypes.*/
    public hasNotify: boolean;

    public debugEnabled: boolean;
    public rng: Random;

    protected legalArgs: string[];

    constructor(type: symbol, compTypes: string[], pool?: EventPool) {
        if (!Array.isArray(compTypes)) {
            RG.err('System.Base', 'new',
                '2nd arg must be an array of component types');
        }

        this.type = type; // Type of the system
        this.compTypes = compTypes; // Required comps in entity
        this.entities = {}; // Entities requiring processing

        // If set to true, only one comp has to match the compTypes, otherwise all
        // components in compTypes must be present
        this.compTypesAny = false;

        /* Listens to add/removes for each component type in compTypes.*/
        this.hasNotify = true;

        this.legalArgs = [];

        // Add a listener for each specified component type
        for (let i = 0; i < this.compTypes.length; i++) {
            if (!Component.hasOwnProperty(this.compTypes[i])) {
                RG.err('System.Base', 'new',
                    `Comp type |${this.compTypes[i]}| not in Component`);
            }

            if (pool) {
                pool.listenEvent(this.compTypes[i], this);
            }
            else {
                POOL.listenEvent(this.compTypes[i], this);
            }
        }

        this.debugEnabled = debug.enabled;
        this.rng = new Random(0);
    }

    public setRNG(rng: Random): void {
        this.rng = rng;
    }

    public setArgs(args: {[key: string]: any}): void {
        this.legalArgs.forEach((arg: string) => {
            if (args.hasOwnProperty(arg)) {
                this[arg] = args[arg];
            }
        });
    }

    public numEntities(): number {
        return Object.keys(this.entities).length;
    }

    public addEntity(entity: Entity): void {
        this.entities[entity.getID()] = entity;
    }

    public removeEntity(entity: Entity): void {
        delete this.entities[entity.getID()];
    }

    public notify(evtName, obj) {
        if (obj.hasOwnProperty('add')) {
            if (this.hasCompTypes(obj.entity)) {this.addEntity(obj.entity);}
        }
        else if (obj.hasOwnProperty('remove')) {
            // Must check if any needed comps are still present, before removing
            // the entity
            if (!this.hasCompTypes(obj.entity)) {
                this.removeEntity(obj.entity);
            }
        }
    }

    /* Returns true if entity has all required component types, or if
     * compTypesAny if set, if entity has any required component. */
    public hasCompTypes(entity): boolean {
        const compTypes = this.compTypes;
        if (this.compTypesAny === false) { // All types must be present
            return entity.hasAll(compTypes);
        }
        else { // Only one compType has to be present
            return entity.hasAny(compTypes);
        }
    }

    /* Returns true if there is at least 1 entity to process. */
    public hasEntities(): boolean {
        return Object.keys(this.entities).length > 0;
    }

    public update(): void {
        for (const e in this.entities) {
            if (!e) {continue;}
            this.updateEntity(this.entities[e]);
        }
    }

    public updateEntity(e: Entity): void {
        RG.err('SystemBase', 'updateEntity',
            'Not implemented in the base class');
    }

    /* For printing out debug information. */
    public dbg(msg): void {
        if (this.debugEnabled) {
            const nEnt = Object.keys(this.entities).length;
            let descr = `[System ${this.type.toString()}]`;
            descr += ` nEntities: ${nEnt}`;
            if (debug.enabled) {
                debug(`${descr} ${msg}`);
            }
            else {
                console.log(`${descr} ${msg}`);
            }
        }
    }
}
