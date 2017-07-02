
const RG = require('./rg.js');

//---------------------------------------------------------------------------
// ECS SYSTEMS {{{1
//---------------------------------------------------------------------------

RG.System = {};

/* Base class for all systems in ECS framework.*/
RG.System.Base = function(type, compTypes) {

    this.type = type;           // Type of the system
    this.compTypes = compTypes; // Required comps in entity
    this.entities = {};         // Entities requiring processing

    // If set to true, only one comp has to match the compTypes, otherwise all
    // components in compTypes must be present
    this.compTypesAny = false;

    this.addEntity = function(entity) {
        this.entities[entity.getID()] = entity;
    };

    this.removeEntity = function(entity) {
        delete this.entities[entity.getID()];
    };

    /* Listens to add/removes for each component type in compTypes.*/
    this.hasNotify = true;
    this.notify = function(evtName, obj) {
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
    };

    /* Returns true if entity has all required component types, or if
     * compTypesAny if set, if entity has any required component.*/
    this.hasCompTypes = function(entity) {
        if (this.compTypesAny === false) { // All types must be present
            for (let i = 0; i < compTypes.length; i++) {
                if (!entity.has(compTypes[i])) {return false;}
            }
            return true;
        }
        else { // Only one compType has to be present
            for (let j = 0; j < compTypes.length; j++) {
                if (entity.has(compTypes[j])) {return true;}
            }
            return false;
        }
    };

    // Add a listener for each specified component type
    for (let i = 0; i < this.compTypes.length; i++) {
        RG.POOL.listenEvent(this.compTypes[i], this);
    }

};

/* Processes entities with attack-related components.*/
RG.System.Attack = function(type, compTypes) {
    RG.System.Base.call(this, type, compTypes);

    this.update = function() {
        for (const e in this.entities) {
            if (!e) {continue;}
            const ent = this.entities[e];

            const att = ent;
            const def = ent.get('Attack').getTarget();
            const aName = att.getName();
            const dName = def.getName();

            if (def.has('Ethereal')) {
                RG.gameMsg({cell: att.getCell(),
                    msg: 'Attack of ' + aName + ' passes through ' + dName});
            }
            else {
                // Actual hit change calculation
                const totalAttack = att.getAttack();
                const totalDefense = def.getDefense();
                const hitChange = totalAttack / (totalAttack + totalDefense);

                if (hitChange > RG.RAND.getUniform()) {
                    const totalDamage = att.getDamage();
                    if (totalDamage > 0) {this.doDamage(att, def, totalDamage);}
                    else {
RG.gameMsg({cell: att.getCell,
                            msg: aName + ' fails to hurt ' + dName});
}
                }
                else {
                    RG.gameMsg({cell: att.getCell(),
                        msg: aName + ' misses ' + dName});
                }
                def.addEnemy(att);
            }
            ent.remove('Attack');
        }
    };

    this.doDamage = function(att, def, dmg) {
        const dmgComp = new RG.Component.Damage(dmg, 'cut');
        dmgComp.setSource(att);
        def.add('Damage', dmgComp);
        RG.gameWarn({cell: att.getCell(),
            msg: att.getName() + ' hits ' + def.getName()});
    };
};
RG.extend2(RG.System.Attack, RG.System.Base);

// Missile has
// srcX/Y, targetX/X, path, currX/Y, shooter + all damage components, item ref
// SourceComponent, TargetComponent, LocationComponent, OwnerComponent

