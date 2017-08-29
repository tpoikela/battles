
const RG = require('./rg.js');

RG.Object = require('./object.js');
RG.Component = require('./component.js');
RG.Brain = require('./brain.js');
RG.Brain.Player = require('./brain.player.js');
RG.Inv = require('./inv.js');

RG.Actor = {};

/* Object representing a game actor who takes actions.  */
RG.Actor.Rogue = function(name) { // {{{2
    RG.Object.Typed.call(this, RG.TYPE_ACTOR, null);
    RG.Object.Locatable.call(this);
    RG.Entity.call(this);

    this._brain = new RG.Brain.Rogue(this);
    this._brain.getMemory().addEnemyType('player');

    let _name = name;
    this._isPlayer = false;
    let _fovRange = RG.FOV_RANGE;

    this._invEq = new RG.Inv.Inventory(this);
    this._maxWeight = 10.0;

    // Components for this entity
    this.add('Action', new RG.Component.Action());
    this.add('Experience', new RG.Component.Experience());
    this.add('Combat', new RG.Component.Combat());
    this.add('Stats', new RG.Component.Stats());
    this.add('Health', new RG.Component.Health(50));

    this.setName = function(name) {_name = name;};
    this.getName = function() {return _name;};

    /* Returns true if actor is a player.*/
    this.isPlayer = function() {return this._isPlayer;};

    this.getFOVRange = function() {
        return _fovRange;
    };

    this.setFOVRange = function(range) {
        _fovRange = range;
    };

    //---------------------------------
    // Brain-relatd methods
    //---------------------------------

    this.addEnemy = function(actor) {this._brain.addEnemy(actor);};

    this.isEnemy = function(actor) {
        return this._brain.getMemory().isEnemy(actor);
    };

    this.getBrain = function() {return this._brain;};

    this.setBrain = function(brain) {
        this._brain = brain;
        this._brain.setActor(this);
    };


    //---------------------------------
    // Equipment related methods
    //---------------------------------

    this.getInvEq = function() { return this._invEq; };

    /* Returns weapon that is wielded by the actor.*/
    this.getWeapon = function() {return this._invEq.getWeapon();};

    /* Returns weapon that is wielded by the actor.*/
    this.getMissileWeapon = function() {
        return this._invEq.getMissileWeapon();
    };

    /* Returns missile equipped by the player.*/
    this.getMissile = function() {
        return this._invEq.getEquipment().getItem('missile');
    };

    this.getEquipAttack = function() {
        return this._invEq.getEquipment().getAttack();
    };

    this.getEquipDefense = function() {
        return this._invEq.getEquipment().getDefense();
    };

    this.getEquipProtection = function() {
        return this._invEq.getEquipment().getProtection();
    };

};
RG.extend2(RG.Actor.Rogue, RG.Object.Typed);
RG.extend2(RG.Actor.Rogue, RG.Object.Locatable);
RG.extend2(RG.Actor.Rogue, RG.Entity);

/* Returns carrying capacity of the actor.*/
RG.Actor.Rogue.prototype.getMaxWeight = function() {
    const statStr = this.get('Stats').getStrength();
    const eqStr = this._invEq.getEquipment().getStrength();
    return 2 * statStr + 2 * eqStr + this._maxWeight;
};

/* Marks actor as player. Cannot unset player.*/
RG.Actor.Rogue.prototype.setIsPlayer = function(isPlayer) {
    if (isPlayer) {
        this._isPlayer = isPlayer;
        this._brain = new RG.Brain.Player(this);
        this.setType('player');
        this.add('StatsMods', new RG.Component.StatsMods());
        this.add('CombatMods', new RG.Component.CombatMods());

        this._spellbook = new RG.Spell.SpellBook(this);
        RG.Spell.addAllSpells(this._spellbook);

        this.add('SpellPower', new RG.Component.SpellPower());
        this.get('SpellPower').setPP(100);
    }
    else {
        RG.err('Actor.Rogue', 'setIsPlayer',
            'Actor cannot be changed from player to mob.');
    }
};

/* Returns the next action for this actor.*/
RG.Actor.Rogue.prototype.nextAction = function(obj) {
    // Use actor brain to determine the action
    const cb = this._brain.decideNextAction(obj);
    let action = null;

    if (cb !== null) {
        const speed = this.getSpeed();
        const duration = parseInt(RG.BASE_SPEED / speed * RG.ACTION_DUR, 10);
        action = new RG.Time.RogueAction(duration, cb, {});
    }
    else {
        action = new RG.Time.RogueAction(0, function() {}, {});
    }

    if (this._brain.hasOwnProperty('energy')) {
        action.energy = this._brain.energy;
    }
    action.actor = this;
    return action;
};

/* Returns the cell where this actor is located at.*/
RG.Actor.Rogue.prototype.getCell = function() {
    const x = this.getX();
    const y = this.getY();
    return this.getLevel().getMap().getCell(x, y);
};

