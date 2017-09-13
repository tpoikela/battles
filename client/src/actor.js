
const RG = require('./rg.js');

import Entity from './entity';

RG.Component = require('./component.js');
RG.Brain = require('./brain.js');
RG.Brain.Player = require('./brain.player.js');
RG.Inv = require('./inv.js');
RG.Spell = require('./spell.js');
const Mixin = require('./mixin');

RG.Actor = {};

/* Object representing a game actor who takes actions.  */
class RGActorRogue extends Mixin.Locatable(Mixin.Typed(Entity)) {
    constructor(name) { // {{{2
        super({propType: RG.TYPE_ACTOR, type: null});

        this._brain = new RG.Brain.Rogue(this);
        this._brain.getMemory().addEnemyType('player');

        this._name = name;
        this._isPlayer = false;
        this._fovRange = RG.FOV_RANGE;

        this._invEq = new RG.Inv.Inventory(this);
        this._maxWeight = 10.0;

        // Components for this entity
        this.add('Action', new RG.Component.Action());
        this.add('Experience', new RG.Component.Experience());
        this.add('Combat', new RG.Component.Combat());
        this.add('Stats', new RG.Component.Stats());
        this.add('Health', new RG.Component.Health(50));

    }

    setName(name) {this._name = name;}
    getName() {return this._name;}

    /* Returns true if actor is a player.*/
    isPlayer() {return this._isPlayer;}

    getFOVRange() {return this._fovRange;}

    setFOVRange(range) {
        this._fovRange = range;
    };

    //---------------------------------
    // Brain-relatd methods
    //---------------------------------

    addEnemy(actor) {this._brain.addEnemy(actor);}

    isEnemy(actor) {
        return this._brain.getMemory().isEnemy(actor);
    };

    getBrain() {return this._brain;};

    setBrain(brain) {
        this._brain = brain;
        this._brain.setActor(this);
    };

    //---------------------------------
    // Equipment related methods
    //---------------------------------

    getInvEq() { return this._invEq; };

    /* Returns weapon that is wielded by the actor.*/
    getWeapon() {return this._invEq.getWeapon();};

    /* Returns weapon that is wielded by the actor.*/
    getMissileWeapon() {
        return this._invEq.getMissileWeapon();
    };

    /* Returns missile equipped by the player.*/
    getMissile() {
        return this._invEq.getEquipment().getItem('missile');
    };

    getEquipAttack() {
        return this._invEq.getEquipment().getAttack();
    };

    getEquipDefense() {
        return this._invEq.getEquipment().getDefense();
    };

    getEquipProtection() {
        return this._invEq.getEquipment().getProtection();
    };

    setActorClass(classObj) {
        this._actorClass = classObj;
    };

    getActorClass() {
        return this._actorClass;
    };

    setBook(book) {
        this._spellbook = book;
    }

    getBook() {
        return this._spellbook;
    }

    /* Returns carrying capacity of the actor.*/
    getMaxWeight() {
        const statStr = this.get('Stats').getStrength();
        const eqStr = this._invEq.getEquipment().getStrength();
        return 2 * statStr + 2 * eqStr + this._maxWeight;
    }

    /* Marks actor as player. Cannot unset player.*/
    setIsPlayer(isPlayer) {
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
    }

    /* Used when controlling other actors the "real player" actor .*/
    setPlayerCtrl(isPlayer) {
        if (isPlayer) {
            this._isPlayer = true;
            this._brain = new RG.Brain.Player(this);
            if (!this.has('StatsMods')) {
                this.add('StatsMods', new RG.Component.StatsMods());
            }
            if (!this.has('CombatMods')) {
                this.add('CombatMods', new RG.Component.CombatMods());
            }
        }
        else {
            this._isPlayer = false;
            this.remove('StatsMods');
            this.remove('CombatMods');
        }
    }

    /* Returns the next action for this actor.*/
    nextAction(obj) {
        // Use actor brain to determine the action
        const cb = this._brain.decideNextAction(obj);
        let action = null;

        if (cb !== null) {
            const speed = this.getSpeed();
            const duration = parseInt(RG.BASE_SPEED / speed * RG.ACTION_DUR, 10);
            action = new RG.Time.RogueAction(duration, cb, {});
        }
        else {
            action = new RG.Time.RogueAction(0, () => {}, {});
        }

        if (this._brain.hasOwnProperty('energy')) {
            action.energy = this._brain.energy;
        }
        action.actor = this;
        return action;
    }