/* Processes all missiles launched by actors/traps/etc.*/
RG.System.Missile = function(type, compTypes) {
    RG.System.Base.call(this, type, compTypes);

    this.update = function() {
        for (const e in this.entities) {
            if (!e) {continue;}

            const ent = this.entities[e];
            const mComp = ent.get('Missile');
            const level = mComp.getLevel();
            const map = level.getMap();

            while (mComp.isFlying() && !mComp.inTarget() && mComp.hasRange()) {

                // Advance missile to next cell
                mComp.next();
                const currX = mComp.getX();
                const currY = mComp.getY();
                const currCell = map.getCell(currX, currY);

                // Wall was hit, stop missile
                if (currCell.hasPropType('wall')) {
                    mComp.prev();
                    const prevX = mComp.getX();
                    const prevY = mComp.getY();
                    const prevCell = map.getCell(prevX, prevY);

                    this.finishMissileFlight(ent, mComp, prevCell);
                    RG.debug(this, 'Stopped missile to wall');
                    RG.gameMsg(ent.getName() + ' thuds to the wall');
                }
                else if (currCell.hasProp('actors')) {
                    const actor = currCell.getProp('actors')[0];
                    // Check hit and miss
                    if (this.targetHit(actor, mComp)) {
                        this.finishMissileFlight(ent, mComp, currCell);
                        const dmg = mComp.getDamage();
                        const damageComp = new RG.Component.Damage(dmg,
                            'thrust');
                        damageComp.setSource(mComp.getSource());
                        damageComp.setDamage(mComp.getDamage());
                        actor.add('Damage', damageComp);
                        RG.debug(this, 'Hit an actor');
                        RG.gameWarn(ent.getName() + ' hits ' + actor.getName());
                    }
                    else if (mComp.inTarget()) {
                        this.finishMissileFlight(ent, mComp, currCell);
                        RG.debug(this, 'In target cell, and missed an entity');
                        RG.gameMsg(ent.getName() + ' misses the target');
                    }
                    else if (!mComp.hasRange()) {
                        this.finishMissileFlight(ent, mComp, currCell);
                        RG.debug(this, 'Missile out of range. Missed entity.');
                        RG.gameMsg(ent.getName() + ' misses the target');
                    }
                }
                else if (mComp.inTarget()) {
                    this.finishMissileFlight(ent, mComp, currCell);
                    RG.debug(this, 'In target cell but no hits');
                    RG.gameMsg(ent.getName() + " doesn't hit anything");
                }
                else if (!mComp.hasRange()) {
                    this.finishMissileFlight(ent, mComp, currCell);
                    RG.debug(this, 'Missile out of range. Hit nothing.');
                    RG.gameMsg(ent.getName() + " doesn't hit anything");
                }
            }

        }
    };

    this.finishMissileFlight = function(ent, mComp, currCell) {
        mComp.stopMissile(); // Target reached, stop missile
        ent.remove('Missile');
        const level = mComp.getLevel();
        level.addItem(ent, currCell.getX(), currCell.getY());
    };

    /* Returns true if the target was hit.*/
    this.targetHit = function(target, mComp) {
        const attack = mComp.getAttack();
        const defense = target.get('Combat').getDefense();
        const hitProp = attack / (attack + defense);
        const hitRand = RG.RAND.getUniform();
        if (hitProp > hitRand) {return true;}
        return false;
    };

};
RG.extend2(RG.System.Missile, RG.System.Base);