RG.Actor.Rogue.prototype.toJSON = function() {
    let levelID = null;
    if (this.getLevel()) {
        levelID = this.getLevel().getID();
    }
    const obj = {
        id: this.getID(),
        name: this.getName(),
        type: this.getType(),
        x: this.getX(),
        y: this.getY(),
        fovRange: this.getFOVRange(),
        levelID,
        components: {
            Combat: this.get('Combat').toJSON(),
            Experience: this.get('Experience').toJSON(),
            Health: this.get('Health').toJSON(),
            Stats: this.get('Stats').toJSON()
        },
        inventory: this.getInvEq().getInventory().toJSON(),
        equipment: this.getInvEq().getEquipment().toJSON(),
        brain: this._brain.toJSON()
    };

    /* TODO: Using this crashes the game unfortunately
    const components = {};
    const thisComps = this.getComponents();
    Object.keys(thisComps).forEach(name => {
        components[thisComps[name].getType()] = thisComps[name].toJSON();
    });
    obj.components = components;
    */

    if (this.has('Hunger')) {
        obj.components.Hunger = this.get('Hunger').toJSON();
    }
    if (this.has('Flying')) {
        obj.components.Flying = this.get('Flying').toJSON();
    }

    if (obj.type === null) {
        RG.err('Actor.Rogue', 'toJSON',
            `Type null for ${JSON.stringify(obj)}`);
    }

    if (this._spellbook) {
        obj.spellbook = this._spellbook.toJSON();
    }
    if (this.has('SpellPower')) {
        obj.components.SpellPower = this.get('SpellPower').toJSON();
    }

    return obj;
};

//---------------------------------
// Combat-related methods
//---------------------------------

RG.Actor.Rogue.prototype.getAttack = function() {
    let attack = this.get('Combat').getAttack();
    attack += this.getEquipAttack();

    if (this.has('CombatMods')) {
        attack += this.get('CombatMods').getAttack();
    }

    attack += Math.floor(this.getAccuracy() / 2);
    return attack;
};

RG.Actor.Rogue.prototype.getDefense = function() {
    let defense = this.get('Combat').getDefense();
    defense += this.getEquipDefense();
    if (this.has('CombatMods')) {
        defense += this.get('CombatMods').getDefense();
    }
    defense += Math.floor(this.getAgility() / 2);
    return defense;
};

RG.Actor.Rogue.prototype.getProtection = function() {
    let protection = this.get('Combat').getProtection();
    protection += this.getEquipProtection();
    if (this.has('CombatMods')) {
        protection += this.get('CombatMods').getProtection();
    }
    return protection;
};

RG.Actor.Rogue.prototype.getDamage = function() {
    let damage = this.get('Combat').rollDamage();
    let strength = this.getStrength();
    strength += this.getInvEq().getEquipment().getStrength();
    damage += RG.strengthToDamage(strength);
    if (this.has('CombatMods')) {damage += this.get('CombatMods').getDamage();}
    return damage;

};

//-------------------------------------------------------------
// Stats-related methods (these take eq and boosts into account
//-------------------------------------------------------------

RG.Actor.Rogue.prototype.getAccuracy = function() {
    let acc = this.get('Stats').getAccuracy();
    acc += this.getInvEq().getEquipment().getAccuracy();
    if (this.has('StatsMods')) {acc += this.get('StatsMods').getAccuracy();}
    return acc;
};

RG.Actor.Rogue.prototype.getAgility = function() {
    let agi = this.get('Stats').getAgility();
    agi += this.getInvEq().getEquipment().getAgility();
    if (this.has('StatsMods')) {agi += this.get('StatsMods').getAgility();}
    return agi;
};

RG.Actor.Rogue.prototype.getStrength = function() {
    let str = this.get('Stats').getStrength();
    str += this.getInvEq().getEquipment().getStrength();
    if (this.has('StatsMods')) {str += this.get('StatsMods').getStrength();}
    return str;
};

RG.Actor.Rogue.prototype.getWillpower = function() {
    let wil = this.get('Stats').getWillpower();
    wil += this.getInvEq().getEquipment().getWillpower();
    if (this.has('StatsMods')) {wil += this.get('StatsMods').getWillpower();}
    return wil;
};

RG.Actor.Rogue.prototype.getSpeed = function() {
    let speed = this.get('Stats').getSpeed();
    speed += this.getInvEq().getEquipment().getSpeed();
    if (this.has('StatsMods')) {speed += this.get('StatsMods').getSpeed();}
    return speed;
};

RG.Actor.Rogue.prototype.getPerception = function() {
    let per = this.get('Stats').getPerception();
    per += this.getInvEq().getEquipment().getPerception();
    if (this.has('StatsMods')) {per += this.get('StatsMods').getPerception();}
    return per;
};

/* Spirit actors. They have Ethereal component and cannot be attacked, but they
 * can be captured by SpiritGem-objects.*/
RG.Actor.Spirit = function(name) {
    RG.Actor.Rogue.call(this, name);
    this.setType('spirit');

    this.add('Ethereal', new RG.Component.Ethereal());

    const spiritBrain = new RG.Brain.Spirit(this);
    this.setBrain(spiritBrain);

};
RG.extend2(RG.Actor.Spirit, RG.Actor.Rogue);

module.exports = RG.Actor;
