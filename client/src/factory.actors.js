/* This file contains factory objects for generating actors. */

const RG = require('./rg');

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
        comb.add('Combat', combatComp);
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

    /* Creates a player actor. */
    this.createPlayer = (name, obj) => {
        const player = new RG.Actor.Rogue(name);
        player.setIsPlayer(true);
        initCombatant(player, obj);
        return player;
    };

    /* Factory method for non-player actors. */
    this.createActor = function(name, obj = {}) {
        const actor = new RG.Actor.Rogue(name);
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
            case 'Animal': return new RG.Brain.Animal(actor);
            case 'Archer': return new RG.Brain.Archer(actor);
            case 'Demon': return new RG.Brain.Demon(actor);
            case 'Flame': return new RG.Brain.Flame(actor);
            case 'GoalOriented': return new RG.Brain.GoalOriented(actor);
            case 'Human': return new RG.Brain.Human(actor);
            case 'NonSentient': return new RG.Brain.NonSentient(actor);
            case 'SpellCaster': return new RG.Brain.SpellCaster(actor);
            case 'Spirit': return new RG.Brain.Spirit(actor);
            case 'Summoner': return new RG.Brain.Summoner(actor);
            case 'Undead': return new RG.Brain.Undead(actor);
            case 'Zombie': return new RG.Brain.Zombie(actor);
            default: {
                if (RG.Brain[brainName]) {
                    return new RG.Brain[brainName](actor);
                }
                else if (brainName && brainName !== '') {
                    let msg = `Warning. No brain type ${brainName} found`;
                    msg += 'Using the default Brain.Rogue instead.';
                    console.warn(msg);
                }
                return new RG.Brain.Rogue(actor);
            }
        }
    };

    this.createSpell = spellName => {
        if (RG.Spell.hasOwnProperty(spellName)) {
            return new RG.Spell[spellName]();
        }
        return null;
    };

};

module.exports = {
    ActorRandomizer,
    FactoryActor
};
