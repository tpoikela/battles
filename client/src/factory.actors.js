/* This file contains factory objects for generating actors. */

const RG = require('./rg');
const Actor = require('./actor');
const Brain = require('./brain');
const ObjectShell = require('./objectshellparser');

const debug = require('debug')('bitn:FactoryActor');

const initCombatant = (comb, obj) => {
    const {hp, att, def, prot} = obj;

    if (!RG.isNullOrUndef([hp])) {
        const hComp = comb.get('Health');
        hComp.setHP(hp);
        hComp.setMaxHP(hp);
    }

    let combatComp = null;
    if (!comb.has('Combat')) {
        combatComp = new RG.Component.Combat();
        comb.add(combatComp);
    }
    else {
        combatComp = comb.get('Combat');
    }

    if (!RG.isNullOrUndef([att])) {combatComp.setAttack(att);}
    if (!RG.isNullOrUndef([def])) {combatComp.setDefense(def);}
    if (!RG.isNullOrUndef([prot])) {combatComp.setProtection(prot);}

};

/* Object for adjusting actor properties after the generation. */
const ActorRandomizer = function() {

};

/* Factory object for creating the actors. */
const FactoryActor = function() {

    this.dbg = function(...args) {
        if (debug.enabled) {
            debug(...args);
        }
    };

    /* Creates a player actor. */
    this.createPlayer = (name, obj) => {
        const player = new Actor.Rogue(name);
        player.setIsPlayer(true);
        initCombatant(player, obj);
        return player;

    };

    this.createRandomActor = function(query) {
        const parser = ObjectShell.getParser();
        return parser.createRandomActor(query);
    };

    /* Factory method for non-player actors. */
    this.createActor = function(name, obj = {}) {
        const actor = new Actor.Rogue(name);
        actor.setType(name);

        const brain = obj.brain;
        initCombatant(actor, obj);
        if (!RG.isNullOrUndef([brain])) {
            if (typeof brain === 'object') {
                actor.setBrain(brain);
            }
            else { // If brain is string, use factory to create a new one
                const newBrain = this.createBrain(actor, brain);
                actor.setBrain(newBrain);
            }
        }
        return actor;
    };

    /* Factory method for AI brain creation.*/
    this.createBrain = (actor, brainName) => {
        switch (brainName) {
            case 'Animal': return new Brain.Animal(actor);
            case 'Archer': return new Brain.Archer(actor);
            case 'Demon': return new Brain.Demon(actor);
            case 'Flame': return new Brain.Flame(actor);
            case 'GoalOriented': return new Brain.GoalOriented(actor);
            case 'Human': return new Brain.Human(actor);
            case 'NonSentient': return new Brain.NonSentient(actor);
            case 'SpellCaster': return new Brain.SpellCaster(actor);
            case 'Spirit': return new Brain.Spirit(actor);
            case 'Summoner': return new Brain.Summoner(actor);
            case 'Undead': return new Brain.Undead(actor);
            case 'Zombie': return new Brain.Zombie(actor);
            default: {
                if (Brain[brainName]) {
                    return new Brain[brainName](actor);
                }
                else if (brainName && brainName !== '') {
                    let msg = `Warning. No brain type ${brainName} found`;
                    msg += 'Using the default Brain.Rogue instead.';
                    console.warn(msg);
                }
                return new Brain.Rogue(actor);
            }
        }
    };


};

FactoryActor.prototype.createSpell = function(spellName) {
    if (RG.Spell.hasOwnProperty(spellName)) {
        return new RG.Spell[spellName]();
    }
    else {
        const keys = Object.keys(RG.Spell).join('\n\t');
        RG.err('FactoryActor', 'createSpell',
            `No spell ${spellName} found in RG.Spell: \n\t${keys}`);
    }
    return null;
};

/* Generates N actors based on constraints and returns a list of actors. */
FactoryActor.prototype.generateNActors = function(nActors, func, maxDanger) {
    if (!Number.isInteger(maxDanger) || maxDanger <= 0) {
        RG.err('Factory.Actor', 'generateNActors',
            'maxDanger (> 0) must be given. Got: ' + maxDanger);
    }
    if (maxDanger < 3) {maxDanger = 3;} // maxDanger 1/2 not very interesting

    const parser = ObjectShell.getParser();
    const actors = [];
    const defaultFunc = { // Used if no func given
        func: actor => actor.danger <= maxDanger
    };
    for (let i = 0; i < nActors; i++) {

        // Generic randomization with danger level
        let actor = null;
        if (!func) {
            actor = parser.createRandomActorWeighted(1, maxDanger,
                defaultFunc);
        }
        else {
            actor = parser.createRandomActor({
                func: actor => (
                    func(actor) &&
                    actor.danger <= maxDanger
                )
            });
        }

        if (actor) {
            // This levels up the actor to match current danger level
            const objShell = parser.dbGet(RG.TYPE_ACTOR, actor.getName());
            const expLevel = maxDanger - objShell.danger;
            if (expLevel > 1) {
                RG.levelUpActor(actor, expLevel);
            }
            actors.push(actor);
        }
        else {
            let msg = 'Factory Could not meet constraints for actor.';
            msg += ' maxDanger: ' + maxDanger;
            RG.diag(msg);
            if (func.constraint) {
                const json = JSON.stringify(func.constraint);
                RG.diag('Used constraints were: ' + json);
            }
            else if (!func) {
                RG.diag('No func was given, so used randomWeighted');
            }
        }

    }
    return actors;
};

module.exports = {
    ActorRandomizer,
    FactoryActor
};