    /* Returns the cell where this actor is located at.*/
    getCell() {
        const x = this.getX();
        const y = this.getY();
        return this.getLevel().getMap().getCell(x, y);
    }

    toJSON() {
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

        const simpleComps = ['Hunger', 'Flying', 'Defender', 'Attacker',
            'CounterAttack', 'BiDirStrike', 'MasterEquipper', 'SpellPower'];
        simpleComps.forEach(compName => {
            if (this.has(compName)) {
                obj.components[compName] = this.get(compName).toJSON();
            }
        });

        if (obj.type === null) {
            RG.err('Actor.Rogue', 'toJSON',
                `Type null for ${JSON.stringify(obj)}`);
        }

        if (this._spellbook) {
            obj.spellbook = this._spellbook.toJSON();
        }

        return obj;
    }

    //---------------------------------
    // Combat-related methods
    //---------------------------------

    getAttack() {
        let attack = this.get('Combat').getAttack();
        attack += this.getEquipAttack();

        if (this.has('CombatMods')) {
            attack += this.get('CombatMods').getAttack();
        }

        attack += Math.floor(this.getAccuracy() / 2);
        return attack;
    }

    getDefense() {
        let defense = this.get('Combat').getDefense();
        defense += this.getEquipDefense();
        if (this.has('CombatMods')) {
            defense += this.get('CombatMods').getDefense();
        }
        defense += Math.floor(this.getAgility() / 2);
        return defense;
    }

    getProtection() {
        let protection = this.get('Combat').getProtection();
        protection += this.getEquipProtection();
        if (this.has('CombatMods')) {
            protection += this.get('CombatMods').getProtection();
        }
        return protection;
    }

    getDamage() {
        let damage = this.get('Combat').rollDamage();
        let strength = this.getStrength();
        strength += this.getInvEq().getEquipment().getStrength();
        damage += RG.strengthToDamage(strength);
        if (this.has('CombatMods')) {damage += this.get('CombatMods').getDamage();}
        return damage;

    }

    //-------------------------------------------------------------
    // Stats-related methods (these take eq and boosts into account
    //-------------------------------------------------------------

    getAccuracy() {
        let acc = this.get('Stats').getAccuracy();
        acc += this.getInvEq().getEquipment().getAccuracy();
        if (this.has('StatsMods')) {acc += this.get('StatsMods').getAccuracy();}
        return acc;
    }

    getAgility() {
        let agi = this.get('Stats').getAgility();
        agi += this.getInvEq().getEquipment().getAgility();
        if (this.has('StatsMods')) {agi += this.get('StatsMods').getAgility();}
        return agi;
    }

    getStrength() {
        let str = this.get('Stats').getStrength();
        str += this.getInvEq().getEquipment().getStrength();
        if (this.has('StatsMods')) {str += this.get('StatsMods').getStrength();}
        return str;
    }

    getWillpower() {
        let wil = this.get('Stats').getWillpower();
        wil += this.getInvEq().getEquipment().getWillpower();
        if (this.has('StatsMods')) {wil += this.get('StatsMods').getWillpower();}
        return wil;
    }

    getSpeed() {
        let speed = this.get('Stats').getSpeed();
        speed += this.getInvEq().getEquipment().getSpeed();
        if (this.has('StatsMods')) {speed += this.get('StatsMods').getSpeed();}
        return speed;
    }

    getPerception() {
        let per = this.get('Stats').getPerception();
        per += this.getInvEq().getEquipment().getPerception();
        if (this.has('StatsMods')) {per += this.get('StatsMods').getPerception();}
        return per;
    }
}

RG.Actor.Rogue = RGActorRogue;

/* Spirit actors. They have Ethereal component and cannot be attacked, but they
 * can be captured by SpiritGem-objects.*/
class RGActorSpirit extends RGActorRogue {

    constructor(name) {
        super(name);
        this.setType('spirit');
        this.add('Ethereal', new RG.Component.Ethereal());
        this.setBrain(new RG.Brain.Spirit(this));
    }

};

RG.Actor.Spirit = RGActorSpirit;

module.exports = RG.Actor;
