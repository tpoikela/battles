
const ActorClass = {};
const RG = require('./rg');
RG.Component = require('./component');
RG.Spell = require('./spell');

class ActorClassBase {

    constructor(actor, name) {
        this._actor = actor;
        actor.setActorClass(this);
        this._className = name;
    }

    getClassName() {
        return this._className;
    }

    /* Called when a level is advanced by the actor. Checks for messages, and if
     * the next ability is triggered. */
    advanceLevel() {
        const newLevel = this._actor.get('Experience').getExpLevel();
        if (this._messages.hasOwnProperty(newLevel)) {
            const cell = this._actor.getCell();
            RG.gameMsg({cell, msg: this._messages[newLevel]});
        }
        if (this._advances.hasOwnProperty(newLevel)) {
            this._advances[newLevel]();
        }
        this.incrStats();
    }

    incrStats() {
        const actor = this._actor;

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

        RG.levelUpCombatStats(actor);
    }
}

//-------------------------------------------------------------------------
/* Adventurer actor class and its experience level-specific features. */
//-------------------------------------------------------------------------
class Adventurer extends ActorClassBase {

    constructor(actor) {
        super(actor, 'Adventurer');
    }

    /* Called when a level is advanced by the actor. Checks for messages, and if
     * the next ability is triggered. */
    advanceLevel() {
        super.advanceLevel();
        const newLevel = this._actor.get('Experience').getExpLevel();
        if (newLevel % 4 === 0) {
            // Get other random actor class
            // Use it to add new abilities to the actor
        }
    }

    /* Called at the creation of the actor. Gives certain set of starting items.
     */
    getStartingItems() {
        return [
            {name: 'Ration', count: 2}
        ];
    }

    getStartingEquipment() {
        return [
            {name: 'Short sword', count: 1},
            {name: 'Leather armour', count: 1}
        ];
    }

    setStartingStats() {
        // const stats = this._actor.get('Stats');
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
                actor.get('Combat').setRange(2);
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
            8: `${_name} learns to attack enemies from distance`,
            12: `${_name} can freeze enemies on their tracks`,
            16: `${_name} can summon an ice companion now`,
            20: `${_name} can drain power from other spellcasters`,
            24: `${_name} can fire ice arrows towards enemies`,
            28: `${_name} can control their enemies now`,
            32: `${_name} has become a True Cryomancer, Bringer of Blizzard`
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

}

ActorClass.Cryomancer = Cryomancer;

//-------------------------------------------------------------------------
/* Cryomancer actor class and its experience level-specific features. */
//-------------------------------------------------------------------------
class Marksman extends ActorClassBase {

    constructor(actor) {
        super(actor, 'Marksman');
        const _name = actor.getName();

        this._messages = {
            4: `${_name} can now see and shoot further`,
            8: `${_name} deals now more damage with shots`,
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
            4: `${_name} gains new skill`,
            8: `${_name} gains new skill`,
            12: `${_name} gains new skill`,
            16: `${_name} gains new skill`,
            20: `${_name} gains new skill`,
            24: `${_name} gains new skill`,
            28: `${_name} gains new skill`,
            32: `${_name} has become a Mighty Spellsinger`
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

    getStartingItems() {
        // Starting instrument

    }

    getStartingEquipment() {

    }

    setStartingStats() {

    }

}
ActorClass.Spellsinger = Spellsinger;

RG.ACTOR_CLASSES = Object.keys(ActorClass);

module.exports = ActorClass;