/* Processes entities with damage component.*/
RG.System.Damage = function(type, compTypes) {
    RG.System.Base.call(this, type, compTypes);

    this.update = function() {
        for (const e in this.entities) {
            if (!e) {continue;}

            const ent = this.entities[e];
            if (ent.has('Health')) {
                const health = ent.get('Health');
                let totalDmg = _getDamageReduced(ent);

                // Check if any damage was done at all
                if (totalDmg <= 0) {
                    totalDmg = 0;
                    RG.gameMsg("Attack doesn't penetrate protection of "
                        + ent.getName());
                }
                else {
                    health.decrHP(totalDmg);
                }

                if (health.isDead()) {
                    if (ent.has('Loot')) {
                        const entCell = ent.getCell();
                        ent.get('Loot').dropLoot(entCell);
                    }
                    _dropInvAndEq(ent);

                    const src = ent.get('Damage').getSource();
                    _killActor(src, ent);
                }
                ent.remove('Damage'); // After dealing damage, remove comp
            }
        }
    };

    /* Checks if protection checks can be applied to the damage caused. For
     * damage like hunger and poison, no protection helps.*/
    const _getDamageReduced = function(ent) {
        const dmgComp = ent.get('Damage');
        const dmg = dmgComp.getDamage();
        const src = dmgComp.getSource();

        if (src !== null) {ent.addEnemy(src);}

        // Deal with "internal" damage bypassing protection here
        if (dmgComp.getDamageType() === 'poison') {
            RG.gameDanger('Poison is gnawing inside ' + ent.getName());
            return dmg;
        }
        else if (dmgComp.getDamageType() === 'hunger') {
            return dmg;
        }

        // Take defs protection value into account
        const protEquip = ent.getEquipProtection();
        const protStats = ent.get('Combat').getProtection();
        const protTotal = protEquip + protStats;
        const totalDmg = dmg - protTotal;
        return totalDmg;
    };

    const _dropInvAndEq = function(actor) {
        const cell = actor.getCell();
        const x = cell.getX();
        const y = cell.getY();
        const invEq = actor.getInvEq();
        const items = invEq.getInventory().getItems();
        items.forEach(item => {
            if (invEq.removeItem(item)) {
                const rmvItem = invEq.getRemovedItem();
                actor.getLevel().addItem(rmvItem, x, y);
            }
        });

        // TODO remove equipped items and drop to ground.
    };

    /* Removes actor from current level and emits Actor killed event.*/
    const _killActor = function(src, actor) {
        const dmgComp = actor.get('Damage');
        const level = actor.getLevel();
        const cell = actor.getCell();
        if (level.removeActor(actor)) {
            if (actor.has('Experience')) {
                _giveExpToSource(src, actor);
            }
            const dmgType = dmgComp.getDamageType();
            if (dmgType === 'poison') {
                RG.gameDanger({cell,
                    msg: actor.getName() + ' dies horribly of poisoning!'});
            }

            let killMsg = actor.getName() + ' was killed';
            if (src !== null) {killMsg += ' by ' + src.getName();}

            RG.gameDanger({cell, msg: killMsg});
            RG.POOL.emitEvent(RG.EVT_ACTOR_KILLED, {actor});
        }
        else {
            RG.err('System.Combat', 'killActor', "Couldn't remove actor");
        }
    };

    /* When an actor is killed, gives experience to damage's source.*/
    const _giveExpToSource = function(att, def) {
        if (att !== null) {
            const defLevel = def.get('Experience').getExpLevel();
            const defDanger = def.get('Experience').getDanger();
            const expPoints = new RG.Component.ExpPoints(defLevel + defDanger);
            att.add('ExpPoints', expPoints);
        }
    };

};
RG.extend2(RG.System.Damage, RG.System.Base);

/* Called for entities which gained experience points recently.*/
RG.ExpPointsSystem = function(type, compTypes) {
    RG.System.Base.call(this, type, compTypes);

    this.update = function() {
        for (const e in this.entities) {
            if (!e) {continue;}
            const ent = this.entities[e];

            const expComp = ent.get('Experience');
            const expPoints = ent.get('ExpPoints');

            const expLevel = expComp.getExpLevel();

            let exp = expComp.getExp();
            exp += expPoints.getExpPoints();
            expComp.setExp(exp);

            const nextLevel = expLevel + 1;
            let reqExp = 0;
            for (let i = 1; i <= nextLevel; i++) {
                reqExp += (i - 1) * 10;
            }

            if (exp >= reqExp) { // Required exp points exceeded
                RG.levelUpActor(ent, nextLevel);
                RG.gameSuccess(ent.getName() + ' advanced to level '
                    + nextLevel);
            }
            ent.remove('ExpPoints');
        }
    };

};

RG.extend2(RG.ExpPointsSystem, RG.System.Base);

