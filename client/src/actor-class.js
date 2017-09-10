
const ActorClass = {};
const RG = require('./rg');
RG.Component = require('./component');

class ActorClassBase {

    constructor(name) {
        this._className = name;
    }

    getClassName() {
        return this._className;
    }
}

//-------------------------------------------------------------------------
/* Adventurer actor class and its experience level-specific features. */
//-------------------------------------------------------------------------
class Adventurer extends ActorClassBase {

    constructor(actor) {
        super('Adventurer');
        this._actor = actor;
    }

    /* Called when a level is advanced by the actor. Checks for messages, and if
     * the next ability is triggered. */
    advanceLevel() {
        const newLevel = this._actor.get('Experience').getExpLevel();
        if (newLevel % 4 === 0) {
            // Get other random actor class
            // Use it to add new abilities to the actor
        }
    }

    /* Called at the creation of the actor. Gives certain set of starting items.
     */
    addStartingItems() {

    }

    setStartingStats() {

    }
}

ActorClass.Adventurer = Adventurer;

//-------------------------------------------------------------------------
/* BladeMaster actor class and its experience level-specific features. */
//-------------------------------------------------------------------------
class Blademaster extends ActorClassBase {

    constructor(actor) {
        super('BladeMaster');
        this._actor = actor;
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
    }

    /* Called at the creation of the actor. Gives certain set of starting items.
     */
    addStartingItems() {

    }

    setStartingStats() {

    }

}

ActorClass.Blademaster = Blademaster;

//-------------------------------------------------------------------------
/* Cryomancer actor class and its experience level-specific features. */
//-------------------------------------------------------------------------
class Cryomancer extends ActorClassBase {

    constructor(actor) {
        super('Cryomancer');
        this._actor = actor;
        const _name = actor.getName();

        this._messages = {
            4: `${_name} gains new skill`,
            8: `${_name} gains new skill`,
            12: `${_name} gains new skill`,
            16: `${_name} gains new skill`,
            20: `${_name} gains new skill`,
            24: `${_name} gains new skill`,
            28: `${_name} gains new skill`,
            32: `${_name} has become a True Cryomancer`
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

    addStartingItems() {

    }

    setStartingStats() {

    }

}

ActorClass.Cryomancer = Cryomancer;

//-------------------------------------------------------------------------
/* Cryomancer actor class and its experience level-specific features. */
//-------------------------------------------------------------------------
class Marksman extends ActorClassBase {

    constructor(actor) {
        super('Marksman');
        this._actor = actor;
        const _name = actor.getName();

        this._messages = {
            4: `${_name} gains new skill`,
            8: `${_name} gains new skill`,
            12: `${_name} gains new skill`,
            16: `${_name} gains new skill`,
            20: `${_name} gains new skill`,
            24: `${_name} gains new skill`,
            28: `${_name} gains new skill`,
            32: `${_name} has become a True Marksman`
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

    addStartingItems() {

    }

    setStartingStats() {

    }

}
ActorClass.Marksman = Marksman;

//-------------------------------------------------------------------------
/* Spellsinger actor class and its experience level-specific features. */
//-------------------------------------------------------------------------
class Spellsinger extends ActorClassBase {

    constructor(actor) {
        super('Spellsinger');
        this._actor = actor;
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

    addStartingItems() {
        // Starting instrument

    }

    setStartingStats() {

    }

}
ActorClass.Spellsinger = Spellsinger;

RG.ACTOR_CLASSES = Object.keys(ActorClass);

module.exports = ActorClass;
