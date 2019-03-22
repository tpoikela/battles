
import RG from '../rg';
import {SystemBase} from './system.base';
import {EventPool} from '../eventpool';
import {Entity} from '../entity';
import * as Component from '../component';

const POOL = EventPool.getPool();

type CompEntry = [number, Entity];

/* System which handles time-based effects like poisoning etc. It also handles
 * expiration of effects. This is a special system because its updates are
 * scheduled by the scheduler to guarantee a specific execution interval. */
export class SystemTimeEffects extends SystemBase {

    private _dtable: {[key: string]: (ent) => void};
    private _expiredEffects: CompEntry[];

    constructor(compTypes, pool?) {
        super(RG.SYS.TIME_EFFECTS, compTypes, pool);
        this.compTypesAny = true;
        this._dtable = {};
        this._expiredEffects = [];

        this._dtable.Poison = this._applyPoison.bind(this);
        this._dtable.Fading = this._applyFading.bind(this);
        this._dtable.Heat = this._applyHeat.bind(this);
        this._dtable.Coldness = this._applyColdness.bind(this);
        this._dtable.DirectDamage = this._applyDirectDamage.bind(this);
        this._dtable.RegenEffect = this._applyRegenEffect.bind(this);
    }

    // Dispatch table used to call a handler function for each component

    public update(): void {
        for (const e in this.entities) {
            if (!e) {continue;}
            const ent = this.entities[e];

            // Process timed effects like poison etc.
            for (let i = 0; i < this.compTypes.length; i++) {
                if (this.compTypes[i] !== 'Expiration') {
                    if (ent.has(this.compTypes[i])) {
                        // Call dispatch table function
                        this._dtable[this.compTypes[i]](ent);
                    }
                }
            }
            // Process expiration effects/duration of Expiration itself
            if (ent.has('Expiration')) {this._decreaseDuration(ent);}
        }

        // Remove expired effects (mutates this.entities, so done outside for)
        // Removes Expiration, as well as comps like Poison/Stun/Disease etc.
        for (let j = 0; j < this._expiredEffects.length; j++) {
            const compID = this._expiredEffects[j][0];
            const entRem = this._expiredEffects[j][1];
            entRem.remove(compID);
        }
        this._expiredEffects = [];
    }

    /* Decreases the remaining duration in the component by one.*/
    public _decreaseDuration(ent: Entity): void {
        const expirComps = ent.getList('Expiration');
        expirComps.forEach(tEff => {
            tEff.decrDuration();

            // Remove Expiration only if other components are removed
            if (!tEff.hasEffects()) {
                this._expiredEffects.push([tEff.getID(), ent]);
            }
        });
    }


    /* Applies the poison effect to the entity.*/
    public _applyPoison(ent: Entity): void {
        const poisonList = ent.getList('Poison');
        poisonList.forEach(poison => {

            if (ent.get('Health').isDead()) {
                this._expiredEffects.push([poison.getID(), ent]);
                if (ent.has('Expiration')) {
                    const te = ent.get('Expiration');
                    if (te.hasEffect(poison)) {
                        te.removeEffect(poison);
                    }
                }
            }
            else if (RG.isSuccess(poison.getProb())) {
                const poisonDmg = poison.rollDamage();
                const dmgComp = new Component.Damage(poisonDmg,
                    RG.DMG.POISON);
                dmgComp.setSource(poison.getSource());
                ent.add(dmgComp);
            }
        });
    }

    /* Applies direct damage effect to given entity. */
    public _applyDirectDamage(ent): void {
        const ddList = ent.getList('DirectDamage');
        ddList.forEach(ddComp => {

            if (ent.get('Health').isDead()) {
                this._expiredEffects.push([ddComp.getID(), ent]);
                if (ent.has('Expiration')) {
                    const te = ent.get('Expiration');
                    if (te.hasEffect(ddComp)) {
                        te.removeEffect(ddComp);
                    }
                }
            }
            else if (RG.isSuccess(ddComp.getProb())) {
                const ddCompDmg: number = ddComp.rollDamage();
                const dmgComp = new Component.Damage(ddCompDmg,
                    ddComp.getDamageType());
                dmgComp.setDamageCateg(ddComp.getDamageCateg());
                dmgComp.setSource(ddComp.getSource());
                ent.add(dmgComp);

                const msg = ddComp.getMsg();
                if (msg) {
                    RG.gameMsg({cell: ent.getCell(), msg});
                }
            }
        });
    }

    /* Decreases duration in Fading comp, then remove the entity if duration is
     * 0. */
    public _applyFading(ent): void {
        const fadingComp = ent.get('Fading');
        fadingComp.decrDuration();
        if (fadingComp.getDuration() <= 0) {
            if (RG.isActor(ent)) {
                const cell = ent.getCell();
                const level = ent.getLevel();
                if (level.removeActor(ent)) {
                    POOL.emitEvent(RG.EVT_ACTOR_KILLED, {actor: ent});
                    const msg = `${ent.getName()} disappears.`;
                    RG.gameMsg({cell, msg});
                }
                else {
                    const json = JSON.stringify(ent);
                    RG.err('System.TimeEffects', '_applyFading',
                        `Could not remove actor from level: ${json}`);
                }
            }
            else {
                RG.err('System.TimeEffects', '_applyFading',
                    'Fading not handled for non-actors yet.');
            }
            ent.remove(fadingComp);
        }
    }

    public _applyHeat(ent): void {
        if (ent.has('Coldness')) {
            const cell = ent.getCell();
            ent.removeAll('Coldness');
            const msg = `Thanks to heat, ${ent.getName()} stops shivering`;
            RG.gameMsg({cell, msg});
        }
        ent.removeAll('Heat');
    }

    // TODO
    public _applyColdness(ent: Entity): void {
        if (ent.has('BodyTemp')) {
            const tempComp = ent.get('BodyTemp');
            tempComp.decr();
            if (tempComp.isFrozen()) {
                const dmgComp = new Component.Damage(1, RG.DMG.COLD);
                ent.add(dmgComp);
            }
        }
    }

    public _applyRegenEffect(ent: Entity): void {
        const regenEffects = ent.getList('RegenEffect');
        regenEffects.forEach(effComp => {
            let shouldRemove = true;
            if (effComp.getHP() > 0) {
                const waitHP = effComp.getWaitHP();
                if (waitHP === 0) {
                    const health = ent.get('Health');
                    if (health) {
                        health.addHP(effComp.getHP());
                        if (health.getHP() < health.getMaxHP()) {
                            shouldRemove = false;
                        }
                    }
                    effComp.setWaitHP(effComp.getMaxWaitHP());
                }
                else {
                    effComp.setWaitHP(waitHP - 1);
                }
            }
            if (effComp.getPP() > 0) {
                const waitPP = effComp.getWaitPP();
                if (waitPP === 0) {
                    const power = ent.get('SpellPower');
                    if (power) {
                        power.addPP(effComp.getPP());
                        if (power.getPP() < power.getMaxPP()) {
                            shouldRemove = false;
                        }
                    }
                    effComp.setWaitPP(effComp.getMaxWaitPP());
                }
                else {
                    effComp.setWaitPP(waitPP - 1);
                }
            }
            if (shouldRemove) {
                ent.remove(effComp);
            }
        });
    }


    /* Used for debug printing.*/
    public printMatchedType(ent: Entity): void {
        for (let i = 0; i < this.compTypes.length; i++) {
            if (ent.has(this.compTypes[i])) {
                RG.debug(this.compTypes[i], 'Has component');
            }
        }
    }

}