/* This system handles all entity movement.*/
RG.System.Movement = function(type, compTypes) {
    RG.System.Base.call(this, type, compTypes);

    this.update = function() {
        for (const e in this.entities) {
            if (!e) {continue;}
            const ent = this.entities[e];
            this.moveEntity(ent);
        }
    };

    this.moveEntity = function(ent) {
        const x = ent.get('Movement').getX();
        const y = ent.get('Movement').getY();
        const level = ent.get('Movement').getLevel();
        const map = level.getMap();
        const cell = map.getCell(x, y);

        if (cell.isFree()) {
            const xOld = ent.getX();
            const yOld = ent.getY();
            RG.debug(this, 'Trying to move ent from ' + xOld + ', ' + yOld);

            const propType = ent.getPropType();
            if (map.removeProp(xOld, yOld, propType, ent)) {
                map.setProp(x, y, propType, ent);
                ent.setXY(x, y);

                if (ent.hasOwnProperty('isPlayer')) {
                    if (ent.isPlayer()) {this.checkMessageEmits(cell);}
                }

                ent.remove('Movement');
                return true;
            }
            else {
                const coord = xOld + ', ' + yOld;
                RG.err('MovementSystem', 'moveActorTo',
                    "Couldn't remove ent |" + ent.getName() + '| @ ' + coord);
            }
        }
        else {
            RG.debug(this, "Cell wasn't free at " + x + ', ' + y);
        }
        ent.remove('Movement');
        return false;
    };

    /* If player moved to the square, checks if any messages must
     * be emitted. */
    this.checkMessageEmits = function(cell) {
        if (cell.hasStairs()) {
            const stairs = cell.getStairs();
            const level = stairs.getTargetLevel();
            let msg = 'You see stairs here';
            if (level.getParent()) {
                const name = level.getParent();
                msg += `. They seem to be leading to ${name}`;
            }
            RG.gameMsg(msg);
        }
        if (cell.hasProp('items')) {
            const items = cell.getProp('items');
            const topItem = items[0];
            let topItemName = topItem.getName();
            if (topItem.count > 1) {
                topItemName = topItem.count + ` ${topItemName}`;
                if (!(/s$/).test(topItemName)) {
                    topItemName += 's';
                }
            }

            if (items.length > 1) {
                RG.gameMsg('There are several items here. ' +
                    `You see ${topItemName} on top`);
            }
            else if (topItem.count > 1) {
                RG.gameMsg(`There are ${topItemName} on the floor`);
            }
            else {
                RG.gameMsg(topItemName + ' is on the floor');
            }
            if (topItem.has('Unpaid')) {
                if (topItem.count > 1) {RG.gameMsg('They are for sale');}
                else {RG.gameMsg('It is for sale');}
            }
        }
    };

};
RG.extend2(RG.System.Movement, RG.System.Base);


/* Stun system removes Movement/Attack components from actors to prevent. */
RG.System.Stun = function(type, compTypes) {
    RG.System.Base.call(this, type, compTypes);

    this.update = function() {
        for (const e in this.entities) {
            if (!e) {continue;}
            const ent = this.entities[e];
            if (ent.has('Attack')) {
                ent.remove('Attack');
                RG.gameMsg({cell: ent.getCell(),
                    msg: ent.getName() + ' is too stunned to attack.'});
            }
            else if (ent.has('Movement')) {
                ent.remove('Movement');
                RG.gameMsg({cell: ent.getCell(),
                    msg: ent.getName() + ' is too stunned to move.'});
            }
        }
    };

};
RG.extend2(RG.System.Stun, RG.System.Base);

/* Processes entities with hunger component.*/
RG.System.Hunger = function(type, compTypes) {
    RG.System.Base.call(this, type, compTypes);

    this.update = function() {
        for (const e in this.entities) {
            if (!e) {continue;}
            const ent = this.entities[e];
            const hungerComp = ent.get('Hunger');
            const actionComp = ent.get('Action');
            hungerComp.decrEnergy(actionComp.getEnergy());
            actionComp.resetEnergy();
            if (hungerComp.isStarving()) {
                // Don't make hunger damage too obvious
                const takeDmg = RG.RAND.getUniform();
                if (ent.has('Health') && takeDmg < 0.10) {
                    const dmg = new RG.Component.Damage(1, 'hunger');
                    ent.add('Damage', dmg);
                    RG.gameWarn(ent.getName() + ' is starving!');
                }
            }
        }
    };

};
RG.extend2(RG.System.Hunger, RG.System.Base);

