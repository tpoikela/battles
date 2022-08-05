
import RG from '../rg';
import {SystemBase} from './system.base';
import {EventPool} from '../eventpool';
import * as Component from '../component';
import {addRegenEffects} from './system.utils';

type Cell = import('../map.cell').Cell;

/* Processes entities with damage component.*/
export class SystemDamage extends SystemBase {

    constructor(compTypes: string[], pool: EventPool) {
        super(RG.SYS.DAMAGE, compTypes, pool);
    }

    public processDamageComp(ent, dmgComp): void {
        const health = ent.get('Health');
        if (health) {
            let totalDmg = this._getDamageModified(ent, dmgComp);

            // Check if any damage was done at all
            if (totalDmg <= 0) {
                totalDmg = 0;
                const msg = 'Attack doesn\'t penetrate protection of '
                    + ent.getName();
                RG.gameMsg({msg, cell: ent.getCell()});
            }
            else {
                this._applyAddOnHitComp(ent, dmgComp);
                health.decrHP(totalDmg);
                SystemBase.addSkillsExp(ent, RG.SKILLS.ARMOUR, 1);

                if (ent.has('Regeneration')) {
                    addRegenEffects(ent);
                }

                if (this.debugEnabled) {
                    const hpMax = health.getMaxHP();
                    const hp = health.getHP();
                    const msg = `(${totalDmg}),(${hp}/${hpMax})`;
                    RG.gameDanger({msg, cell: ent.getCell()});
                }
            }

            const damageSrc = this._getUltimateDmgSource(dmgComp);
            if (damageSrc && (ent.getID() !== damageSrc.getID())) {
                if (RG.isActor(damageSrc)) {
                    // At the moment, allow only actors as enemies
                    ent.addEnemy(damageSrc);
                }
            }

            if (health.isDead() && !ent.has('Dead')) {
                if (!ent.has('DeathEvent')) {
                    const deathComp = new Component.DeathEvent();
                    deathComp.setSource(damageSrc);
                    if (dmgComp.isType(RG.DMG.POISON)) {
                        const msg = ent.getName() + ' dies horribly of poisoning';
                        deathComp.setMsg(msg);
                    }
                    ent.add(deathComp);
                }
            }

            // Emit ACTOR_DAMAGED
            // Emitted only for player for efficiency reasons

            if (damageSrc && RG.isActor(damageSrc)) {
                if (damageSrc.isPlayer() || ent.isPlayer()) {
                    if (!RG.isNullOrUndef([damageSrc, ent])) {
                        const evtComp = new Component.Event();
                        evtComp.setArgs({type: RG.EVT_ACTOR_DAMAGED,
                            cause: damageSrc});
                        ent.add(evtComp);
                        if (ent.has('QuestTarget')) {
                            this.checkForDamagedQuestEvent(ent, damageSrc);
                        }
                    }
                }
            }
        }

    }

    public checkForDamagedQuestEvent(ent, player): void {
        const qTarget = ent.get('QuestTarget');
        if (qTarget.getTargetType() === 'damage') {
            const qEvent = new Component.QuestTargetEvent();
            qEvent.setEventType('damage');
            qEvent.setArgs({target: ent});
            qEvent.setTargetComp(ent.get('QuestTarget'));
            player.add(qEvent);
        }
    }

    public _getUltimateDmgSource(dmgComp) {
        let damageSrc = dmgComp.getSourceActor();
        if (!damageSrc) {
            damageSrc = dmgComp.getSource();
        }

        if (damageSrc && damageSrc.has && damageSrc.has('Created')) {
            damageSrc = damageSrc.get('Created').getCreator();
        }
        else {
            if (damageSrc && !damageSrc.has) {
                console.log('Warning. No damageSrc.has():', damageSrc);
                RG.err('System.Damage', '_getUltimateDmgSource',
                   'No damageSrc.has()');
            }
        }
        return damageSrc;
    }

    /* Checks if protection checks can be applied to the damage caused. For
     * damage like hunger and poison, no protection helps.*/
    public _getDamageModified(ent, dmgComp): number {
        const dmgType = dmgComp.getDamageType();
        let src = dmgComp.getSourceActor();
        if (!src) {
            src = dmgComp.getSource();
        }
        const dmg = this._getDmgAfterWeaknessAndResistance(ent, dmgComp);

        // Deal with "internal" damage bypassing protection here
        const cell: Cell = ent.getCell();
        if (dmgType === RG.DMG.POISON) {
            const msg = 'Poison is gnawing inside ' + ent.getName();
            RG.gameDanger({cell, msg});
            return dmg;
        }
        else if (dmgType === RG.DMG.HUNGER) {
            return dmg;
        }
        else if (dmgType === RG.DMG.FIRE) {
            const msg = `Fire is burning ${ent.getName()}.`;
            RG.gameDanger({cell, msg});
            return dmg;
        }
        else if (dmgType === RG.DMG.ICE) {
            const msg = `Ice is freezing ${ent.getName()}.`;
            RG.gameDanger({cell, msg});
            return dmg;
        }
        else if (dmgType === RG.DMG.COLD) {
            const msg = `${ent.getName()} is extremely hypothermic`;
            RG.gameInfo({cell, msg});
            return dmg;
        }

        // Magical/direct damage bypasses Protection
        const dmgCateg = dmgComp.getDamageCateg();
        if (dmgCateg === RG.DMG.MAGIC) {
            return dmg;
        }
        else if (dmgCateg === RG.DMG.DIRECT) {
            return dmg;
        }
        else if (!src && dmgCateg === RG.DMG.WATER) {
            // Source not mandatory, for example drowning has no source
            return dmg;
        }
        else if (this.isProtectionBypassed(ent, src)) {
            const msg = `${src.getName()} hits ${ent.getName()} through armor.`;
            RG.gameDanger({cell, msg});
            return dmg;
        }

        // Take defs protection value into account
        const protEquip = ent.getEquipProtection();
        const protStats = ent.get('Combat').getProtection();
        const protTotal = protEquip + protStats;
        const totalDmg = dmg - protTotal;
        return totalDmg;
    }

