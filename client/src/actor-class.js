
const ActorClass = {};
const RG = require('./rg');
const Menu = require('./menu');
RG.Component = require('./component');
RG.Spell = require('./spell');

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
    selObj.addPre([`${actor.getName()} is now level ${level} ${className}`]);
    selObj.addPre(levelMsg);
    return selObj;
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
        const statName = RG.RAND.arrayGetRand(RG.STATS);
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
        // const name = actor.getName();
        this._messages = {
        };
        this._advances = {
            1: () => {
            },
            4: () => {
            },
            8: () => {
            },
            12: () => {
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

    /* Called at the creation of the actor. Gives certain set of starting items.
     */
    getStartingItems() {
        const parser = RG.ObjectShell.getParser();
        const mineral = parser.createRandomItem(
            item => item.type === 'mineral');
        return [
            {name: 'Ration', count: 1},
            {name: 'rope', count: 1},
            {name: mineral.getName(), count: 1}
        ];
    }

    getStartingEquipment() {
        return [
            {name: 'Ice axe', count: 1},
            {name: 'Spiked boots', count: 1}
        ];
    }

    setStartingStats() {
        // const stats = this._actor.get('Stats');
    }

    incrStats(newLevel) {
        super.incrStats(newLevel);
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

    /* Called at the creation of the actor. Gives certain set of starting items.
     */
    getStartingItems() {
        const parser = RG.ObjectShell.getParser();
        const potion = parser.createRandomItem(
            item => item.type === 'potion');
        return [
            {name: 'Ration', count: 2},
            {name: 'firemaking kit', count: 1},
            {name: potion.getName(), count: 1}
        ];
    }

    getStartingEquipment() {
        return [
            {name: 'Short sword', count: 1},
            {name: 'Leather armour', count: 1}
        ];
    }

    setStartingStats() {
        const stats = this._actor.get('Stats');
        for (let i = 0; i < 3; i++) {
            let statName = RG.RAND.arrayGetRand(RG.STATS);
            statName = statName.toLowerCase();
            stats.incrStat(statName, RG.RAND.getUniformInt(1, 3));
        }
    }

    incrStats(newLevel) {
        super.incrStats(newLevel);
        const statName = RG.RAND.arrayGetRand(RG.STATS);
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


    /* Called at the creation of the actor. Gives certain set of starting items.
     */
    getStartingItems() {
        return [
            {name: 'Ration', count: 1}
        ];
    }

    getStartingEquipment() {
        return [
            {name: 'Longsword', count: 1},
            {name: 'Chain armour', count: 1}
        ];
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

    getStartingItems() {
        return [
            {name: 'Ration', count: 1},
            {name: 'Potion of power', count: 1}
        ];
    }

    getStartingEquipment() {
        return [
            {name: 'Robe', count: 1},
            {name: 'Wooden staff', count: 1}
        ];

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

    getStartingItems() {
        return [
            {name: 'Ration', count: 1}
        ];
    }

    getStartingEquipment() {
        return [
            {name: 'Leather armour', count: 1},
            {name: 'Wooden bow', count: 1},
            {name: 'Wooden arrow', count: 15}
        ];

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
            24: `${_name} gains new skill`,
            28: `${_name} gains new skill`,
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

            },
            28: () => {

            },
            32: () => {

            }
        };
    }

    getStartingItems() {
        return [
            {name: 'Ration', count: 1},
            {name: 'Potion of eagle', count: 1}
        ];
    }

    getStartingEquipment() {
        return [
            {name: 'Iron staff', count: 1},
            {name: 'Leather armour', count: 1}
        ];
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
            12: `${_name} gains new skill`,
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

            },
            16: () => {
                const eq = this.getActor().getInvEq().getEquipment();
                eq.addSlot('spiritgem', new RG.Inv.EquipSlot(eq, 'spiritgem'));
            },
            20: () => {
                this._actor.add(new RG.Component.SpiritItemCrafter());
            },
            24: () => {
                this._actor.getBook().addSpell(new RG.Spell.SpiritForm());
            },
            28: () => {

            },
            32: () => {

            }
        };
    }

    getStartingItems() {
        return [
            {name: 'Ration', count: 1},
            {name: 'Ordinary spirit gem'},
            {name: 'Potion of spirit form'}
        ];
    }

    getStartingEquipment() {
        return [
            {name: 'Robe', count: 1},
            {name: 'Mace', count: 1}
        ];
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
    return RG.RAND.arrayGetRand(RG.ACTOR_CLASSES_NO_ADV);
}

module.exports = ActorClass;
