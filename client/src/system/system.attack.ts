
import RG from '../rg';
import {SystemBase} from './system.base';
import * as Component from '../component';
import {Brain} from '../brain';

type EventPool = import('../eventpool').EventPool;
type Entity = import('../entity').Entity;

/* Processes entities with attack-related components.*/
export class SystemAttack extends SystemBase {

    constructor(compTypes: string[], pool: EventPool) {
        super(RG.SYS.ATTACK, compTypes, pool);
    }

    public updateEntity(ent: Entity): void {
        const compList = ent.getList('Attack');
        compList.forEach(attComp => {
            this.processAttackComp(ent, attComp);
            ent.remove(attComp);
        });
    }

    public processAttackComp(ent, attComp): void {
        const att = ent;
        const def = attComp.getTarget();
        const aName = RG.getName(att);
        const dName = RG.getName(def);

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

            const nHits = att.get('Combat').getNumHits();
            for (let i = 0; i < nHits; i++) {
                this.performAttack(att, def, aName, dName);
            }

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
                        const cMsg = `${defName} seems to counter attack.`;
                        RG.gameMsg({cell: biDirTarget.getCell(), msg: cMsg});
                        this.performAttack(biDirTarget, att, defName, aName);
                    }
                }
            }

            att.getBrain().getMemory().setLastAttacked(def);
        }
    }

    public addAttackerBonus(att): number {
        const cells = Brain.getEnemyCellsAround(att);
        return cells.length;
    }

    public addDefenderBonus(def): number {
        const cells = Brain.getEnemyCellsAround(def);
        return cells.length;
    }

    public performAttack(att, def, aName, dName): void {
        if (def.has('Charm')) {
            if (this.attIsCharmed(att, def)) {
                let msg = `${att.getName()} is charmed by ${def.getName()} `;
                msg += ', and does not attack';
                RG.gameMsg({cell: att.getCell(), msg});
                return;
            }
        }

        let totalAtt = RG.getMeleeAttack(att);
        if (att.has('Attacker')) {
            totalAtt += this.addAttackerBonus(att);
        }

        const totalDef = this.getEntityDefense(def);
        const hitChance = totalAtt / (totalAtt + totalDef);
        const hitThreshold = this.rng.getUniform();
        this._emitDbgMsg(`hitChance is ${hitChance}, threshold ${hitThreshold}`, att);

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
    public getEntityDefense(def): number {
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
    }

    public doDamage(att, def, dmg: number): void {
        const dmgComp = new Component.Damage(dmg, RG.DMG.MELEE);
        dmgComp.setSource(att);
        if (this.debugEnabled) {
            const attStr = `${att.getName()}, ID: ${att.getID()}`;
            this._emitDbgMsg(`Dmg: ${dmg}, 'Melee' from ${attStr}`, def);
        }
        def.add(dmgComp);
        RG.gameWarn({cell: att.getCell(),
            msg: att.getName() + ' hits ' + def.getName()});
    }

    /* Gets an enemy target for bi-directional strike, if any. */
    public getBiDirTarget(att, def) {
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
    public checkForShieldSkill(
            thr: number, totalAtt: number, totalDef: number, def
    ): void {
        if (def.has('Skills')) {
            const shieldBonus = def.getShieldDefense();
            const defNoShield = totalDef - shieldBonus;
            const hitChange = totalAtt / (totalAtt + defNoShield);
            if (hitChange > thr) { // Would've hit without shield
                SystemBase.addSkillsExp(def, 'Shields', 1);
            }
        }
    }

    public attIsCharmed(att, def: Entity): boolean {
        const charmList = def.getList('Charm');
        let isSuccess = false;
        charmList.forEach(charmComp => {
            const charmTarget = charmComp.getTargetActor();
            const charmLevel = charmComp.getLevel();
            const attWillpower = att.getWillpower();
            let charmSuccess = charmLevel / (charmLevel + attWillpower);
            if (charmTarget !== RG.NO_TARGET && charmTarget === att.getID()) {
                charmSuccess = 2 * (charmLevel / (charmLevel + attWillpower));
                if (charmSuccess > 0.80) {
                    charmSuccess = 0.80;
                }
            }
            if (RG.isSuccess(charmSuccess)) {
                isSuccess = true;
            }
        });
        return isSuccess;
    }

    public _applyAddOnHitComp(att, def: Entity): void {
        const weapon = att.getWeapon();
        if (weapon && weapon.has) { // Attack was done using weapon
            if (weapon.has('AddOnHit')) {
                const addOnHit = weapon.get('AddOnHit');
                if (addOnHit.getOnAttackHit()) {
                    const comp = addOnHit.getCompToAdd();
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
                    const comp = addOnHit.getCompToAdd();
                    SystemBase.addCompToEntAfterHit(comp, def, src);
                }
            }
        }

    }
}