    public _getDmgAfterWeaknessAndResistance(ent, dmgComp): number {
        const entName = ent.getName();
        let dmg = dmgComp.getDamage();
        if (ent.has('Weakness')) {
            const weakList = ent.getList('Weakness');
            weakList.forEach(weakComp => {
                if (this.effectMatches(dmgComp, weakComp)) {
                    const effLevel = weakComp.getLevel();
                    switch (effLevel) {
                        case RG.WEAKNESS.MINOR: {
                            dmg = Math.round(1.25 * dmg); break;
                        }
                        case RG.WEAKNESS.MEDIUM: {
                            dmg = Math.round(1.5 * dmg); break;
                        }
                        case RG.WEAKNESS.SEVERE: dmg *= 2; break;
                        case RG.WEAKNESS.FATAL: {
                            dmg = ent.get('Health').getMaxHP(); break;
                        }
                        default: break;
                    }
                }
            });
        }
        if (ent.has('Resistance')) {
            let msg = '';
            const resistList = ent.getList('Resistance');
            resistList.forEach(resistComp => {
                if (this.effectMatches(dmgComp, resistComp)) {
                    const effLevel = resistComp.getLevel();
                    switch (effLevel) {
                        case RG.RESISTANCE.MINOR: {
                            dmg = Math.round(dmg / 1.25);
                            msg += ' resists the attack slighty';
                            break;
                        }
                        case RG.RESISTANCE.MEDIUM: {
                            dmg = Math.round(dmg / 1.5);
                            msg += ' resists the attack';
                            break;
                        }
                        case RG.RESISTANCE.STRONG: {
                            dmg = Math.round(dmg / 2);
                            msg += ' resists the attack strongly';
                            break;
                        }
                        case RG.RESISTANCE.IMMUNITY: {
                            dmg = 0;
                            msg += ' is immune against the attack';
                            break;
                        }
                        case RG.RESISTANCE.ABSORB: {
                            const health = ent.get('Health');
                            health.addHP(dmg);
                            msg += ' absorbs the power of the attack';
                            break;
                        }
                        default: break;
                    }

                }
            });
            if (msg !== '') {
                msg = entName + ' ' + msg;
                RG.gameMsg({msg, cell: ent.getCell()});
            }
        }
        return dmg;
    }

    public effectMatches(dmgComp, effComp): boolean {
        const effect = effComp.getEffect();
        const dmgType = dmgComp.getDamageType();
        const dmgCateg = dmgComp.getDamageCateg();
        return effect === dmgType || effect === dmgCateg;
    }

    /* Returns true if the hit bypasses defender's protection completely. */
    public isProtectionBypassed(ent, src): boolean {
        const bypassChance = this.rng.getUniform();
        if (src && !src.has) {
            console.log('src is not entity:', src);
            console.log('With entity:', ent);
            RG.err('System.Damage', 'isProtectionBypassed', 'No src.has()');
        }

        if (src && src.has('BypassProtection')) {
            return bypassChance <= src.get('BypassProtection').getChance();
        }
        return bypassChance <= RG.PROT_BYPASS_CHANCE;
    }

    /* Applies add-on hit effects such as poison, frost or others. */
    public _applyAddOnHitComp(ent, dmgComp) {
        const weapon = dmgComp.getWeapon();
        if (weapon && weapon.has) { // Attack was done using weapon
            if (weapon.has('AddOnHit')) {
                const addOnComp = weapon.get('AddOnHit');
                if (addOnComp.getOnDamage()) {
                    const comp = addOnComp.getCompToAdd();
                    SystemBase.addCompToEntAfterHit(comp, ent, dmgComp.getSource());
                }
            }
        }
        else if (weapon && weapon.onHit) {
            const src = dmgComp.getSource();
            if (weapon.onHit) {
                weapon.onHit(ent, src);
            }
        }
        else { // No weapon was used
            const src = dmgComp.getSource();
            const categ = dmgComp.getDamageCateg();
            // Prevents effects like poison from melee/hit repeating itself
            if (categ !== RG.DMG.EFFECT && categ !== RG.DMG.DIRECT) {
                if (src && src.has('AddOnHit')) {
                    const addOnComp = src.get('AddOnHit');
                    if (addOnComp.getOnDamage()) {
                        const comp = addOnComp.getCompToAdd();
                        SystemBase.addCompToEntAfterHit(comp, ent, src);
                    }
                }
            }
        }
    }


    public updateEntity(ent): void {
        const dmgComps = ent.getList('Damage');
        dmgComps.forEach(dmgComp => {
            this.processDamageComp(ent, dmgComp);
            ent.remove(dmgComp); // After dealing damage, remove comp
        });
    }
}

