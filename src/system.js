
var GS = require("../getsource.js");
var RG = GS.getSource("RG", "./src/rg.js");

//---------------------------------------------------------------------------
// ECS SYSTEMS {{{1
//---------------------------------------------------------------------------

RG.System = {};

/** Base class for all systems in ECS framework.*/
RG.System.Base = function(type, compTypes) {

    this.type = type;
    this.compTypes = compTypes; // Required comps in entity
    this.entities = {};

    this.compTypesAny = false;

    this.addEntity = function(entity) {
        this.entities[entity.getID()] = entity;
    };

    this.removeEntity = function(entity) {
        delete this.entities[entity.getID()];
    };

    /** Listens to add/removes for each component type in compTypes.*/
    this.notify = function(evtName, obj) {
        if (obj.hasOwnProperty("add")) {
            if (this.hasCompTypes(obj.entity))
                this.addEntity(obj.entity);
        }
        else if (obj.hasOwnProperty("remove")) {
            this.removeEntity(obj.entity);
        }
    };

    this.validateNotify = function(obj) {
        if (!obj.hasOwnProperty("entity")) return false;
        if (obj.hasOwnProperty("remove")) return true;
        if (obj.hasOwnProperty("add")) return true;
        return false;
    };

    /** Returns true if entity has all required component types, or if
     * compTypesAny if set, if entity has any required component.*/
    this.hasCompTypes = function(entity) {
        if (this.compTypesAny === false) {
            for (var i = 0; i < compTypes.length; i++) {
                if (! entity.has(compTypes[i])) return false;
            }
            return true;
        }
        else {
            for (var j = 0; j < compTypes.length; j++) {
                if (entity.has(compTypes[j])) return true;
            }
            return false;
        }
    };

    // Add a listener for each specified component type
    for (var i = 0; i < this.compTypes.length; i++) {
        RG.POOL.listenEvent(this.compTypes[i], this);
    }

};

/** Processes entities with attack-related components.*/
RG.System.Attack = function(type, compTypes) {
    RG.System.Base.call(this, type, compTypes);

    this.update = function() {
        for (var e in this.entities) {
            var ent = this.entities[e];

            var _att = ent;
            var _def = ent.get("Attack").getTarget();

            var attEquip  = _att.getEquipAttack();
            var defEquip  = _def.getEquipDefense();
            var attWeapon = _att.getWeapon();

            var attComp = _att.get("Combat");
            var defComp = _def.get("Combat");

            var attackPoints = attComp.getAttack();
            var defPoints    = defComp.getDefense();
            var damage       = attComp.getDamage();

            var accuracy = _att.get("Stats").getAccuracy();
            var strength = _att.get("Stats").getStrength();

            var agility = _def.get("Stats").getAgility();

            accuracy += _att.getInvEq().getEquipment().getAccuracy();
            strength += _att.getInvEq().getEquipment().getStrength();
            agility += _def.getInvEq().getEquipment().getAgility();

            // Actual hit change calculation
            var totalAttack = attackPoints + accuracy/2 + attEquip;
            var totalDefense = defPoints + agility/2 + defEquip;
            var hitChange = totalAttack / (totalAttack + totalDefense);
            if (hitChange > Math.random()) {
                var strDamage = RG.strengthToDamage(strength);
                var totalDamage = damage + strDamage;
                if (totalDamage > 0)
                    this.doDamage(_att, _def, totalDamage);
                else
                    RG.gameMsg(_att.getName() + " fails to hurt " + _def.getName());
            }
            else {
                RG.gameMsg(_att.getName() + " misses " + _def.getName());
            }
            _def.addEnemy(_att);
            ent.remove("Attack");
        }
    };

    this.doDamage = function(att, def, dmg) {
        var dmgComp = new RG.Component.Damage(dmg, "cut");
        dmgComp.setSource(att);
        def.add("Damage", dmgComp);
        RG.gameWarn(att.getName() + " hits " + def.getName());
    };
};
RG.extend2(RG.System.Attack, RG.System.Base);

// Missile has
// srcX/Y, targetX/X, path, currX/Y, shooter + all damage components, item ref
// SourceComponent, TargetComponent, LocationComponent, OwnerComponent

