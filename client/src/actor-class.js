
const ActorClass = {};
const RG = require('./rg');
const Menu = require('./menu');
RG.Component = require('./component');
RG.Spell = require('./spell');
RG.Random = require('./random');
const Ability = require('./abilities');

const {Abilities} = Ability;

const RNG = RG.Random.getRNG();

/* Factory function for actor classes. */
ActorClass.create = function(name, entity) {
    if (ActorClass.hasOwnProperty(name)) {
        const actorClass = new ActorClass[name](entity);
        return actorClass;
    }
    else {
        RG.diag('Called with entity:');
        RG.diag(entity);
        RG.err('ActorClass', 'create',
            `No class ${name} in ActorClass`);
    }
    return null;
};

/* Returns the object used to render level up menu. This shows messages related
 * to the level up such as stats increases. */
ActorClass.getLevelUpObject = function(level, actorClass) {
    const selObj = new Menu.InfoOnly();
    const actor = actorClass.getActor();
    const className = actorClass.getClassName();
    const levelMsg = actorClass.getLevelUpMsg(level);
    const msg = `${actor.getName()} is now level ${level} ${className}`;
    selObj.addPre([`Congratulations! ${msg}`]);
    selObj.addPre(levelMsg);
    return selObj;
};

/* Adds a given ability for the actor. Creates also the component to store all
 * the abilities if it's not found. */
ActorClass.addAbility = function(abilName, actor) {
    let abilities = null;
    if (!actor.has('Abilities')) {
        abilities = new Abilities();
    }
    else {
        abilities = actor.get('Abilities').abilities;
    }
    if (Ability.hasOwnProperty(abilName)) {
        const abil = new Ability[abilName]();
        abilities.addAbility(abil);
    }
    else {
        RG.err('ActorClass', 'addAbility',
            `Cannot find Ability.${abilName} for new`);
    }
};

ActorClass.startingItems = {
    Alpinist: [
        {name: 'Ration', count: 1},
        {name: 'rope', count: 1},
        {func: item => item.type === 'mineral', count: 2}
    ],
    Adventurer: [
        {name: 'Ration', count: 2},
        {name: 'firemaking kit', count: 1},
        {func: item => item.type === 'potion', count: 1}
    ],
    Cryomancer: [
        {name: 'Ration', count: 1},
        {name: 'Potion of power', count: 1}
    ],
    Marksman: [
        {name: 'Ration', count: 1}
    ],
    Blademaster: [
        {name: 'Ration', count: 1}
    ],
    Spiritcrafter: [
        {name: 'Ration', count: 1},
        {name: 'Ordinary spirit gem'},
        {name: 'Potion of spirit form'}
    ],
    Spellsinger: [
        {name: 'Ration', count: 1},
        {name: 'Potion of eagle', count: 1}
    ]
};

ActorClass.equipment = {
    Alpinist: [
        {name: 'Piolet', count: 1},
        {name: 'Spiked boots', count: 1}
    ],
    Adventurer: [
        {name: 'Short sword', count: 1},
        {name: 'Leather armour', count: 1}
    ],
    Cryomancer: [
        {name: 'Robe', count: 1},
        {name: 'Wooden staff', count: 1}
    ],
    Marksman: [
        {name: 'Leather armour', count: 1},
        {name: 'Wooden bow', count: 1},
        {name: 'Wooden arrow', count: 15}
    ],
    Blademaster: [
        {name: 'Ration', count: 1}
    ],
    Spiritcrafter: [
        {name: 'Robe', count: 1},
        {name: 'Mace', count: 1}
    ],
    Spellsinger: [
        {name: 'Iron staff', count: 1},
        {name: 'Leather armour', count: 1}
    ]
};

ActorClass.getEquipment = function(name) {
    const items = ActorClass.equipment[name];
    const result = substituteConstraints(items);
    return result;
};

ActorClass.getStartingItems = function(name) {
    const items = ActorClass.startingItems[name];
    const result = substituteConstraints(items);
    return result;
};

/* Used by different in-game classes for actors. Provides basic getters and
 * progress functions to increase stats etc on level up. */
class ActorClassBase {

    constructor(actor, name) {
        this._actor = actor;
        actor.setActorClass(this);
        this._className = name;
    }

    getActor() {return this._actor;}

    getClassName() {
        return this._className;
    }

    getLevelUpMsg(level) {
        let msg = '';
        if (this._messages.hasOwnProperty(level)) {
            msg += this._messages[level];
        }
        msg += `\n${this._lastStateIncr}`;
        return msg;
    }

