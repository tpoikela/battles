
var GS = require("../getsource.js");
var RG  = GS.getSource(["RG"], "./src/rg.js");

RG.Object = GS.getSource(["RG", "Object"], "./src/object.js");
RG.Component = GS.getSource(["RG", "Component"], "./src/component.js");
RG.Brain = GS.getSource(["RG", "Brain"], "./src/brain.js");
RG.Inv = GS.getSource(["RG","Inv"], "./src/inv.js");

RG.Actor = {};

/** Object representing a game actor who takes actions.  */
RG.Actor.Rogue = function(name) { // {{{2
    RG.Object.Locatable.call(this);
    RG.Entity.call(this);
    this.setPropType("actors");

    // Member vars
    var _brain = new RG.Brain.Rogue(this);
    _brain.getMemory().addEnemyType("player");

    var _isPlayer = false;
    var _fovRange = RG.FOV_RANGE;
    var _name = name;

    var _invEq = new RG.Inv.Inventory(this);
    var _maxWeight = 10.0;

    this.add("Action", new RG.Component.Action());
    this.add("Experience", new RG.Component.Experience());
    this.add("Combat", new RG.Component.Combat());
    this.add("Stats", new RG.Component.Stats());
    this.add("Health", new RG.Component.Health(50));

    this.setName = function(name) {_name = name;};
    this.getName = function() {return _name;};

    /** Marks actor as player. Cannot unset player.*/
    this.setIsPlayer = function(isPlayer) {
        if (isPlayer) {
            _isPlayer = isPlayer;
            _brain = new RG.Brain.Player(this);
            this.setType("player");
        }
        else {
            RG.err("Actor.Rogue", "setIsPlayer",
                "Actor cannot be changed from player to mob.");
        }
    };

    /** Returns carrying capacity of the actor.*/
    this.getMaxWeight = function() {
        return 2*this.get("Stats").getStrength() + _invEq.getEquipment().getStrength() +
            _maxWeight;
    };

    this.addEnemy = function(actor) {_brain.addEnemy(actor);};
    this.isEnemy = function(actor) {return _brain.getMemory().isEnemy(actor);};

    this.getBrain = function() {return _brain;};

    this.setBrain = function(brain) {
        _brain = brain;
        _brain.setActor(this);
    };

    /** Returns true if actor is a player.*/
    this.isPlayer = function() {
        return _isPlayer;
    };

    this.getWeapon = function() {
        return _invEq.getWeapon();
    };

    /** Returns missile equipped by the player.*/
    this.getMissile = function() {
        return _invEq.getEquipment().getItem("missile");
    };

    /** Returns the next action for this actor.*/
    this.nextAction = function(obj) {
        // Use actor brain to determine the action
        var cb = _brain.decideNextAction(obj);
        var action = null;

        if (cb !== null) {
            var speed = this.get("Stats").getSpeed();
            var duration = parseInt(RG.BASE_SPEED/speed * RG.ACTION_DUR);
            action = new RG.RogueAction(duration, cb, {});
        }
        else {
            action = new RG.RogueAction(0, function(){}, {});
        }

        if (action !== null) {
            if (_brain.hasOwnProperty("energy")) action.energy = _brain.energy;
            action.actor = this;
        }
        return action;
    };

    this.getFOVRange = function() { return _fovRange;};
    this.setFOVRange = function(range) {_fovRange = range;};

    this.getInvEq = function() {
        return _invEq;
    };

    this.getEquipAttack = function() {
        return _invEq.getEquipment().getAttack();
    };

    this.getEquipDefense = function() {
        return _invEq.getEquipment().getDefense();
    };

    this.getEquipProtection = function() {
        return _invEq.getEquipment().getProtection();
    };

}
RG.extend2(RG.Actor.Rogue, RG.Object.Locatable);
RG.extend2(RG.Actor.Rogue, RG.Entity);

RG.Actor.Rogue.prototype.toJSON = function() {
    var obj = {
        name: this.getName(),
        type: this.getType(),
        components: {
            Combat: this.get("Combat").toJSON(),
            Experience: this.get("Experience").toJSON(),
            Health: this.get("Health").toJSON(),
            Stats: this.get("Stats").toJSON(),
        },
        inventory: this.getInvEq().getInventory().toJSON(),
        equipment: this.getInvEq().getEquipment().toJSON(),
    };

    if (this.has("Hunger")) {
        obj.components.Hunger = this.get("Hunger").toJSON();
    }

    return obj;
};

/** Spirit actors.*/
RG.Actor.Spirit = function(name) {
    RG.Actor.Rogue.call(this, name);
    this.setType("spirit");

    this.add("Ethereal", new RG.Component.Ethereal());

    var spiritBrain = new RG.Brain.Spirit(this);
    this.setBrain(spiritBrain);

};
RG.extend2(RG.Actor.Spirit, RG.Actor.Rogue);

if (typeof module !== "undefined" && typeof exports !== "undefined") {
    GS.exportSource(module, exports, ["RG", "Actor"], [RG, RG.Actor]);
}
else {
    GS.exportSource(undefined, undefined, ["RG", "Actor"], [RG, RG.Actor]);
}