/** Processes all missiles launched by actors/traps/etc.*/
RG.System.Missile = function(type, compTypes) {
    RG.System.Base.call(this, type, compTypes);

    this.update = function() {
        for (var e in this.entities) {

            var ent   = this.entities[e];
            var mComp = ent.get("Missile");
            var level = mComp.getLevel();
            var map   = level.getMap();
            var mSrc = mComp.getSource();

            while (mComp.isFlying() && !mComp.inTarget() && mComp.hasRange()) {

                // Advance missile to next cell
                mComp.next();
                var currX = mComp.getX();
                var currY = mComp.getY();
                var currCell = map.getCell(currX, currY);

                // Wall was hit, stop missile
                if (currCell.hasPropType("wall")) {
                    mComp.prev();
                    var prevX = mComp.getX();
                    var prevY = mComp.getY();
                    var prevCell = map.getCell(prevX, prevY);

                    this.finishMissileFlight(ent, mComp, prevCell);
                    RG.debug(this, "Stopped missile to wall");
                    RG.gameMsg(ent.getName() + " thuds to the wall");
                }
                else if (currCell.hasProp("actors")) {
                    var actor = currCell.getProp("actors")[0];
                    // Check hit and miss
                    if (this.targetHit(actor, mComp)) {
                        this.finishMissileFlight(ent, mComp, currCell);
                        var dmg = mComp.getDamage();
                        var damageComp = new RG.Component.Damage(dmg, "thrust");
                        damageComp.setSource(mComp.getSource());
                        damageComp.setDamage(mComp.getDamage());
                        actor.add("Damage", damageComp);
                        RG.debug(this, "Hit an actor");
                        RG.gameWarn(ent.getName() + " hits " + actor.getName());
                    }
                    else if (mComp.inTarget()) {
                        this.finishMissileFlight(ent, mComp, currCell);
                        RG.debug(this, "In target cell, and missed an entity");
                        RG.gameMsg(ent.getName() + " misses the target");
                    }
                    else if (!mComp.hasRange()) {
                        this.finishMissileFlight(ent, mComp, currCell);
                        RG.debug(this, "Missile out of range. Missed entity.");
                        RG.gameMsg(ent.getName() + " misses the target");
                    }
                }
                else if (mComp.inTarget()) {
                    this.finishMissileFlight(ent, mComp, currCell);
                    RG.debug(this, "In target cell but no hits");
                    RG.gameMsg(ent.getName() + " doesn't hit anything");
                }
                else if (!mComp.hasRange()) {
                    this.finishMissileFlight(ent, mComp, currCell);
                    RG.debug(this, "Missile out of range. Hit nothing.");
                    RG.gameMsg(ent.getName() + " doesn't hit anything");
                }
            }

        }
    };

    this.finishMissileFlight = function(ent, mComp, currCell) {
        mComp.stopMissile(); // Target reached, stop missile
        ent.remove("Missile");
        var level = mComp.getLevel();
        level.addItem(ent, currCell.getX(), currCell.getY());
    };

    /** Returns true if the target was hit.*/
    this.targetHit = function(target, mComp) {
        var attack = mComp.getAttack();
        var defense = target.get("Combat").getDefense();
        var hitProp = attack / (attack + defense);
        var hitRand = Math.random();
        if (hitProp > hitRand) return true;
        return false;
    };

};
RG.extend2(RG.System.Missile, RG.System.Base);

