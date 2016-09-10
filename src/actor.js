
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
    this._brain = new RG.Brain.Rogue(this);
    this._brain.getMemory().addEnemyType("player");

    var _name = name;
    this._isPlayer = false;
    var _fovRange = RG.FOV_RANGE;

    var _invEq = new RG.Inv.Inventory(this);
    var _maxWeight = 10.0;

    // Components for this entity
    this.add("Action", new RG.Component.Action());
    this.add("Experience", new RG.Component.Experience());
    this.add("Combat", new RG.Component.Combat());
    this.add("Stats", new RG.Component.Stats());
    this.add("Health", new RG.Component.Health(50));

    this.setName = function(name) {_name = name;};
    this.getName = function() {return _name;};


    /** Returns carrying capacity of the actor.*/
    this.getMaxWeight = function() {
        return 2*this.get("Stats").getStrength() + _invEq.getEquipment().getStrength() +
            _maxWeight;
    };

    /** Returns true if actor is a player.*/
    this.isPlayer = function() {return this._isPlayer;};

    this.getFOVRange = function() { return _fovRange;};
    this.setFOVRange = function(range) {_fovRange = range;};

    //---------------------------------
    // Brain-relatd methods
    //---------------------------------

    this.addEnemy = function(actor) {this._brain.addEnemy(actor);};
    this.isEnemy = function(actor) {return this._brain.getMemory().isEnemy(actor);};

    this.getBrain = function() {return this._brain;};

    this.setBrain = function(brain) {
        this._brain = brain;
        this._brain.setActor(this);
    };


    //---------------------------------
    // Equipment related methods
    //---------------------------------

    this.getInvEq = function() { return _invEq; };

    /** Returns weapon that is wielded by the actor.*/
    this.getWeapon = function() {return _invEq.getWeapon();};

    /** Returns missile equipped by the player.*/
    this.getMissile = function() {
        return _invEq.getEquipment().getItem("missile");
    };

    this.getEquipAttack = function() {return _invEq.getEquipment().getAttack();};

    this.getEquipDefense = function() {return _invEq.getEquipment().getDefense();};

    this.getEquipProtection = function() {return _invEq.getEquipment().getProtection();};

}
RG.extend2(RG.Actor.Rogue, RG.Object.Locatable);
RG.extend2(RG.Actor.Rogue, RG.Entity);

/** Marks actor as player. Cannot unset player.*/
RG.Actor.Rogue.prototype.setIsPlayer = function(isPlayer) {
    if (isPlayer) {
        this._isPlayer = isPlayer;
        this._brain = new RG.Brain.Player(this);
        this.setType("player");
    }
    else {
        RG.err("Actor.Rogue", "setIsPlayer",
            "Actor cannot be changed from player to mob.");
    }
};

/** Returns the next action for this actor.*/
RG.Actor.Rogue.prototype.nextAction = function(obj) {
    // Use actor brain to determine the action
    var cb = this._brain.decideNextAction(obj);
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
        if (this._brain.hasOwnProperty("energy")) action.energy = this._brain.energy;
        action.actor = this;
    }
    return action;
};

/** Returns the cell where this actor is located at.*/
RG.Actor.Rogue.prototype.getCell = function() {
    var x = this.getX();
    var y = this.getY();
    return this.getLevel().getMap().getCell(x, y);
};

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