    /* Called when a level is advanced by the actor. Checks for messages, and if
     * the next ability is triggered. */
    advanceLevel() {
        const newLevel = this._actor.get('Experience').getExpLevel();
        if (this._messages.hasOwnProperty(newLevel)) {
            const cell = this._actor.getCell();
            if (cell) {
                RG.gameMsg({cell, msg: this._messages[newLevel]});
            }
        }
        if (this._advances.hasOwnProperty(newLevel)) {
            this._advances[newLevel]();
        }
        this.incrStats(newLevel);
    }

    incrStats(newLevel) {
        const actor = this._actor;
        this._lastStateIncr = '';

        const hComp = actor.get('Health');
        const incr = Math.ceil(actor.getStrength() / 2);
        hComp.setMaxHP(hComp.getMaxHP() + incr);
        hComp.setHP(hComp.getHP() + incr);

        if (actor.has('SpellPower')) {
            const ppIncr = Math.ceil(actor.getMagic() / 2);
            const ppComp = actor.get('SpellPower');
            ppComp.setMaxPP(ppComp.getMaxPP() + ppIncr);
            ppComp.addPP(ppIncr);
        }

        // Random stat increase
        const statName = RNG.arrayGetRand(RG.STATS);
        this._lastStateIncr = `${statName} was increased`;
        actor.get('Stats').incrStat(statName, 1);

        RG.levelUpCombatStats(actor, newLevel);
    }
}


//-------------------------------------------------------------------------
/* Alpinist actor class and its experience level-specific features. */
//-------------------------------------------------------------------------
class Alpinist extends ActorClassBase {
    constructor(actor) {
        super(actor, 'Alpinist');
        const name = actor.getName();
        this._messages = {
            4: `${name} can climb on difficult terrain now`,
            8: `${name} can jump over obstacles such as chasms now`,
            12: `${name} can now hide from enemies using terrain`
        };
        this._advances = {
            1: () => {
            },
            4: () => {
                this._actor.add(new RG.Component.Climber());
            },
            8: () => {
                this._actor.add(new RG.Component.Jumper());
            },
            12: () => {
                ActorClass.addAbility('Camouflage', this._actor);
            },
            16: () => {
            },
            20: () => {
            },
            24: () => {
            },
            28: () => {
            },
            32: () => {
            }
        };

    }

    setStartingStats() {
        const stats = this._actor.get('Stats');
        stats.incrStat('perception', 3);
        stats.incrStat('agility', 3);
        stats.incrStat('magic', -2);
    }

    incrStats(newLevel) {
        const stats = this._actor.get('Stats');
        super.incrStats(newLevel);
        if (newLevel % 3 !== 0) {
            stats.incrStat('perception', 1);
            this._lastStateIncr += '\nPerception was increased.';
        }
        if (newLevel % 3 !== 1) {
            stats.incrStat('agility', 1);
            this._lastStateIncr += '\nAgility was increased.';
        }
    }


}
ActorClass.Alpinist = Alpinist;

//-------------------------------------------------------------------------
/* Adventurer actor class and its experience level-specific features. */
//-------------------------------------------------------------------------
class Adventurer extends ActorClassBase {

    constructor(actor) {
        super(actor, 'Adventurer');
        const name = actor.getName();
        this._messages = {
            4: `Food is now more nourishing for ${name}`
        };
        this._advances = {
            1: () => {
                const book = new RG.Spell.SpellBook(this._actor);
                this._actor.setBook(book);
            },
            4: () => {
                this._actor.add(new RG.Component.NourishedOne());
            }
        };
    }

    /* Called when a level is advanced by the actor. Checks for messages, and if
     * the next ability is triggered. */
    advanceLevel() {
        super.advanceLevel();
        const newLevel = this._actor.get('Experience').getExpLevel();
        if (newLevel % 4 === 0 && !this._advances.hasOwnProperty(newLevel)) {
            const className = getRandExcludeAdventurer();
            const actorClass = new ActorClass[className](this.getActor());
            actorClass.advanceLevel();
            // Copy also the level up message from other class
            this._messages[newLevel] = actorClass._messages[newLevel];
        }
    }

    setStartingStats() {
        const stats = this._actor.get('Stats');
        for (let i = 0; i < 3; i++) {
            let statName = RNG.arrayGetRand(RG.STATS);
            statName = statName.toLowerCase();
            stats.incrStat(statName, RNG.getUniformInt(1, 3));
        }
    }

