
import RG from '../rg';
import {SystemBase} from './system.base';
import {Random} from '../random';
import * as Component from '../component';

const RNG = Random.getRNG();

/* Processes entities with attack-related components.*/
export class SystemAttack extends SystemBase {

    constructor(compTypes, pool?) {
        super(RG.SYS.ATTACK, compTypes, pool);
    }

    updateEntity(ent) {
        const compList = ent.getList('Attack');
        compList.forEach(attComp => {
            this.processAttackComp(ent, attComp);
            ent.remove(attComp);
        });
    }

    processAttackComp(ent, attComp) {
        const att = ent;
        const def = attComp.getTarget();
        const aName = att.getName();
        const dName = def.getName();

        if (def.has('Ethereal')) {
            RG.gameMsg({cell: att.getCell(),
                msg: 'Attack of ' + aName + ' passes through ' + dName});
        }
        else {
            // Actual hit chance calculation
            if (def.has('FirstStrike')) {
                const msg = `${dName} seems to strike first.`;
                RG.gameMsg({cell: def.getCell(), msg});
                this.performAttack(def, att, dName, aName);
            }
            this.performAttack(att, def, aName, dName);
            if (def.has('CounterAttack')) {
                const msg = `${dName} seems to counter attack.`;
                RG.gameMsg({cell: def.getCell(), msg});
                this.performAttack(def, att, dName, aName);
            }

            if (att.has('BiDirStrike')) {
                const biDirTarget = this.getBiDirTarget(att, def);
                if (biDirTarget) {
                    const msg = `${aName} tries to hit double strike.`;
                    RG.gameMsg({msg, cell: att.getCell()});
                    const defName = biDirTarget.getName();
                    this.performAttack(att, biDirTarget, aName, defName);

                    if (biDirTarget.has('CounterAttack')) {
                        const msg = `${defName} seems to counter attack.`;
                        RG.gameMsg({cell: biDirTarget.getCell(), msg});
                        this.performAttack(biDirTarget, att, defName, aName);
                    }
                }
            }

            att.getBrain().getMemory().setLastAttacked(def);
        }
    };

    addAttackerBonus(att) {
        const cells = RG.Brain.getEnemyCellsAround(att);
        return cells.length;
    }

    addDefenderBonus(def) {
        const cells = RG.Brain.getEnemyCellsAround(def);
        return cells.length;
    }

    performAttack(att, def, aName, dName) {
        let totalAtt = RG.getMeleeAttack(att);
        if (att.has('Attacker')) {
            totalAtt += this.addAttackerBonus(att);
        }

        const totalDef = this.getEntityDefense(def);
        const hitChance = totalAtt / (totalAtt + totalDef);
        const hitThreshold = RNG.getUniform();
        this.dbg(`hitChance is ${hitChance}, threshold ${hitThreshold}`);

        if (hitChance >= hitThreshold) {
            const totalDamage = att.getDamage();
            if (totalDamage > 0) {
                this.doDamage(att, def, totalDamage);
                if (def.has('Experience')) {
                    SystemBase.addSkillsExp(att, 'Melee', 1);
                }
            }
            else {
                RG.gameMsg({cell: att.getCell,
                    msg: aName + ' fails to hurt ' + dName});
            }
            this._applyAddOnHitComp(att, def);
        }
        else {
            this.checkForShieldSkill(hitThreshold, totalAtt, totalDef, def);
            RG.gameMsg({cell: att.getCell(),
                msg: aName + ' misses ' + dName});
        }

        def.addEnemy(att);

        // Emitted only for player for efficiency reasons
        if (att.isPlayer() || def.isPlayer()) {
            const evtComp = new Component.Event();
            evtComp.setArgs({type: RG.EVT_ACTOR_ATTACKED,
                cause: att});
            def.add(evtComp);
        }
    }

    /* Returns the defense value for given entity. */
    getEntityDefense(def) {
        if (def.has('Paralysis')) {
            return 0;
        }

        let totalDef = 0;
        if (def.getDefense) {
            totalDef = def.getDefense();
            if (def.has('Defender')) {
                totalDef += this.addDefenderBonus(def);
            }
        }
        return totalDef;
    };

    doDamage(att, def, dmg) {
        const dmgComp = new Component.Damage(dmg, RG.DMG.MELEE);
        dmgComp.setSource(att);
        def.add(dmgComp);
        RG.gameWarn({cell: att.getCell(),
            msg: att.getName() + ' hits ' + def.getName()});
    }

    /* Gets an enemy target for bi-directional strike, if any. */
    getBiDirTarget(att, def) {
        // 1st, find opposite x,y for the 1st attack
        const [attX, attY] = [att.getX(), att.getY()];
        const [defX, defY] = [def.getX(), def.getY()];
        const dX = -1 * (defX - attX);
        const dY = -1 * (defY - attY);
        const biDirX = attX + dX;
        const biDirY = attY + dY;

        // Once x,y found, check if there's an enemy
        const map = att.getLevel().getMap();
        if (map.hasXY(biDirX, biDirY)) {
            const cell = map.getCell(biDirX, biDirY);
            if (cell.hasActors()) {
                const targets = cell.getActors();
                for (let i = 0; i < targets.length; i++) {
                    if (att.isEnemy(targets[i])) {
                        return targets[i];
                    }
                }
            }
        }
        return null;
    }

    /* Checks if Shields skill should be increased. */
    checkForShieldSkill(thr, totalAtt, totalDef, def) {
        if (def.has('Skills')) {
            const shieldBonus = def.getShieldDefense();
            const defNoShield = totalDef - shieldBonus;
            const hitChange = totalAtt / (totalAtt + defNoShield);
            if (hitChange > thr) { // Would've hit without shield
                SystemBase.addSkillsExp(def, 'Shields', 1);
            }
        }
    }

    _applyAddOnHitComp(att, def) {
        const weapon = att.getWeapon();
        if (weapon && weapon.has) { // Attack was done using weapon
            if (weapon.has('AddOnHit')) {
                const addOnHit = weapon.get('AddOnHit');
                if (addOnHit.getOnAttackHit()) {
                    const comp = addOnHit.getComp();
                    SystemBase.addCompToEntAfterHit(comp, def, att);
                }
            }
        }
        else if (weapon && weapon.onAttackHit) {
            const src = att;
            weapon.onAttackHit(def, src);
        }
        else { // No weapon was used
            const src = att;
            if (src && src.has('AddOnHit')) {
                const addOnHit = src.get('AddOnHit');
                if (addOnHit.getOnAttackHit()) {
                    const comp = addOnHit.getComp();
                    SystemBase.addCompToEntAfterHit(comp, def, src);
                }
            }
        }

    }
}
