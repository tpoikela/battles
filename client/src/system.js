
const RG = require('./rg.js');
RG.Path = require('./path');

RG.SYS = {};
RG.SYS.ANIMATION = Symbol();
RG.SYS.ATTACK = Symbol();
RG.SYS.CHAT = Symbol();
RG.SYS.COMMUNICATION = Symbol();
RG.SYS.DAMAGE = Symbol();
RG.SYS.DISABILITY = Symbol();
RG.SYS.EXP_POINTS = Symbol();
RG.SYS.HUNGER = Symbol();
RG.SYS.MISSILE = Symbol();
RG.SYS.MOVEMENT = Symbol();
RG.SYS.SKILLS = Symbol();
RG.SYS.SPELL_CAST = Symbol();
RG.SYS.SPELL_EFFECT = Symbol();
RG.SYS.SPIRIT = Symbol();
RG.SYS.TIME_EFFECTS = Symbol();

//---------------------------------------------------------------------------
// ECS SYSTEMS
//---------------------------------------------------------------------------

/* For adding skills experience components. */
function addSkillsExp(att, skill, pts = 1) {
    if (att.has('Skills')) {
        const comp = new RG.Component.SkillsExp();
        comp.setSkill(skill);
        comp.setPoints(pts);
        att.add(comp);
    }
}

/* After succesful hit, adds the given comp to specified entity ent. */
function addCompToEntAfterHit(comp, ent) {
    const compClone = comp.clone();

    if (comp.hasOwnProperty('duration')) {
        const compDur = compClone.rollDuration();
        const expiration = new RG.Component.Expiration();
        expiration.addEffect(compClone, compDur);
        ent.add('Expiration', expiration);
    }

    ent.add(compClone.getType(), compClone);
}


RG.System = {};

/* Base class for all systems in ECS framework.*/
RG.System.Base = function(type, compTypes) {
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

    this.update = function() {
        for (const e in this.entities) {
            if (!e) {continue;}
            this.updateEntity(this.entities[e]);
        }
    };

};

/* Processes entities with attack-related components.*/
RG.System.Attack = function(compTypes) {
    RG.System.Base.call(this, RG.SYS.ATTACK, compTypes);

    this.updateEntity = function(ent) {
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
        ent.remove('Attack');
    };

    this.doDamage = (att, def, dmg) => {
        const dmgComp = new RG.Component.Damage(dmg, RG.DMG.MELEE);
        dmgComp.setSource(att);
        def.add('Damage', dmgComp);
        RG.gameWarn({cell: att.getCell(),
            msg: att.getName() + ' hits ' + def.getName()});
    };

    this.addAttackerBonus = att => {
        const cells = RG.Brain.getEnemyCellsAround(att);
        return cells.length;
    };

    this.addDefenderBonus = def => {
        const cells = RG.Brain.getEnemyCellsAround(def);
        return cells.length;
    };

    this.performAttack = function(att, def, aName, dName) {
        let totalAtt = RG.getMeleeAttack(att);
        if (att.has('Attacker')) {
            totalAtt += this.addAttackerBonus(att);
        }

        let totalDef = def.getDefense();
        if (def.has('Defender')) {
            totalDef += this.addDefenderBonus(def);
        }

        const hitChance = totalAtt / (totalAtt + totalDef);
        const hitThreshold = RG.RAND.getUniform();

        if (hitChance > hitThreshold) {
            const totalDamage = att.getDamage();
            if (totalDamage > 0) {
                this.doDamage(att, def, totalDamage);
                addSkillsExp(att, 'Melee', 1);
            }
            else {
                RG.gameMsg({cell: att.getCell,
                    msg: aName + ' fails to hurt ' + dName});
            }
        }
        else {
            this.checkForShieldSkill(hitThreshold, totalAtt, totalDef, def);
            RG.gameMsg({cell: att.getCell(),
                msg: aName + ' misses ' + dName});
        }
        def.addEnemy(att);
    };

    /* Gets an enemy target for bi-directional strike, if any. */
    this.getBiDirTarget = (att, def) => {
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
    };

    /* Checks if Shields skill should be increased. */
    this.checkForShieldSkill = (thr, totalAtt, totalDef, def) => {
        if (def.has('Skills')) {
            const shieldBonus = def.getShieldDefense();
            const defNoShield = totalDef - shieldBonus;
            const hitChange = totalAtt / (totalAtt + defNoShield);
            if (hitChange > thr) { // Would've hit without shield
                addSkillsExp(def, 'Shields', 1);
            }
        }
    };

};
RG.extend2(RG.System.Attack, RG.System.Base);

// Missile has
// srcX/Y, targetX/X, path, currX/Y, shooter + all damage components, item ref
// SourceComponent, TargetComponent, LocationComponent, OwnerComponent