/** Processes entities with damage component.*/
RG.System.Damage = function(type, compTypes) {
    RG.System.Base.call(this, type, compTypes);

    this.update = function() {
        for (var e in this.entities) {
            var ent = this.entities[e];
            if (ent.has("Health")) {
                var health = ent.get("Health");
                var dmgComp = ent.get("Damage");
                var totalDmg = _getDamageReduced(ent);

                // Check if any damage was done at all
                if (totalDmg <= 0) {
                    totalDmg = 0;
                    RG.gameMsg("Attack doesn't penetrate protection of " + ent.getName());
                }
                else {
                    health.decrHP(totalDmg);
                }

                if (health.isDead()) {
                    if (ent.has("Loot")) {
                        var entX = ent.getX();
                        var entY = ent.getY();
                        var entCell = ent.getLevel().getMap().getCell(entX, entY);
                        ent.get("Loot").dropLoot(entCell);
                    }

                    var src = ent.get("Damage").getSource();
                    _killActor(src, ent);
                }
                ent.remove("Damage"); // After dealing damage, remove comp
            }
        }
    };

    var _getDamageReduced = function(ent) {
        var dmgComp = ent.get("Damage");
        var dmg = dmgComp.getDamage();

        if (dmgComp.getDamageType() === "poison") {
            RG.gameDanger("Poison is gnawing inside " + ent.getName());
            return dmg;
        }

        // Take defs protection value into account
        var protEquip = ent.getEquipProtection();
        var protStats = ent.get("Combat").getProtection();
        var protTotal = protEquip + protStats;
        var totalDmg = dmg - protTotal;
        return totalDmg;
    };

    /** Removes actor from current level and emits Actor killed event.*/
    var _killActor = function(src, actor) {
        var dmgComp = actor.get("Damage");
        var level = actor.getLevel();
        if (level.removeActor(actor)) {
            if (actor.has("Experience")) {
                _giveExpToSource(src, actor);
            }
            var dmgType = dmgComp.getDamageType();
            if (dmgType === "poison")
                RG.gameDanger(actor.getName() + " dies horribly of poisoning!");


            RG.gameDanger(actor.getName() + " was killed by " + src.getName());
            RG.POOL.emitEvent(RG.EVT_ACTOR_KILLED, {actor: actor});
        }
        else {
            RG.err("System.Combat", "killActor", "Couldn't remove actor");
        }
    };

    /** When an actor is killed, gives experience to damage's source.*/
    var _giveExpToSource = function(att, def) {
        var defLevel = def.get("Experience").getExpLevel();
        var defDanger = def.get("Experience").getDanger();
        var expPoints = new RG.Component.ExpPoints(defLevel + defDanger);
        att.add("ExpPoints", expPoints);
    };

};
RG.extend2(RG.System.Damage, RG.System.Base);

/** Called for entities which gained experience points recently.*/
RG.ExpPointsSystem = function(type, compTypes) {
    RG.System.Base.call(this, type, compTypes);

    this.update = function() {
        for (var e in this.entities) {
            var ent = this.entities[e];

            var expComp = ent.get("Experience");
            var expPoints = ent.get("ExpPoints");

            var expLevel = expComp.getExpLevel();
            var exp = expComp.getExp();
            exp += expPoints.getExpPoints();
            expComp.setExp(exp);
            var nextLevel = expLevel + 1;
            var reqExp = 0;
            for (var i = 1; i <= nextLevel; i++) {
                reqExp += i * 10;
            }

            if (exp >= reqExp) { // Required exp points exceeded
                RG.levelUpActor(ent, nextLevel);
                RG.gameSuccess(ent.getName() + " advanced to level " + nextLevel);
            }
            ent.remove("ExpPoints");
        }
    };

};

RG.extend2(RG.ExpPointsSystem, RG.System.Base);

/** This system handles all entity movement.*/
RG.System.Movement = function(type, compTypes) {
    RG.System.Base.call(this, type, compTypes);

    this.update = function() {
        for (var e in this.entities) {
            var ent = this.entities[e];
            this.moveEntity(ent);
        }
    };

    this.moveEntity = function(ent) {
        var x = ent.get("Movement").getX();
        var y = ent.get("Movement").getY();
        var level = ent.get("Movement").getLevel();
        var map = level.getMap();
        var cell = map.getCell(x, y);

        if (cell.isFree()) {
            var xOld = ent.getX();
            var yOld = ent.getY();
            RG.debug(this, "Trying to move ent from " + xOld + ", " + yOld);

            var propType = ent.getPropType();
            if (map.removeProp(xOld, yOld, propType, ent)) {
                map.setProp(x, y, propType, ent);
                ent.setXY(x, y);

                if (ent.hasOwnProperty("isPlayer")) {
                    if (ent.isPlayer()) this.checkMessageEmits(cell);
                }

                ent.remove("Movement");
                return true;
            }
            else {
                var coord = xOld + ", " + yOld;
                RG.err("MovementSystem", "moveActorTo", 
                    "Couldn't remove ent |" + ent.getName() + "| @ " + coord);
            }
        }
        else {
            RG.debug(this, "Cell wasn't free at " + x + ", " + y);
        }
        ent.remove("Movement");
        return false;
    };

    // If player moved to the square, checks if any messages must be emitted.
    this.checkMessageEmits = function(cell) {
        if (cell.hasStairs()) RG.gameMsg("You see stairs here");
        if (cell.hasProp("items")) {
            var items = cell.getProp("items");
            if (items.length > 1) RG.gameMsg("There are several items here");
            else RG.gameMsg(items[0].getName() + " is on the floor");
        }
    };

};
RG.extend2(RG.System.Movement, RG.System.Base);

