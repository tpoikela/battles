
const RG = require('../rg');

const System = {};
System.Base = require('./system.base');

const {addSkillsExp} = System.Base;
const RNG = RG.Random.getRNG();

// Missile has
// srcX/Y, targetX/X, path, currX/Y, shooter + all damage components, item ref
// SourceComponent, TargetComponent, LocationComponent, OwnerComponent

/* Processes all missiles launched by actors/traps/etc.*/
System.Missile = function(compTypes) {
    System.Base.call(this, RG.SYS.MISSILE, compTypes);

    this.criticalShot = RG.MISSILE_CRITICAL_SHOT;

    this.updateEntity = function(ent) {
        const mComp = ent.get('Missile');
        const attacker = mComp.getSource();
        const level = mComp.getLevel();
        const map = level.getMap();

        const targetX = mComp.getTargetX();
        const targetY = mComp.getTargetY();
        let targetCell = null;
        if (map.hasXY(targetX, targetY)) {
            targetCell = map.getCell(targetX, targetY);
        }
        const firedMsg = this._formatFiredMsg(ent, attacker);

        if (targetCell && targetCell.hasProp('actors')) {
            const targetActor = targetCell.getSentientActors()[0];
            attacker.getBrain().getMemory().setLastAttacked(targetActor);
        }

        while (mComp.isFlying() && !mComp.inTarget() && mComp.hasRange()) {

            // Advance missile to next cell
            mComp.next();
            const currX = mComp.getX();
            const currY = mComp.getY();
            let currCell = null;
            if (map.hasXY(currX, currY)) {
                currCell = map.getCell(currX, currY);
            }

            let shownMsg = '';
            if (!currCell) { // Missile out of level
                mComp.prev();
                const prevX = mComp.getX();
                const prevY = mComp.getY();
                const prevCell = map.getCell(prevX, prevY);
                this.finishMissileFlight(ent, mComp, prevCell);

                shownMsg = firedMsg + ' disappears';
            }
            // Non-actor obstacle was hit, stop missile
            else if (!currCell.hasActors() && !currCell.isPassableByAir()) {
                mComp.prev();
                const prevX = mComp.getX();
                const prevY = mComp.getY();
                const prevCell = map.getCell(prevX, prevY);
                this.finishMissileFlight(ent, mComp, prevCell);

                RG.debug(this, 'Stopped missile to wall');
                shownMsg = firedMsg + ' thuds to an obstacle';
            }
            else if (currCell.hasProp('actors')) {
                const actor = currCell.getProp('actors')[0];
                // Check hit and miss
                if (this.targetHit(ent, actor, mComp)) {
                    this.finishMissileFlight(ent, mComp, currCell);
                    const hitVerb = this._addDamageToActor(actor, mComp);
                    RG.debug(this, 'Hit an actor');
                    shownMsg = `${firedMsg} ${hitVerb} ${actor.getName()}`;

                    if (actor.has('Experience')) {
                        if (ent.getType() === 'missile') {
                            addSkillsExp(attacker, 'Throwing', 1);
                        }
                        else if (ent.getType() === 'ammo') {
                            addSkillsExp(attacker, 'Archery', 1);
                        }
                    }
                    RG.gameWarn({cell: currCell, msg: shownMsg});
                    shownMsg = '';
                }
                else if (mComp.inTarget()) {
                    this.finishMissileFlight(ent, mComp, currCell);
                    RG.debug(this, 'In target cell, and missed an entity');

                    const actor = currCell.getFirstActor();
                    if (actor) {
                        const targetName = actor.getName();
                        shownMsg = firedMsg + ' misses ' + targetName;
                    }
                    else {
                        shownMsg = firedMsg + ' misses the target';
                    }
                }
                else if (!mComp.hasRange()) {
                    this.finishMissileFlight(ent, mComp, currCell);
                    RG.debug(this, 'Missile out of range. Missed entity.');
                    shownMsg = ent.getName() + ' does not reach the target';
                }
            }
            else if (mComp.inTarget()) {
                this.finishMissileFlight(ent, mComp, currCell);
                RG.debug(this, 'In target cell but no hits');
                shownMsg = ent.getName() + " doesn't hit anything";
            }
            else if (!mComp.hasRange()) {
                this.finishMissileFlight(ent, mComp, currCell);
                RG.debug(this, 'Missile out of range. Hit nothing.');
                shownMsg = ent.getName() + " doesn't hit anything";
            }
            if (shownMsg.length > 0) {
                RG.gameMsg({cell: currCell, msg: shownMsg});
            }
        }

    };

    /* Adds damage to hit actor, and returns the verb for the message
     * corresponding to the hit (ie critical or not). */
    this._addDamageToActor = (ent, mComp) => {
        let hitVerb = 'hits';
        const dmg = mComp.getDamage();
        const damageComp = new RG.Component.Damage(dmg,
            RG.DMG.MISSILE);
        const dmgSrc = mComp.getSource();
        damageComp.setSource(dmgSrc);

        let nDamage = mComp.getDamage();
        if (dmgSrc.has('CriticalShot')) {
            if (RG.isSuccess(this.criticalShot)) {
                nDamage *= 2;
                hitVerb = 'critically hits';
            }
        }

        damageComp.setDamage(nDamage);
        ent.add(damageComp);
        return hitVerb;
    };

    this.finishMissileFlight = (ent, mComp, currCell) => {
        mComp.stopMissile(); // Target reached, stop missile
        ent.remove(mComp);

        const level = mComp.getLevel();
        let alwaysDestroy = true;
        if (!mComp.destroyItem) {
            alwaysDestroy = false;
            if (!ent.has('Indestructible')) {
                mComp.destroyItem = this._isItemDestroyed(ent);
            }
        }
        if (!mComp.destroyItem) {
            let addedToStack = false;

            // Check if missile/ammo should be stacked
            if (currCell.hasItems()) {
                const cellItems = currCell.getItems();

                cellItems.forEach(item => {
                    if (!addedToStack) {
                        addedToStack = RG.addStackedItems(item, ent);
                    }
                });
            }

            if (!addedToStack) {
                level.addItem(ent, currCell.getX(), currCell.getY());
            }
        }
        else if (!alwaysDestroy) {
            const msg = `${ent.getName()} is destroyed!`;
            RG.gameMsg({cell: currCell, msg});
        }

        const args = {
            missile: mComp,
            item: ent,
            to: [currCell.getX(), currCell.getY()],
            level
        };
        const animComp = new RG.Component.Animation(args);
        ent.add('Animation', animComp);
    };

    /* Returns true if the ammo/missile is destroyed. */
    this._isItemDestroyed = ent => {
        const name = ent.getName();
        const prob = RNG.getUniform();
        if (ent.has('Ammo')) {
            if ((/(magic|ruby|permaice)/i).test(name)) {
                return prob > 0.95;
            }
            else if ((/(iron|steel)/i).test(name)) {
                return prob > 0.90;
            }
            else {
                return prob > 0.85;
            }
        }
        else if ((/rock/i).test(name)) {
            return prob > 0.95;
        }
        else if ((/(magic|ruby|permaice)/i).test(name)) {
            return prob > 0.97;
        }
        else {
            return prob > 0.95;
        }
    };

    this._formatFiredMsg = (ent, att) => {
        let verb = 'thrown';
        if (ent.has('Ammo')) {verb = 'shot';}
        return `${ent.getName()} ${verb} by ${att.getName()}`;
    };

    /* Returns true if the target was hit.*/
    this.targetHit = (ent, target, mComp) => {
        if (target.has('Ethereal')) {
            return false;
        }

        const attacker = mComp.getSource();
        if (attacker.has('ThroughShot') && !mComp.inTarget()) {
            return false;
        }

        const isThrown = ent.getType() === 'missile';

        let attack = mComp.getAttack();
        if (attacker.has('Skills')) {
            if (isThrown) {
                attack += attacker.get('Skills').getLevel('Throwing');
            }
            else {
                attack += attacker.get('Skills').getLevel('Archery');
            }
        }
        let defense = target.getDefense();
        if (target.has('Skills')) {
            defense += target.get('Skills').getLevel('Dodge');
        }
        const hitProp = attack / (attack + defense);
        if (RG.isSuccess(hitProp)) {
            if (target.has('RangedEvasion')) {
                return RG.isSuccess(0.5);
            }
            return true;
        }
        else {
            addSkillsExp(target, 'Dodge', 1);
        }
        return false;
    };

};
RG.extend2(System.Missile, System.Base);

module.exports = System.Missile;
