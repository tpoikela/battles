/* This file contains factory objects for generating actors. */

import RG from './rg';
import * as Actor from './actor';
import * as Brain from './brain';
import * as ObjectShell from './objectshellparser';
import {ActorMods} from '../data/actor-mods';
import {Spell} from './spell';
import * as Component from './component';

import dbg = require('debug');
const debug = dbg('bitn:FactoryActor');

const initCombatant = (comb, obj) => {
    const {hp, att, def, prot} = obj;

    if (!RG.isNullOrUndef([hp])) {
        const hComp = comb.get('Health');
        hComp.setHP(hp);
        hComp.setMaxHP(hp);
    }

    let combatComp = null;
    if (!comb.has('Combat')) {
        combatComp = new Component.Combat();
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
export const ActorRandomizer = function() {

};

ActorRandomizer.prototype.adjustActor = function(actor) {
    const type = actor.getType();
    if (ActorMods.hasOwnProperty(type)) {
        const {stats} = ActorMods[type];
        Object.keys(stats).forEach(statName => {
            const setter = RG.formatSetterName(statName);
            const getter = RG.formatSetterName(statName);
            const statVal = actor.get('Stats')[getter];
            const newValue = statVal + stats[statName];
            actor.get('Stats')[setter](newValue);
        });
    }
};

/* Factory object for creating the actors. */
export const FactoryActor = function() {
    this._randomizer = new ActorRandomizer();

    this.dbg = function(...args) {
        if (debug.enabled) {
            debug(...args);
        }
    };

    /* Creates a player actor. */
    this.createPlayer = (name, obj) => {
        const player = new Actor.SentientActor(name);
        player.setIsPlayer(true);
        initCombatant(player, obj);
        this._randomizer.adjustActor(player);
        return player;
    };

    this.createRandomActor = function(query) {
        const parser = ObjectShell.getParser();
        return parser.createRandomActor(query);
    };

    /* Factory method for non-player actors. */
    this.createActor = function(name, obj: any = {}) {
        const actor = new Actor.SentientActor(name);
        actor.setType(name);

        const brain = obj.brain;
        initCombatant(actor, obj);
        this._randomizer.adjustActor(actor);
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
            // case 'Animal': return new Brain.BrainAnimal(actor);
            case 'Archer': return new Brain.BrainArcher(actor);
            // case 'Demon': return new Brain.BrainDemon(actor);
            case 'Flame': return new Brain.BrainFlame(actor);
            case 'GoalOriented': return new Brain.BrainGoalOriented(actor);
            // case 'Human': return new Brain.BrainHuman(actor);
            case 'NonSentient': return new Brain.BrainNonSentient(actor);
            case 'SpellCaster': return new Brain.BrainSpellCaster(actor);
            case 'Spirit': return new Brain.BrainSpirit(actor);
            // case 'Summoner': return new Brain.BrainSummoner(actor);
            // case 'Undead': return new Brain.BrainUndead(actor);
            // case 'Zombie': return new Brain.BrainZombie(actor);
            default: {
                if (Brain[brainName]) {
                    return new Brain[brainName](actor);
                }
                else if (brainName && brainName !== '') {
                    let msg = `Warning. No brain type ${brainName} found`;
                    msg += 'Using the default Brain.BrainRogue instead.';
                    console.warn(msg);
                }
                return new Brain.BrainSentient(actor);
            }
        }
    };


};

FactoryActor.prototype.createSpell = function(spellName) {
    if (Spell.hasOwnProperty(spellName)) {
        return new Spell[spellName]();
    }
    else {
        const keys = Object.keys(Spell).join('\n\t');
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
                func: actShell => (
                    func(actShell) &&
                    actShell.danger <= maxDanger
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