/** Processes entities with hunger component.*/
RG.System.Hunger = function(type, compTypes) {
    RG.System.Base.call(this, type, compTypes);

    this.update = function() {
        for (var e in this.entities) {
            var ent = this.entities[e];
            var hungerComp = ent.get("Hunger");
            var actionComp = ent.get("Action");
            hungerComp.decrEnergy(actionComp.getEnergy());
            actionComp.resetEnergy();
            if (hungerComp.isStarving()) {
                if (ent.has("Health")) ent.get("Health").decrHP(1);
                RG.gameWarn(ent.getName() + " is starving!");
            }
        }
    };

};
RG.extend2(RG.System.Hunger, RG.System.Base);

/** Processes entities with hunger component.*/
RG.System.Communication = function(type, compTypes) {
    RG.System.Base.call(this, type, compTypes);

    // Each entity here has received communication and must capture its
    // information contents
    this.update = function() {
        for (var e in this.entities) {
            var ent = this.entities[e];
            var comComp = ent.get("Communication");
            var messages = comComp.getMsg();
            for (var i = 0; i < messages.length; i++) {
                this.processMessage(ent, messages[i]);
            }
            ent.remove("Communication");
        }
    };

    this.processMessage = function(ent, msg) {
        if (_msgFunc.hasOwnProperty(msg.type)) {
            _msgFunc[msg.type](ent, msg);
        }
        else {
            RG.err("CommunicationSystem", "processMessage",
                "No function for msg type |" + msg.type + "| in dtable.");
        }
    };

    this.processEnemies = function(ent, msg) {
        var enemies = msg.enemies;
        for (var i = 0; i < enemies.length; i++) {
            ent.addEnemy(enemies[i]);
        }
    };

    // Dispatch table for different messages
    var _msgFunc = {
        Enemies: this.processEnemies,
    };

};
RG.extend2(RG.System.Communication, RG.System.Base);

/** System which handles time-based effects like poisoning etc.*/
RG.System.TimeEffects = function(type, compTypes) {
    RG.System.Base.call(this, type, compTypes);
    this.compTypesAny = true;

    // Dispatch table used to call a handler function for each component
    var _dtable = {};
    var _expiredEffects = [];

    this.update = function() {
        //console.log("Updating TimeEffects system...");
        for (var e in this.entities) {
            var ent = this.entities[e];
            //console.log("TimeEffects found entity: " + ent.getName());

            for (var i = 0; i < compTypes.length; i++) {
                if (ent.has(compTypes[i])) {
                    _dtable[compTypes[i]](ent); // Call dispatch table function
                    _decreaseDuration(ent, ent.get(compTypes[i]));
                }
            }
        }

        // Remove expired effects (mutates this.entities, so done outside for...)
        for (var j = 0; j < _expiredEffects.length; j++) {
            var compName = _expiredEffects[j][0];
            var entRem  = _expiredEffects[j][1];
            entRem.remove(compName);
        }
        _expiredEffects = [];
    };

    /** Decreases the remaining duration in the component by one.*/
    var _decreaseDuration = function(ent, comp) {
        if (comp.hasOwnProperty("getDuration")) {
            var dur = comp.getDuration();
            comp.setDuration(dur - 1);
            if (comp.getDuration() == 0) {
                _expiredEffects.push([comp.getType(), ent])
            }
        }
        else {
            RG.err("System.TimeEffects", "decreaseDuration",
                "No getDuration found from component" + comp.getType());
        }
    };


    /** Applies the poison effect to the entity.*/
    var _applyPoison = function(ent) {
        var poison = ent.get("Poison");

        if (ent.get("Health").isDead()) {
            _expiredEffects.push(["Poison", ent])
        }
        else {
            if (Math.random() < poison.getProb()) {
                var poisonDmg = poison.getDamage();
                var dmg = new RG.Component.Damage(poisonDmg, "poison");
                dmg.setSource(poison.getSource());
                ent.add("Damage", dmg);
            }
        }
    };

    _dtable.Poison = _applyPoison;

    /** Used for debug printing.*/
    this.printMatchedType = function(ent) {
        for (var i = 0; i < this.compTypes.length; i++) {
            if (ent.has(this.compTypes[i])) {
                console.log("Has component: " + this.compTypes[i]);
            }
        }
    };

};
RG.extend2(RG.System.Communication, RG.System.Base);

// }}} SYSTEMS

if (typeof module !== "undefined" && typeof exports !== "undefined") {
    GS.exportSource(module, exports, ["RG", "System"], [RG, RG.System]);
}
else {
    GS.exportSource(undefined, undefined, ["RG", "System"], [RG, RG.System]);
}