    incrStats(newLevel) {
        super.incrStats(newLevel);
        const statName = RNG.arrayGetRand(RG.STATS);
        this._lastStateIncr += `\n${statName} was increased.`;
        this._actor.get('Stats').incrStat(statName, 1);
    }
}

ActorClass.Adventurer = Adventurer;

//-------------------------------------------------------------------------
/* Blademaster actor class and its experience level-specific features. */
//-------------------------------------------------------------------------
class Blademaster extends ActorClassBase {

    constructor(actor) {
        super(actor, 'Blademaster');
        const _name = actor.getName();

        this._messages = {
            4: `${_name} knows now how to defend more skillfully`,
            8: `${_name} knows now how to hit enemies more accurately`,
            12: `${_name} knows now how to handle equipment better`,
            16: `${_name} can now strike in two directions`,
            20: `${_name} can now keep the weapons sharp`,
            24: `${_name} can now wield two blades at once`,
            28: `${_name} can now strike back immediately when attacked`,
            32: `${_name} has become a True Blademaster`
        };

        this._advances = {
            1: () => {

            },
            4: () => {
                this._actor.add(new RG.Component.Defender());
            },
            8: () => {
                this._actor.add(new RG.Component.Attacker());
            },
            12: () => {
                this._actor.add(new RG.Component.MasterEquipper());
            },
            16: () => {
                this._actor.add(new RG.Component.BiDirStrike());
            },
            20: () => {
                this._actor.add(new RG.Component.Sharpener());
                ActorClass.addAbility('Sharpener', this._actor);
            },
            24: () => {
                this._actor.add(new RG.Component.Ambidexterity());
            },
            28: () => {
                this._actor.add(new RG.Component.CounterAttack());
            },
            32: () => {
                this._actor.get('Combat').setAttackRange(2);
                this._actor.add(new RG.Component.LongReach());
            }
        };
    }

    setStartingStats() {
        const stats = this._actor.get('Stats');
        stats.incrStat('strength', 3);
        stats.incrStat('magic', -3);
    }

    getLevelUpMsg(level) {
        const msg = super.getLevelUpMsg(level);
        return msg;
    }

    incrStats(newLevel) {
        const stats = this._actor.get('Stats');
        super.incrStats(newLevel);
        if (newLevel % 3 !== 0) {
            stats.incrStat('strength', 1);
            this._lastStateIncr += '\nStrength was increased.';
        }
        if (newLevel % 3 === 0) {
            stats.incrStat('accuracy', 1);
            this._lastStateIncr += '\nAccuracy was increased.';
        }
    }
}

ActorClass.Blademaster = Blademaster;

//-------------------------------------------------------------------------
/* Cryomancer actor class and its experience level-specific features. */
//-------------------------------------------------------------------------
class Cryomancer extends ActorClassBase {

    constructor(actor) {
        super(actor, 'Cryomancer');
        const _name = actor.getName();

        this._messages = {
            4: `${_name} learns a protection spell`,
            8: `${_name} learns a spell to attack enemies from distance`,
            12: `${_name} can freeze enemies on their tracks`,
            16: `${_name} can summon an ice companion now`,
            20: `${_name} can drain power from other spellcasters`,
            24: `${_name} can fire ice arrows towards enemies`,
            28: `${_name} can control their enemies now`,
            32: `${_name} has become a True Cryomancer, Harbinger of Blizzard`
        };

        this._advances = {
            1: () => {
                // Create the spellbook
                const book = new RG.Spell.SpellBook(this._actor);
                const grasp = new RG.Spell.GraspOfWinter();
                book.addSpell(grasp);
                this._actor.setBook(book);
            },
            4: () => {
                this._actor.getBook().addSpell(new RG.Spell.IceShield());
            },
            8: () => {
                this._actor.getBook().addSpell(new RG.Spell.FrostBolt());
            },
            12: () => {
                this._actor.getBook().addSpell(new RG.Spell.IcyPrison());
            },
            16: () => {
                this._actor.getBook().addSpell(new RG.Spell.SummonIceMinion());
            },
            20: () => {
                this._actor.getBook().addSpell(new RG.Spell.PowerDrain());
            },
            24: () => {
                this._actor.getBook().addSpell(new RG.Spell.IceArrow());
            },
            28: () => {
                this._actor.getBook().addSpell(new RG.Spell.MindControl());
            },
            32: () => {
                this._actor.getBook().addSpell(new RG.Spell.Blizzard());
            }
        };
    }

    setStartingStats() {
        const stats = this._actor.get('Stats');
        stats.incrStat('strength', -2);
        stats.incrStat('magic', 3);
    }