/* Processes all missiles launched by actors/traps/etc.*/
RG.System.Missile = function(compTypes) {
    RG.System.Base.call(this, RG.SYS.MISSILE, compTypes);

    this.updateEntity = function(ent) {
        const mComp = ent.get('Missile');
        const attacker = mComp.getSource();
        const level = mComp.getLevel();
        const map = level.getMap();

        const targetX = mComp.getTargetX();
        const targetY = mComp.getTargetY();
        const targetCell = map.getCell(targetX, targetY);

        if (targetCell.hasProp('actors')) {
            const targetActor = targetCell.getProp('actors')[0];
            attacker.getBrain().getMemory().setLastAttacked(targetActor);
        }

        while (mComp.isFlying() && !mComp.inTarget() && mComp.hasRange()) {

            // Advance missile to next cell
            mComp.next();
            const currX = mComp.getX();
            const currY = mComp.getY();
            const currCell = map.getCell(currX, currY);

            let shownMsg = '';
            // Wall was hit, stop missile
            if (currCell.hasPropType('wall')) {
                mComp.prev();
                const prevX = mComp.getX();
                const prevY = mComp.getY();
                const prevCell = map.getCell(prevX, prevY);

                this.finishMissileFlight(ent, mComp, prevCell);
                RG.debug(this, 'Stopped missile to wall');
                shownMsg = ent.getName() + ' thuds to the wall';
            }
            else if (currCell.hasProp('actors')) {
                const actor = currCell.getProp('actors')[0];
                // Check hit and miss
                if (this.targetHit(actor, mComp)) {
                    this.finishMissileFlight(ent, mComp, currCell);
                    const dmg = mComp.getDamage();
                    const damageComp = new RG.Component.Damage(dmg,
                        RG.DMG.MISSILE);
                    damageComp.setSource(mComp.getSource());
                    damageComp.setDamage(mComp.getDamage());
                    actor.add('Damage', damageComp);
                    RG.debug(this, 'Hit an actor');
                    shownMsg = ent.getName() + ' hits ' + actor.getName();
                    addSkillsExp(attacker, 'Archery', 1);
                }
                else if (mComp.inTarget()) {
                    this.finishMissileFlight(ent, mComp, currCell);
                    RG.debug(this, 'In target cell, and missed an entity');
                    shownMsg = ent.getName() + ' misses the target';
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

    this.finishMissileFlight = (ent, mComp, currCell) => {
        mComp.stopMissile(); // Target reached, stop missile
        ent.remove('Missile');

        if (!mComp.destroyItem) {
            const level = mComp.getLevel();
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

        const args = {
            missile: mComp,
            item: ent,
            to: [currCell.getX(), currCell.getY()]
        };
        const animComp = new RG.Component.Animation(args);
        ent.add('Animation', animComp);
    };

    /* Returns true if the target was hit.*/
    this.targetHit = (target, mComp) => {
        const attacker = mComp.getSource();
        if (attacker.has('ThroughShot') && !mComp.inTarget()) {
            return false;
        }

        const attack = mComp.getAttack();
        let defense = target.get('Combat').getDefense();
        if (target.has('Skills')) {
            defense += target.get('Skills').getLevel('Skills');
        }
        const hitProp = attack / (attack + defense);
        const hitRand = RG.RAND.getUniform();
        if (hitProp > hitRand) {
            if (target.has('RangedEvasion')) {
                return RG.RAND.getUniform() < 0.5;
            }
            return true;
        }
        else {
            addSkillsExp(target, 'Dodge', 1);
        }
        return false;
    };

};
RG.extend2(RG.System.Missile, RG.System.Base);

/* Processes entities with damage component.*/
RG.System.Damage = function(compTypes) {
    RG.System.Base.call(this, RG.SYS.DAMAGE, compTypes);

    this.updateEntity = ent => {
        if (ent.has('Health')) {
            const health = ent.get('Health');
            let totalDmg = _getDamageReduced(ent);

            // Check if any damage was done at all
            if (totalDmg <= 0) {
                totalDmg = 0;
                const msg = "Attack doesn't penetrate protection of "
                    + ent.getName();
                RG.gameMsg({msg, cell: ent.getCell()});
            }
            else {
                _applyAddOnHitComp(ent);
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
    };

    /* Checks if protection checks can be applied to the damage caused. For
     * damage like hunger and poison, no protection helps.*/
    const _getDamageReduced = ent => {
        const dmgComp = ent.get('Damage');
        const dmg = dmgComp.getDamage();
        const src = dmgComp.getSource();

        if (src !== null) {ent.addEnemy(src);}

        // Deal with "internal" damage bypassing protection here
        if (dmgComp.getDamageType() === RG.DMG.POISON) {
            const cell = ent.getCell();
            const msg = 'Poison is gnawing inside ' + ent.getName();
            RG.gameDanger({cell, msg});
            return dmg;
        }
        else if (dmgComp.getDamageType() === RG.DMG.HUNGER) {
            return dmg;
        }

        // Take defs protection value into account
        const protEquip = ent.getEquipProtection();
        const protStats = ent.get('Combat').getProtection();
        const protTotal = protEquip + protStats;
        const totalDmg = dmg - protTotal;
        return totalDmg;
    };

    /* Applies add-on hit effects such as poison, frost or others. */
    const _applyAddOnHitComp = ent => {
        const dmgComp = ent.get('Damage');
        const weapon = dmgComp.getWeapon();
        if (weapon) { // Attack was done using weapon
            if (weapon.has('AddOnHit')) {
                const comp = weapon.get('AddOnHit').getComp();
                addCompToEntAfterHit(comp, ent);
            }
        }
        else { // No weapon was used
            const src = dmgComp.getSource();
            if (src && src.has('AddOnHit')) {
                const comp = src.get('AddOnHit').getComp();
                addCompToEntAfterHit(comp, ent);
            }
        }
    };

    const _dropInvAndEq = actor => {
        const cell = actor.getCell();
        const x = cell.getX();
        const y = cell.getY();
        const invEq = actor.getInvEq();
        const items = invEq.getInventory().getItems();
        const actorLevel = actor.getLevel();

        items.forEach(item => {
            if (invEq.removeNItems(item, item.count)) {
                const rmvItem = invEq.getRemovedItem();
                actorLevel.addItem(rmvItem, x, y);
            }
        });

        // TODO remove equipped items and drop to ground.
        const eqItems = invEq.getEquipment().getItems();
        eqItems.forEach(item => {
            actorLevel.addItem(item, x, y);
        });
    };

    /* Removes actor from current level and emits Actor killed event.*/
    const _killActor = (src, actor) => {
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
            RG.err('System.Damage', 'killActor', "Couldn't remove actor");
        }
    };

    /* When an actor is killed, gives experience to damage's source.*/
    const _giveExpToSource = (att, def) => {
        if (att !== null) {
            const defLevel = def.get('Experience').getExpLevel();
            const defDanger = def.get('Experience').getDanger();
            const expPoints = new RG.Component.ExpPoints(defLevel + defDanger);
            att.add('ExpPoints', expPoints);
        }
        else {
            RG.warn('System.Damage', '_giveExpToSource',
                'att is null. Cannot assign exp.');
        }
    };

};
RG.extend2(RG.System.Damage, RG.System.Base);

/* Called for entities which gained experience points recently.*/
RG.System.ExpPoints = function(compTypes) {
    RG.System.Base.call(this, RG.SYS.EXP_POINTS, compTypes);

    this.updateEntity = ent => {
        const expList = ent.getList('ExpPoints');
        expList.forEach(expPoints => {

            const expComp = ent.get('Experience');
            let levelingUp = true;

            let exp = expComp.getExp();
            exp += expPoints.getExpPoints();
            expComp.setExp(exp);

            while (levelingUp) {
                const currExpLevel = expComp.getExpLevel();
                const nextExpLevel = currExpLevel + 1;
                let reqExp = 0;
                for (let i = 1; i <= nextExpLevel; i++) {
                    reqExp += (i - 1) * 10;
                }

                if (exp >= reqExp) { // Required exp points exceeded
                    RG.levelUpActor(ent, nextExpLevel);
                    const name = ent.getName();
                    const msg = `${name} appears to be more experienced now.`;
                    RG.gameSuccess({msg: msg, cell: ent.getCell()});
                    levelingUp = true;
                }
                else {
                    levelingUp = false;
                }
            }
            ent.remove(expPoints);
        });
    };

};

RG.extend2(RG.System.ExpPoints, RG.System.Base);

/* This system handles all entity movement.*/
RG.System.Chat = function(compTypes) {
    RG.System.Base.call(this, RG.SYS.CHAT, compTypes);

    this.updateEntity = function(ent) {
        const args = ent.get('Chat').getArgs();
        const dir = args.dir;
        const [dX, dY] = [dir[0], dir[1]];
        const x = ent.getX() + dX;
        const y = ent.getY() + dY;
        const map = ent.getLevel().getMap();
        if (map.hasXY(x, y)) {
            const cell = map.getCell(x, y);
            if (cell.hasActors()) {
                const actor = cell.getActors()[0];
                if (actor.has('Trainer')) {
                    const chatObj = actor.get('Trainer').getChatObj();
                    chatObj.setTarget(ent);
                    const selObj = chatObj.getSelectionObject();
                    const entBrain = ent.getBrain();
                    entBrain.setSelectionObject(selObj);
                }
                const msg = `You chat with ${actor.getName()} for a while.`;
                RG.gameMsg({cell, msg});
            }
            else {
                const msg = 'There is no one to talk to.';
                RG.gameMsg({cell, msg});
            }

        }
        else {
            const msg = 'There is no one to talk to.';
            RG.gameMsg({cell: ent.getCell(), msg});
        }
        ent.remove('Chat');
    };

};
RG.extend2(RG.System.Chat, RG.System.Base);


/* This system handles all entity movement.*/
RG.System.Movement = function(compTypes) {
    RG.System.Base.call(this, RG.SYS.MOVEMENT, compTypes);

    this.updateEntity = function(ent) {
        const x = ent.get('Movement').getX();
        const y = ent.get('Movement').getY();

        const level = ent.get('Movement').getLevel();
        const map = level.getMap();
        const cell = map.getCell(x, y);
        const prevCell = ent.getCell();

        if (cell.isFree(ent.has('Flying'))) {
            const xOld = ent.getX();
            const yOld = ent.getY();
            RG.debug(this, 'Trying to move ent from ' + xOld + ', ' + yOld);

            const propType = ent.getPropType();
            if (map.removeProp(xOld, yOld, propType, ent)) {
                map.setProp(x, y, propType, ent);
                ent.setXY(x, y);

                if (ent.isPlayer) {
                    if (ent.isPlayer()) {
                        if (cell.hasPropType('exploration')) {
                            this._processExploreElem(ent, cell);
                        }
                        this.checkMessageEmits(prevCell, cell);
                    }
                }

                ent.remove('Movement');
                return true;
            }
            else {
                const coord = xOld + ', ' + yOld;
                RG.diag('\n\nSystem.Movement list of actors:');
                RG.printObjList(level.getActors(),
                    ['getID', 'getName', 'getX', 'getY']);
                this._diagnoseRemovePropError(xOld, yOld, map, ent);
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

    /* When player enters exploration element cell, function processes this. At
    *  the moment, this gives only exp to player. */
    this._processExploreElem = (ent, cell) => {
        const level = ent.getLevel();
        const [x, y] = [cell.getX(), cell.getY()];
        const expElem = cell.getPropType('exploration')[0];
        if (level.removeElement(expElem, x, y)) {
            const givenExp = expElem.getExp();
            const expPoints = new RG.Component.ExpPoints(givenExp);
            ent.add(expPoints);

            let msg = expElem.getMsg();
            if (msg.length === 0) {
                msg = `${ent.getName()} has explored zone thoroughly.`;
                RG.gameInfo({cell, msg});
            }
        }
    };

    /* If player moved to the square, checks if any messages must
     * be emitted. */
    this.checkMessageEmits = (prevCell, newCell) => {
        if (newCell.hasStairs()) {
            const stairs = newCell.getStairs();
            const level = stairs.getTargetLevel();
            let msg = 'You see stairs here';
            if (level.getParent()) {
                const name = level.getParent();
                msg += `. They seem to be leading to ${name}`;
            }
            RG.gameMsg(msg);
        }
        else if (newCell.hasPassage()) {
            const passage = newCell.getPassage();
            const level = passage.getSrcLevel();
            const dir = RG.getCardinalDirection(level, newCell);
            const msg = `You see a passage here leading to ${dir}.`;
            RG.gameMsg(msg);
        }

        if (newCell.hasItems()) {
            const items = newCell.getProp('items');
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

        if (!prevCell.hasShop() && newCell.hasShop()) {
            RG.gameMsg('You have entered a shop.');
        }
        else if (newCell.hasShop()) {
            RG.gameMsg('You can drop items to sell here.');
        }

        const baseType = newCell.getBaseElem().getType();
        let baseMsg = '';
        switch (baseType) {
            case 'bridge': baseMsg = 'You are standing on a bridge.'; break;
            case 'grass': baseMsg = 'You see some grass.'; break;
            case 'road': baseMsg = 'You tread lightly on the road.'; break;
            case 'snow': baseMsg = 'Ground is covered with snow.'; break;
            case 'tree': baseMsg = 'There is a tree here.'; break;
            default: break;
        }
        if (baseMsg.length > 0) {
            RG.gameMsg(baseMsg);
        }
    };


    /* If removal of moved entity fails, tries to diagnose the error. */
    this._diagnoseRemovePropError = function(xTry, yTry, map, ent) {
        const propType = ent.getPropType();
        let xFound = -1;
        let yFound = -1;
        for (let x = 0; x < map.cols; x++) {
            for (let y = 0; y < map.rows; y++) {
                if (map.removeProp(x, y, propType, ent)) {
                    xFound = x;
                    yFound = y;
                }
            }
        }

        const cell = map.getCell(xTry, yTry);
        RG.diag(`Cell at ${xTry},${yTry}:`);
        RG.diag(cell);

        const entCell = ent.getCell();
        RG.diag('Cell of the entity:');
        RG.diag(entCell);

        RG.diag('System.Movement: diagnoseRemovePropError:');
        const name = ent.getName();
        if (xFound >= 0 && yFound >= 0) {
            const xy = `${xFound},${yFound} instead of ${xTry},${yTry}.`;
            const msg = `\tEnt |${name}| found from |${xy}|`;
            RG.diag(msg);
        }
        else {
            const msg = `\tNo ent |${name}| found on entire map.`;
            RG.diag(msg);
        }

        // Last resort, try find.
        RG.diag('map.Find list of objects: ');
        const objects = map.findObj(obj => {
            return obj.getName && obj.getName().match(/keeper/);
        });
        RG.diag(objects);

    };

};
RG.extend2(RG.System.Movement, RG.System.Base);


/* Stun system removes Movement/Attack components from actors to prevent. */
RG.System.Disability = function(compTypes) {
    RG.System.Base.call(this, RG.SYS.DISABILITY, compTypes);
    this.compTypesAny = true; // Triggered on at least one component

    // Messages emitted for each disability
    const _msg = {
        Paralysis: {
            Attack: 'cannot attack under paralysis',
            Movement: 'cannot move under paralysis',
            SpellCast: 'cannot cast spells under paralysis'
        },
        Stun: {
            Attack: 'is too stunned to attack',
            Movement: 'is too stunned to move',
            SpellCast: 'is too stunned to cast spells'
        }
    };

    // Callbacks to execute for each disability
    const _dispatchTable = {
        Paralysis: {
            Attack: ent => {
                ent.remove('Attack');
                _emitMsg('Paralysis', 'Attack', ent);
            },
            Movement: ent => {
                ent.remove('Movement');
                _emitMsg('Paralysis', 'Movement', ent);
            },
            SpellCast: ent => {
                ent.remove('SpellCast');
                _emitMsg('Paralysis', 'SpellCast', ent);
            }
        },
        Stun: {
            Attack: ent => {
                ent.remove('Attack');
                _emitMsg('Stun', 'Attack', ent);
            },
            Movement: ent => {
                ent.remove('Movement');
                _emitMsg('Stun', 'Movement', ent);
            },
            SpellCast: ent => {
                ent.remove('SpellCast');
                _emitMsg('Stun', 'SpellCast', ent);
            }
        }
    };

    // Processing order of the components
    const _compOrder = ['Paralysis', 'Stun'];
    const _actComp = ['Attack', 'Movement', 'SpellCast'];

    this.updateEntity = ent => {
        _compOrder.forEach(compName => {
            if (ent.has(compName)) {
                _actComp.forEach(actCompName => {
                    if (ent.has(actCompName)) {
                        _dispatchTable[compName][actCompName](ent);
                    }
                });
            }
        });
    };

    const _emitMsg = (comp, actionComp, ent) => {
        const cell = ent.getCell();
        const entName = ent.getName();
        const msg = `${entName} ${_msg[comp][actionComp]}`;
        RG.gameMsg({cell, msg});
    };

};
RG.extend2(RG.System.Disability, RG.System.Base);

/* System for spirit binding actions. Note: SpiritBind component is added to the
 * gem always. The action performer (binder) and target entity (item/actor) are
 * added to the component. */
RG.System.SpiritBind = function(compTypes) {
    RG.System.Base.call(this, RG.SYS.SPIRIT, compTypes);
    this.compTypesAny = true;

    this.updateEntity = ent => {
        if (ent.has('SpiritBind')) {
            this._doSpiritBind(ent);
        }
    };

    /* Called when spirit bind is attempted by a binder. */
    this._doSpiritBind = ent => {
        const bindComp = ent.get('SpiritBind');
        const binder = bindComp.getBinder();
        const bName = binder.getName();
        const targetCell = bindComp.getTarget();

        if (!ent.hasSpirit()) {
            const spirits = targetCell.getPropType('spirit');
            // TODO add some kind of power checks, binding should not always
            // succeed ie. weak binder (and gem) vs strong spirit
            if (spirits.length > 0) {
                const spirit = spirits[0];
                spirit.get('Action').disable(); // Trapped spirit cannot act
                const level = spirit.getLevel();
                level.removeActor(spirit);
                ent.setSpirit(spirit);

                const msg = `${spirit.getName()} was bound to gem by ${bName}`;
                RG.gameMsg({cell: targetCell, msg});
            }
            else {
                const msg = 'There are no spirits to capture there!';
                RG.gameMsg({cell: targetCell, msg});
            }
        }
        else if (targetCell.hasItems()) {
            if (binder.has('SpiritItemCrafter')) {
                const topItem = targetCell.getItems()[0];
                const iName = topItem.getName();
                if (!topItem.has('GemBound')) {
                    const gemBindComp = new RG.Component.GemBound();
                    const boundGem = binder.getInvEq().removeAndGetItem(ent);
                    gemBindComp.setGem(boundGem);
                    topItem.add(gemBindComp);

                    const gemName = ent.getName();
                    const msg = `${gemName} was bound to ${iName} by ${bName}`;
                    RG.gameMsg({cell: targetCell, msg});
                }
                else {
                    const msg = `${iName} has already a gem bound to it.`;
                    RG.gameMsg({cell: targetCell, msg});
                }
            }
            else {
                const msg = `${bName} cannot bind gems to items.`;
                RG.gameMsg({cell: targetCell, msg});
            }
        }

        ent.remove('SpiritBind');

    };
};
RG.extend2(RG.System.SpiritBind, RG.System.Base);

/* Processes entities with hunger component.*/
RG.System.Hunger = function(compTypes) {
    RG.System.Base.call(this, RG.SYS.HUNGER, compTypes);

    this.updateEntity = ent => {
        const hungerComp = ent.get('Hunger');
        const actionComp = ent.get('Action');
        hungerComp.decrEnergy(actionComp.getEnergy());
        actionComp.resetEnergy();
        if (hungerComp.isStarving()) {
            // Don't make hunger damage too obvious
            const takeDmg = RG.RAND.getUniform();
            if (ent.has('Health') && takeDmg < RG.HUNGER_PROB) {
                const dmg = new RG.Component.Damage(RG.HUNGER_DMG,
                    RG.DMG.HUNGER);
                ent.add('Damage', dmg);
                RG.gameWarn(ent.getName() + ' is starving!');
            }
        }
    };

};
RG.extend2(RG.System.Hunger, RG.System.Base);

/* Processes entities with communication component.*/
RG.System.Communication = function(compTypes) {
    RG.System.Base.call(this, RG.SYS.COMMUNICATION, compTypes);

    // Each entity here has received communication and must capture its
    // information contents
    this.updateEntity = function(ent) {
        const comComp = ent.get('Communication');
        const messages = comComp.getMsg();
        for (let i = 0; i < messages.length; i++) {
            this.processMessage(ent, messages[i]);
        }
        ent.remove('Communication');
    };

    this.processMessage = (ent, msg) => {
        if (_msgFunc.hasOwnProperty(msg.type)) {
            _msgFunc[msg.type](ent, msg);
        }
        else {
            RG.err('CommunicationSystem', 'processMessage',
                'No function for msg type |' + msg.type + '| in dtable.');
        }
    };

    this.processEnemies = (ent, msg) => {
        const enemies = msg.enemies;
        const srcName = msg.src.getName();
        for (let i = 0; i < enemies.length; i++) {
            ent.addEnemy(enemies[i]);
        }
        const msgObj = {cell: ent.getCell(),
            msg: `${srcName} seems to communicate with ${ent.getName()}`
        };
        RG.gameInfo(msgObj);
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
RG.System.TimeEffects = function(compTypes) {
    RG.System.Base.call(this, RG.SYS.TIME_EFFECTS, compTypes);
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
    const _decreaseDuration = ent => {
        const tEff = ent.get('Expiration');
        tEff.decrDuration();

        // Remove Expiration only if other components are removed
        if (!tEff.hasEffects()) {
            _expiredEffects.push([tEff.getID(), ent]);
        }
    };


    /* Applies the poison effect to the entity.*/
    const _applyPoison = ent => {
        const poison = ent.get('Poison');

        if (ent.get('Health').isDead()) {
            _expiredEffects.push([poison.getID(), ent]);
            if (ent.has('Expiration')) {
                const te = ent.get('Expiration');
                if (te.hasEffect(poison)) {
                    te.removeEffect(poison);
                }
            }
        }
        else if (RG.RAND.getUniform() < poison.getProb()) {
            const poisonDmg = poison.rollDamage();
            const dmg = new RG.Component.Damage(poisonDmg, RG.DMG.POISON);
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

/* System which processes the spell casting components. This system checks if
 * the spell casting succeeds and then handles PP reduction, but it does not
 * execute the effects of the spell.*/
RG.System.SpellCast = function(compTypes) {
    RG.System.Base.call(this, RG.SYS.SPELL_CAST, compTypes);
    this.compTypesAny = true;

    this.updateEntity = function(ent) {
        const name = ent.getName();
        const cell = ent.getCell();

        // TODO add checks for impairment, counterspells etc

        if (ent.has('SpellPower') && ent.has('SpellCast')) {
            const spellcast = ent.get('SpellCast');
            const ppComp = ent.get('SpellPower');
            const spell = spellcast.getSpell();
            if (spell.getPower() <= ppComp.getPP()) {
                const drainers = Object.values(this.entities).filter(ent => (
                    ent.has('PowerDrain')
                ));

                const args = spellcast.getArgs();
                ppComp.decrPP(spell.getPower());

                if (drainers.length === 0) {
                    spell.cast(args);
                    addSkillsExp(ent, 'SpellCasting', 1);
                }
                else if (this._checkPowerDrain(spell, args, drainers)) {
                    const msg = 'Spell was canceled by power drain.';
                    RG.gameMsg({cell: cell, msg: msg});
                }
                else {
                    // Spell drain check succeeded, can cast
                    spell.cast(args);
                    addSkillsExp(ent, 'SpellCasting', 1);
                }
            }
            else {
                const msg = `${name} has no enough power to cast spell`;
                RG.gameMsg({cell: cell, msg: msg});
            }
            ent.remove('SpellCast');
        }
    };

    this._checkPowerDrain = (spell, args, drainers) => {
        let isDrained = false;
        const casterX = args.src.getX();
        const casterY = args.src.getY();
        drainers.forEach(ent => {
            const drainX = ent.getX();
            const drainY = ent.getY();
            const dist = RG.Path.shortestDist(casterX, casterY, drainX, drainY);
            if (dist <= ent.get('PowerDrain').drainDist) {
                ent.remove('PowerDrain');
                isDrained = true;
                if (ent.has('SpellPower')) {
                    ent.get('SpellPower').addPP(spell.getPower());
                }
                return;
            }
        });
        return isDrained;

    };

};
RG.extend2(RG.System.SpellCast, RG.System.Base);

/* SpellEffect system processes the actual effects of spells, and creates damage
 * dealing components etc. An example if FrostBolt which creates SpellRay
 * component for each cell it's travelling to. */
RG.System.SpellEffect = function(compTypes) {
    RG.System.Base.call(this, RG.SYS.SPELL_EFFECT, compTypes);
    this.compTypesAny = true; // Process with any relavant Spell comp

    this.updateEntity = function(ent) {
        if (ent.has('SpellRay')) {
            this.processSpellRay(ent);
        }
        else if (ent.has('SpellCell')) {
            this.processSpellCell(ent);
        }
        else if (ent.has('SpellMissile')) {
            this.processSpellMissile(ent);
        }
        else if (ent.has('SpellArea')) {
            this.processSpellArea(ent);
        }
    };

    this.processSpellRay = ent => {
        const ray = ent.get('SpellRay');
        const args = ray.getArgs();
        const map = ent.getLevel().getMap();
        const spell = args.spell;
        const name = spell.getName();

        let x = args.from[0];
        let y = args.from[1];
        const dX = args.dir[0];
        const dY = args.dir[1];
        let rangeLeft = spell.getRange();
        let rangeCrossed = 0;

        while (rangeLeft > 0) {
            x += dX;
            y += dY;
            if (map.hasXY(x, y)) {
                const cell = map.getCell(x, y);
                if (cell.hasActors()) {
                    // Deal some damage etc
                    const actor = cell.getActors()[0];
                    if (this.rayHitsActor(actor, rangeLeft)) {
                        const dmg = new RG.Component.Damage();
                        dmg.setSource(ent);
                        dmg.setDamageType(args.damageType);
                        dmg.setDamage(args.damage);

                        // TODO add some evasion checks
                        // TODO add onHit callback for spell because
                        // not all spells cause damage
                        actor.add('Damage', dmg);
                        RG.gameMsg({cell: cell,
                            msg: `${name} hits ${actor.getName()}`});
                    }
                    else {
                        RG.gameMsg({cell: cell,
                            msg: `${name} misses ${actor.getName()}`});
                    }
                }
                if (!cell.isSpellPassable()) {
                    rangeLeft = 0;
                }
                else {
                    ++rangeCrossed;
                }
                --rangeLeft;
            }
            else {
                rangeLeft = 0;
            }
        }
        ent.remove('SpellRay');
        const animArgs = {
            dir: args.dir,
            ray: true,
            from: args.from,
            range: rangeCrossed,
            style: args.damageType
        };
        const animComp = new RG.Component.Animation(animArgs);
        ent.add('Animation', animComp);
    };

    this.rayHitsActor = function(actor, rangeLeft) {
        let evasion = actor.get('Stats').getAgility();
        if (actor.has('Skills')) {
            evasion += actor.get('Skills').get('Dodge');
        }
        evasion -= rangeLeft;
        if (evasion < 0) {evasion = 0;}

        const hitChance = (100 - evasion) / 100;
        if (hitChance > RG.RAND.getUniform()) {
            if (actor.has('RangedEvasion')) {
                return RG.RAND.getUniform() < 0.5;
            }
            return true;
        }
        else {
            addSkillsExp(actor, 'Dodge', 1);
            return false;
        }
    };

    this.processSpellCell = function(ent) {
        const spellComp = ent.get('SpellCell');
        const args = spellComp.getArgs();
        const map = ent.getLevel().getMap();
        const spell = args.spell;
        const name = spell.getName();

        const dX = args.dir[0];
        const dY = args.dir[1];
        const x = args.from[0] + dX;
        const y = args.from[1] + dY;

        if (map.hasXY(x, y)) {
            const targetCell = map.getCell(x, y);

            // Callback given for the spell
            if (args.callback) {
                args.callback(targetCell);
            }
            else if (targetCell.hasActors()) {
                const actor = targetCell.getActors()[0];

                // Spell targeting specific component
                if (args.targetComp) {
                    const setFunc = args.set;
                    const getFunc = args.get;
                    if (actor.has(args.targetComp)) {
                        const comp = actor.get(args.targetComp);
                        const actorName = actor.getName();
                        if (getFunc) {
                            comp[setFunc](comp[getFunc()] + args.value);
                        }
                        else {
                            comp[setFunc](args.value);
                        }
                        RG.gameMsg({cell: targetCell,
                            msg: `Spell ${name} is cast on ${actorName}`});
                    }
                }
                else if (args.addComp) {
                    const comp = args.addComp.comp;

                    if (comp) {
                        if (args.addComp.duration) { // Transient component
                            const dur = args.addComp.duration;
                            if (actor.has('Expiration')) {
                                actor.get('Expiration').addEffect(comp, dur);
                            }
                            else {
                                const expComp = new RG.Component.Expiration();
                                expComp.addEffect(comp, dur);
                                actor.add('Expiration', expComp);
                            }
                            actor.add(comp);
                        }
                        else { // Permanent component
                            actor.add(comp);
                        }
                    }
                    else {
                        const json = JSON.stringify(args);
                        RG.err('System.SpellEffect', 'processSpellCell',
                            `args.addComp.comp must be defined. Args: ${json}`);
                    }

                    const compType = comp.getType();
                    const msg = `${actor.getName()} seems to have ${compType}`;
                    RG.gameMsg({cell: actor.getCell(), msg});
                }
                else {
                    // Deal some damage etc
                    this._addDamageToActor(actor, args);
                    // TODO add some evasion checks
                    // TODO add onHit callback for spell because not all spells
                    // cause damage
                    RG.gameMsg({cell: targetCell,
                        msg: `${name} hits ${actor.getName()}`});
                }
            }

            const animArgs = {
                cell: true,
                coord: [[x, y]],
                style: args.damageType || ''
            };
            const animComp = new RG.Component.Animation(animArgs);
            ent.add('Animation', animComp);
        }

        ent.remove('SpellCell');
    };

    this.processSpellMissile = ent => {
        const spellComp = ent.get('SpellMissile');
        const args = spellComp.getArgs();
        const spell = args.spell;

        const iceArrow = new RG.Item.Ammo('Ice arrow');
        const mComp = new RG.Component.Missile(args.src);
        mComp.setTargetXY(args.to[0], args.to[1]);
        mComp.destroyItem = true;
        mComp.setDamage(args.damage);
        mComp.setAttack(60);
        mComp.setRange(spell.getRange());

        iceArrow.add(mComp);
        ent.remove('SpellMissile');
    };

    /* Processes area-affecting spell effects. */
    this.processSpellArea = function(ent) {
        const spellComp = ent.get('SpellArea');
        const args = spellComp.getArgs();
        const spell = args.spell;
        const range = spell.getRange();
        const [x0, y0] = [args.src.getX(), args.src.getY()];
        const map = args.src.getLevel().getMap();
        const coord = RG.Geometry.getBoxAround(x0, y0, range);

        coord.forEach(xy => {
            if (map.hasXY(xy[0], xy[1])) {
                const cell = map.getCell(xy[0], xy[1]);
                if (cell.hasActors()) {
                    const actors = cell.getActors();
                    for (let i = 0; i < actors.length; i++) {
                        this._addDamageToActor(actors[i], args);
                        const name = actors[i].getName();
                        RG.gameMsg({cell: actors[i].getCell(),
                            msg: `${name} is hit by ${spell.getName()}`});
                    }

                }
            }
        });

        // Create animation and remove Spell component
        const animArgs = {
            cell: true,
            coord: coord,
            style: args.damageType || ''
        };
        const animComp = new RG.Component.Animation(animArgs);
        ent.add('Animation', animComp);
        ent.remove('SpellArea');

    };

    this._addDamageToActor = (actor, args) => {
        const dmg = new RG.Component.Damage();
        dmg.setSource(args.src);
        dmg.setDamageType(args.damageType);
        dmg.setDamage(args.damage);
        actor.add('Damage', dmg);
    };

};
RG.extend2(RG.System.SpellEffect, RG.System.Base);

/* System which constructs the animations to play. */
RG.System.Animation = function(compTypes) {
    RG.System.Base.call(this, RG.SYS.ANIMATION, compTypes);

    this.updateEntity = function(ent) {
        const animComp = ent.get('Animation');
        const args = animComp.getArgs();
        if (args.dir) {
            this.lineAnimation(args);
        }
        else if (args.missile) {
            this.missileAnimation(args);
        }
        else if (args.cell) {
            this.cellAnimation(args);
        }
        ent.remove('Animation');
    };

    /* Construct a missile animation from Missile component. */
    this.missileAnimation = args => {
        const mComp = args.missile;
        const xEnd = args.to[0];
        const yEnd = args.to[1];
        const xy = mComp.first();
        let xCurr = xy[0];
        let yCurr = xy[1];

        // Grab correct ascii char/css style for the missile
        const missEnt = args.item;
        const char = RG.getChar(RG.TYPE_ITEM, missEnt.getName());
        const cssClass = RG.getCssClass(RG.TYPE_ITEM, missEnt.getName());

        const animation = new RG.Animation.Animation();
        while (xCurr !== xEnd || yCurr !== yEnd) {
            const frame = {};
            const key = xCurr + ',' + yCurr;
            frame[key] = {};
            frame[key].char = char;
            frame[key].className = cssClass;
            animation.addFrame(frame);

            if (mComp.next()) {
                xCurr = mComp.getX();
                yCurr = mComp.getY();
            }
            else {
                break;
            }
        }
        RG.POOL.emitEvent(RG.EVT_ANIMATION, {animation});
    };

    /* Constructs line animation (a bolt etc). */
    this.lineAnimation = args => {
        let x = args.from[0];
        let y = args.from[1];
        const dX = args.dir[0];
        const dY = args.dir[1];
        let rangeLeft = args.range;

        const animation = new RG.Animation.Animation();
        const frame = {};
        if (args.ray) {
            while (rangeLeft > 0) {
                x += dX;
                y += dY;
                frame[x + ',' + y] = {
                    char: 'X',
                    className: 'cell-ray'
                };

                const frameCopy = Object.assign({}, frame);
                animation.addFrame(frameCopy);

                --rangeLeft;
            }
        }
        // No ref to engine, thus emit an event, engine will catch it
        RG.POOL.emitEvent(RG.EVT_ANIMATION, {animation});
    };

    this.cellAnimation = args => {
        const animation = new RG.Animation.Animation();
        const frame = {};
        animation.slowDown = 10;
        args.coord.forEach(xy => {
            frame[xy[0] + ',' + xy[1]] = {
                char: '*',
                className: 'cell-animation'
            };
        });

        animation.addFrame(frame);
        RG.POOL.emitEvent(RG.EVT_ANIMATION, {animation});
    };
};
RG.extend2(RG.System.Animation, RG.System.Base);

/* System which handles the skill advancement. */
RG.System.Skills = function(compTypes) {
    RG.System.Base.call(this, RG.SYS.SKILLS, compTypes);

    this.updateEntity = function(ent) {
        const comps = ent.getList('SkillsExp');
        const entSkills = ent.get('Skills');
        const cell = ent.getCell();

        comps.forEach(comp => {
            const skillName = comp.getSkill();
            if (!entSkills.hasSkill(skillName)) {
                entSkills.addSkill(skillName);
                RG.gameSuccess({cell,
                    msg: `${ent.getName()} learns a skill ${skillName}`});
            }
            const points = comp.getPoints();

            entSkills.addPoints(skillName, points);

            const currPoints = entSkills.getPoints(skillName);
            const currLevel = entSkills.getLevel(skillName);

            // TODO make a proper function to check the skill threshold
            if (currPoints >= (10 * currLevel)) {
                const name = ent.getName();
                entSkills.setLevel(skillName, currLevel + 1);
                entSkills.resetPoints(skillName);
                RG.gameSuccess({cell,
                    msg: `${name} advances a skill ${skillName}`});

                const expPts = new RG.Component.ExpPoints(10 * currLevel);
                ent.add(expPts);
                RG.gameSuccess({cell,
                    msg: `${name} gains experience from skill ${skillName}`});
            }

            ent.remove(comp);
        });
    };

};
RG.extend2(RG.System.Skills, RG.System.Base);

module.exports = RG.System;
