
import RG from '../rg';
import {SystemBase} from './system.base';
import {EventPool} from '../eventpool';
import {Entity} from '../entity';
import * as Component from '../component';
import {executeCompCb} from './system.utils';

type ItemBase = import('../item').ItemBase;

type CompEntry = [number, Entity];


/* System which handles time-based effects like poisoning etc. It also handles
 * expiration of effects. This is a special system because its updates are
 * scheduled by the scheduler to guarantee a specific execution interval. */
export class SystemTimeEffects extends SystemBase {

    private _dtable: {[key: string]: (ent: Entity) => void};
    private _expiredEffects: CompEntry[];

    constructor(compTypes: string[], pool: EventPool) {
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
        this._dtable.Drowning = this._applyDrowningEffect.bind(this);
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
                dmgComp.setDamageCateg(RG.DMG.EFFECT);
                ent.add(dmgComp);
            }
        });
    }

    /* Applies direct damage effect to given entity. */
    public _applyDirectDamage(ent: Entity): void {
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
                    const cell = ent.get('Location').getCell();
                    RG.gameMsg({cell, msg});
                }
            }
        });
    }

    /* Decreases duration in Fading comp, then remove the entity if duration is
     * 0. */
    public _applyFading(ent: Entity): void {
        const fadingComp = ent.get('Fading');
        fadingComp.decrDuration();
        if (fadingComp.getDuration() <= 0) {
            const locComp = ent.get('Location');
            const cell = locComp.getCell();
            const level = locComp.getLevel();
            if (RG.isActor(ent)) {
                if (level.removeActor(ent)) {
                    this.pool.emitEvent(RG.EVT_ACTOR_KILLED, {actor: ent});
                    const msg = `${ent.getName()} disappears.`;
                    RG.gameMsg({cell, msg});
                }
                else {
                    const json = JSON.stringify(ent);
                    RG.err('System.TimeEffects', '_applyFading',
                        `Could not remove actor from level: ${json}`);
                }
            }
            else if (RG.isElementXY(ent) && ent.has('Location')) {
                const [x, y] = ent.getXY();
                if (level.removeElement(ent, x, y)) {
                    // this.pool.emitEvent(RG.EVT_ACTOR_KILLED, {actor: ent});
                    const msg = `${ent.getName()} disappears.`;
                    RG.gameMsg({cell, msg});
                }
                else {
                    const json = JSON.stringify(ent);
                    RG.err('System.TimeEffects', '_applyFading',
                        `Could not remove element from level: ${json}`);
                }
            }
            else if (RG.isItem(ent)) {
                // Should check if item is owned
                const item = ent as ItemBase;
                const [x, y] = item.getXY();
                if (level.removeItem(ent, x, y)) {
                    // this.pool.emitEvent(RG.EVT_ACTOR_KILLED, {actor: ent});
                    const msg = `${ent.getName()} disappears.`;
                    RG.gameMsg({cell, msg});
                }
                else {
                    const json = JSON.stringify(ent);
                    RG.err('System.TimeEffects', '_applyFading',
                        `Could not remove item from level: ${json}`);
                }
            }
            else {
                RG.err('System.TimeEffects', '_applyFading',
                    'Fading not handled for non-actors|non-elems yet.');
            }

            if (ent.has('Callbacks')) {
                const cbsComp = ent.get('Callbacks');
                if (cbsComp.hasCb('onFadeout')) {
                    const fadeoutCb = cbsComp.cb('onFadeout');
                    const cbObj = Object.assign({level}, fadeoutCb);
                    executeCompCb(ent, cbObj);
                }
            }

            ent.remove(fadingComp);
        }
    }

    /* Processes any Heat source and applies the effect to the Entity. */
    public _applyHeat(ent: Entity): void {
        const heatComps = ent.getList('Heat');
        heatComps.forEach(heat => {
            const heatLevel = heat.getLevel();
            const locComp = ent.get('Location');
            if (ent.has('Coldness')) {
                const cell = locComp.getCell();
                ent.removeAll('Coldness');
                const msg = `Thanks to heat, ${RG.getName(ent)} stops shivering`;
                if (ent.has('BodyTemp')) {
                    const tempComp = ent.get('BodyTemp');
                    tempComp.incr();
                }
                RG.gameMsg({cell, msg});
            }
            if (ent.has('Drenched')) {
                const cell = locComp.getCell();
                const drenched = ent.get('Drenched');
                drenched.decrLevel(heatLevel);
                const msg = `${RG.getName(ent)} feels a bit drier due to warmth!`;
                RG.gameMsg({cell, msg});
                if (drenched.isDry()) {
                    ent.remove(drenched);
                }
            }
        });
        ent.removeAll('Heat');
    }

    // TODO
    public _applyColdness(ent: Entity): void {
        if (ent.has('BodyTemp')) {
            const tempComp = ent.get('BodyTemp');
            let freezeFactor = 1;
            if (ent.has('Drenched')) {
                freezeFactor = Math.min(1, ent.get('Drenched').getLevel());
            }
            tempComp.decr(freezeFactor);

            if (tempComp.isFreezing()) {
                if (RG.isSuccess(0.1)) {
                    const dmgComp = new Component.Damage(1, RG.DMG.COLD);
                    ent.add(dmgComp);
                }
            }

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
                    shouldRemove = false;
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
                    shouldRemove = false;
                }
            }
            if (shouldRemove) {
                ent.remove(effComp);
            }
        });
    }

    public _applyDrowningEffect(ent: Entity): void {
        const drowning = ent.get('Drowning');
        if (ent.has('Health')) {
            const dmg = 5;
            const dmgComp = new Component.Damage(dmg, RG.DMG.WATER);
            dmgComp.setDamageCateg(RG.DMG.WATER);
            ent.add(dmgComp);
        }
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