    incrStats(newLevel) {
        const stats = this._actor.get('Stats');
        super.incrStats(newLevel);
        if (newLevel % 3 !== 0) {
            stats.incrStat('magic', 1);
            this._lastStateIncr += '\nMagic was increased.';
        }
        if (newLevel % 3 === 0) {
            stats.incrStat('willpower', 1);
            this._lastStateIncr += '\nWillpower was increased.';
        }
    }

}

ActorClass.Cryomancer = Cryomancer;

//-------------------------------------------------------------------------
/* Marksman actor class and its experience level-specific features. */
//-------------------------------------------------------------------------
class Marksman extends ActorClassBase {

    constructor(actor) {
        super(actor, 'Marksman');
        const _name = actor.getName();

        this._messages = {
            4: `${_name} can now see and shoot further`,
            8: `${_name} deals now more damage with each shot`,
            12: `${_name} can bypass enemies with ranged attacks`,
            16: `${_name} can use arrows/bolts interchangeably`,
            20: `${_name} can shoot even further`,
            24: `${_name} can evade ranged attacks`,
            28: `${_name} can shoot enemies critically`,
            32: `${_name} has become a True Marksman`
        };

        this._advances = {
            1: () => {

            },
            4: () => {
                this._actor.add(new RG.Component.EagleEye());
            },
            8: () => {
                this._actor.add(new RG.Component.StrongShot());
            },
            12: () => {
                this._actor.add(new RG.Component.ThroughShot());
            },
            16: () => {
                this._actor.add(new RG.Component.MixedShot());
            },
            20: () => {
                this._actor.add(new RG.Component.LongRangeShot());
            },
            24: () => {
                this._actor.add(new RG.Component.RangedEvasion());
            },
            28: () => {
                this._actor.add(new RG.Component.CriticalShot());
            },
            32: () => {
                this._actor.add(new RG.Component.DoubleShot());
            }
        };
    }

    setStartingStats() {
        const stats = this._actor.get('Stats');
        stats.incrStat('accuracy', 3);
        stats.incrStat('perception', 2);
        stats.incrStat('magic', -3);
    }

    incrStats(newLevel) {
        const stats = this._actor.get('Stats');
        super.incrStats(newLevel);
        if (newLevel % 3 !== 0) {
            stats.incrStat('accuracy', 1);
            this._lastStateIncr += '\nAccuracy was increased.';
        }
        if (newLevel % 3 === 0) {
            stats.incrStat('perception', 1);
            this._lastStateIncr += '\nPerception was increased.';
        }
        if (newLevel % 3 === 1) {
            stats.incrStat('agility', 1);
            this._lastStateIncr += '\nAgility was increased.';
        }
    }

}
ActorClass.Marksman = Marksman;

//-------------------------------------------------------------------------
/* Spellsinger actor class and its experience level-specific features. */
//-------------------------------------------------------------------------
class Spellsinger extends ActorClassBase {

    constructor(actor) {
        super(actor, 'Spellsinger');
        const _name = actor.getName();

        this._messages = {
            4: `${_name} can now summon animals`,
            8: `${_name} can heal wounds`,
            12: `${_name} can fly like an eagle`,
            16: `${_name} can now paralyse enemies`,
            20: `${_name} can summon lightning on enemies`,
            24: `${_name} controls powers of the sky`,
            28: `${_name} can attack enemies in multiple directions`,
            32: `${_name} has become a Mighty Spellsinger`
        };

        this._advances = {
            1: () => {
                const book = new RG.Spell.SpellBook(this._actor);
                this._actor.setBook(book);
                this._actor.getBook().addSpell(new RG.Spell.MagicArmor());
            },
            4: () => {
                this._actor.getBook().addSpell(new RG.Spell.SummonAnimal());
            },
            8: () => {
                this._actor.getBook().addSpell(new RG.Spell.Heal());
            },
            12: () => {
                this._actor.getBook().addSpell(new RG.Spell.Flying());
            },
            16: () => {
                this._actor.getBook().addSpell(new RG.Spell.Paralysis());
            },
            20: () => {
                this._actor.getBook().addSpell(new RG.Spell.LightningArrow());
            },
            24: () => {
                const airSpell = new RG.Spell.SummonAirElemental();
                this._actor.getBook().addSpell(airSpell);
            },
            28: () => {
                this._actor.getBook().addSpell(new RG.Spell.CrossBolt());
            },
            32: () => {
                this._actor.getBook().addSpell(new RG.Spell.RockStorm());
            }
        };
    }