/* Processes entities with communication component.*/
RG.System.Communication = function(type, compTypes) {
    RG.System.Base.call(this, type, compTypes);

    // Each entity here has received communication and must capture its
    // information contents
    this.update = function() {
        for (const e in this.entities) {
            if (!e) {continue;}
            const ent = this.entities[e];
            const comComp = ent.get('Communication');
            const messages = comComp.getMsg();
            for (let i = 0; i < messages.length; i++) {
                this.processMessage(ent, messages[i]);
            }
            ent.remove('Communication');
        }
    };

    this.processMessage = function(ent, msg) {
        if (_msgFunc.hasOwnProperty(msg.type)) {
            _msgFunc[msg.type](ent, msg);
        }
        else {
            RG.err('CommunicationSystem', 'processMessage',
                'No function for msg type |' + msg.type + '| in dtable.');
        }
    };

    this.processEnemies = function(ent, msg) {
        const enemies = msg.enemies;
        for (let i = 0; i < enemies.length; i++) {
            ent.addEnemy(enemies[i]);
        }
    };

    // Dispatch table for different messages
    const _msgFunc = {
        Enemies: this.processEnemies
    };

};
RG.extend2(RG.System.Communication, RG.System.Base);

/* System which handles time-based effects like poisoning etc. It also handles
 * expiration of effects. This is a special system because its updates are
 * scheduled by the scheduler to guarantee a specific execution interval. */
RG.System.TimeEffects = function(type, compTypes) {
    RG.System.Base.call(this, type, compTypes);
    this.compTypesAny = true;

    // Dispatch table used to call a handler function for each component
    const _dtable = {};
    let _expiredEffects = [];

    this.update = function() {
        for (const e in this.entities) {
            if (!e) {continue;}
            const ent = this.entities[e];

            // Process timed effects like poison etc.
            for (let i = 0; i < compTypes.length; i++) {
                if (compTypes[i] !== 'Expiration') {
                    if (ent.has(compTypes[i])) {
                        // Call dispatch table function
                        _dtable[compTypes[i]](ent);
                    }
                }
            }
            // Process expiration effects/duration of Expiration itself
            if (ent.has('Expiration')) {_decreaseDuration(ent);}
        }


        // Remove expired effects (mutates this.entities, so done outside for)
        // Removes Expiration, as well as comps like Poison/Stun/Disease etc.
        for (let j = 0; j < _expiredEffects.length; j++) {
            const compName = _expiredEffects[j][0];
            const entRem = _expiredEffects[j][1];
            entRem.remove(compName);
        }
        _expiredEffects = [];
    };

    /* Decreases the remaining duration in the component by one.*/
    const _decreaseDuration = function(ent) {
        const tEff = ent.get('Expiration');
        tEff.decrDuration();

        // Remove Expiration only if other components are removed
        if (!tEff.hasEffects()) {
            _expiredEffects.push(['Expiration', ent]);
        }
    };


    /* Applies the poison effect to the entity.*/
    const _applyPoison = function(ent) {
        const poison = ent.get('Poison');

        if (ent.get('Health').isDead()) {
            _expiredEffects.push(['Poison', ent]);
            if (ent.has('Expiration')) {
                const te = ent.get('Expiration');
                if (te.hasEffect(poison)) {
                    te.removeEffect(poison);
                }
            }
        }
        else if (RG.RAND.getUniform() < poison.getProb()) {
            const poisonDmg = poison.getDamage();
            const dmg = new RG.Component.Damage(poisonDmg, 'poison');
            dmg.setSource(poison.getSource());
            ent.add('Damage', dmg);
        }
    };

    _dtable.Poison = _applyPoison;

    /* Used for debug printing.*/
    this.printMatchedType = function(ent) {
        for (let i = 0; i < this.compTypes.length; i++) {
            if (ent.has(this.compTypes[i])) {
                RG.debug(this.compTypes[i], 'Has component');
            }
        }
    };

};
RG.extend2(RG.System.Communication, RG.System.Base);

// }}} SYSTEMS

module.exports = RG.System;
