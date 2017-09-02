
const ActorClass = {};
const RG = require('./rg');
RG.Component = require('./component');

ActorClass.Base = function(name) {
    this._className = name;

    this.getClassName = function() {
        return this._className;
    };
};

//-------------------------------------------------------------------------
/* Adventurer actor class and its experience level-specific features. */
//-------------------------------------------------------------------------
ActorClass.Adventurer = function(actor) {
    this._actor = actor;

    /* Called when a level is advanced by the actor. Checks for messages, and if
     * the next ability is triggered. */
    this.advanceLevel = function() {
        const newLevel = this._actor.get('Experience').getExpLevel();
        if (newLevel % 4 === 0) {
            // Get other random actor class
            // Use it to add new abilities to the actor
        }
    };

    /* Called at the creation of the actor. Gives certain set of starting items.
     */
    this.addStartingItems = () => {

    };

    this.setStartingStats = () => {

    };
};

//-------------------------------------------------------------------------
/* BladeMaster actor class and its experience level-specific features. */
//-------------------------------------------------------------------------
ActorClass.Blademaster = function(actor) {
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
            actor.add(new RG.Component.Attacker());
        },
        12: () => {
            actor.add(new RG.Component.MasterEquipper());
        },
        16: () => {
            actor.add(new RG.Component.BiDirStrike());
        },
        20: () => {
            actor.add(new RG.Component.Sharpener());
        },
        24: () => {
            actor.add(new RG.Component.Ambidexterity());
        },
        28: () => {
            actor.add(new RG.Component.CounterAttack());
        },
        32: () => {
            actor.get('Combat').setRange(2);
            actor.add(new RG.Component.LongReach());
        }
    };

    /* Called when a level is advanced by the actor. Checks for messages, and if
     * the next ability is triggered. */
    this.advanceLevel = function() {
        const newLevel = this._actor.get('Experience').getExpLevel();
        if (this._messages.hasOwnProperty(newLevel)) {
            const cell = this._actor.getCell();
            RG.gameMsg({cell, msg: this._messages[newLevel]});
        }
        if (this._advances.hasOwnProperty(newLevel)) {
            this._advances[newLevel]();
        }
    };

    /* Called at the creation of the actor. Gives certain set of starting items.
     */
    this.addStartingItems = () => {

    };

    this.setStartingStats = () => {

    };

};

//-------------------------------------------------------------------------
/* Cryomancer actor class and its experience level-specific features. */
//-------------------------------------------------------------------------
ActorClass.Cryomancer = function(actor) {
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

    this.addStartingItems = () => {

    };

    this.setStartingStats = () => {

    };

};

//-------------------------------------------------------------------------
/* Cryomancer actor class and its experience level-specific features. */
//-------------------------------------------------------------------------
ActorClass.Marksman = function(actor) {
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

    this.addStartingItems = () => {

    };

    this.setStartingStats = () => {

    };

};

//-------------------------------------------------------------------------
/* Spellsinger actor class and its experience level-specific features. */
//-------------------------------------------------------------------------
ActorClass.Spellsinger = function(actor) {
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

    this.addStartingItems = () => {
        // Starting instrument

    };

    this.setStartingStats = () => {

    };

};

RG.ACTOR_CLASSES = Object.keys(ActorClass);

module.exports = ActorClass;