    setStartingStats() {
        const stats = this._actor.get('Stats');
        stats.incrStat('perception', 2);
        stats.incrStat('magic', 2);
    }

    incrStats(newLevel) {
        const stats = this._actor.get('Stats');
        super.incrStats(newLevel);
        if (newLevel % 3 !== 0) {
            stats.incrStat('magic', 1);
            this._lastStateIncr += '\nMagic was increased.';
        }
        if (newLevel % 3 === 0) {
            stats.incrStat('perception', 1);
            this._lastStateIncr += '\nPerception was increased.';
        }
    }

}
ActorClass.Spellsinger = Spellsinger;

//-------------------------------------------------------------------------
/* Spiritcrafter actor class and its experience level-specific features. */
//-------------------------------------------------------------------------
class Spiritcrafter extends ActorClassBase {

    constructor(actor) {
        super(actor, 'Spiritcrafter');
        const _name = actor.getName();

        this._messages = {
            4: `${_name} can now equip 2 spirit gems`,
            8: `${_name} learns to project small amounts of energy`,
            12: `${_name} learns to create protective forcefields`,
            16: `${_name} can now equip 3 spirit gems`,
            20: `${_name} can now bind spirit gems to items`,
            24: `${_name} can take a spirit form now`,
            28: `${_name} gains new skill`,
            32: `${_name} has become a Mighty Spiritcrafter`
        };

        this._advances = {
            1: () => {
                const book = new RG.Spell.SpellBook(this._actor);
                this._actor.setBook(book);
            },
            4: () => {
                const eq = this.getActor().getInvEq().getEquipment();
                eq.addSlot('spiritgem', new RG.Inv.EquipSlot(eq, 'spiritgem'));
            },
            8: () => {
                this._actor.getBook().addSpell(new RG.Spell.EnergyArrow());
            },
            12: () => {
                this._actor.getBook().addSpell(new RG.Spell.ForceField());
            },
            16: () => {
                const eq = this.getActor().getInvEq().getEquipment();
                eq.addSlot('spiritgem', new RG.Inv.EquipSlot(eq, 'spiritgem'));
                // Gems weight only 50% of their weight
            },
            20: () => {
                this._actor.add(new RG.Component.SpiritItemCrafter());
            },
            24: () => {
                this._actor.getBook().addSpell(new RG.Spell.SpiritForm());
            },
            28: () => {
                this._actor.getBook().addSpell(new RG.Spell.EnergyStorm());
            },
            32: () => {
                const eq = this.getActor().getInvEq().getEquipment();
                eq.addSlot('spiritgem', new RG.Inv.EquipSlot(eq, 'spiritgem'));
                this._actor.getBook().addSpell(new RG.Spell.RingOfEnergy());
                // TODO turn gems into power/health
                // Gems weight only 10% of their weight
            }
        };
    }

    setStartingStats() {
        const stats = this._actor.get('Stats');
        stats.incrStat('willpower', 4);
        stats.incrStat('magic', 2);
    }

    incrStats(newLevel) {
        const stats = this._actor.get('Stats');
        super.incrStats(newLevel);
        if (newLevel % 3 !== 0) {
            stats.incrStat('willpower', 1);
            this._lastStateIncr += '\nWillpower was increased.';
        }
        if (newLevel % 3 === 0) {
            stats.incrStat('magic', 1);
            this._lastStateIncr += '\nMagic was increased.';
        }
    }

}
ActorClass.Spiritcrafter = Spiritcrafter;

RG.ACTOR_CLASSES = ['Cryomancer', 'Blademaster', 'Marksman', 'Spiritcrafter',
    'Adventurer', 'Alpinist', 'Spellsinger'];

RG.ACTOR_CLASSES_NO_ADV = RG.ACTOR_CLASSES.filter(ac => ac !== 'Adventurer');

function getRandExcludeAdventurer() {
    return RNG.arrayGetRand(RG.ACTOR_CLASSES_NO_ADV);
}

function substituteConstraints(items) {
    const parser = RG.ObjectShell.getParser();
    const result = [];
    items.forEach(item => {
        if (typeof item === 'function') {
            const createdItem = parser.createRandomItem(item);
            result.push({name: createdItem.getName(), count: 1});
        }
        else if (item.func) {
            const createdItem = parser.createRandomItem(item.func);
            if (item.count) {
                result.push({name: createdItem.getName(), count: item.count});
            }
            else {
                result.push({name: createdItem.getName(), count: 1});
            }
        }
        else {
            result.push(item);
        }
    });
    return result;
}

module.exports = ActorClass;
