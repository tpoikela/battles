/* This file contains factory objects for generating actors. */

import RG from './rg';
import * as Actor from './actor';
import * as Brain from './brain';
import * as ObjectShell from './objectshellparser';
import {ActorMods} from '../data/actor-mods';
import {Spell} from './spell';
import * as Component from './component';
import {SpawnerActor} from './actor.virtual';
import {BrainSpawner} from './brain/brain.virtual';
import {IConstraint, IShell, TShellFunc} from './interfaces';

type Parser = ObjectShell.Parser;
type IQueryDB = import('./objectshellparser').IQueryDB;
type BaseActor = Actor.BaseActor;

import dbg = require('debug');
const debug = dbg('bitn:FactoryActor');

interface IStats {
    hp: number;
    att: number;
    def: number;
    prot: number;
}

const initCombatant = (comb: BaseActor, obj: IStats): void => {
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
export class ActorRandomizer {
    public adjustActor(actor: Actor.BaseActor): void {
        const type = actor.getType();
        if (ActorMods.hasOwnProperty(type)) {
            const {stats} = ActorMods[type];
            Object.keys(stats).forEach(statName => {
                const setter = RG.formatSetterName(statName);
                const getter = RG.formatGetterName(statName);
                const statVal = actor.get('Stats')[getter];
                const newValue = statVal + stats[statName];
                actor.get('Stats')[setter](newValue);
            });
        }
    }

}

/* Factory object for creating the actors. */
export class FactoryActor {
    protected _randomizer: ActorRandomizer;

    constructor() {
        this._randomizer = new ActorRandomizer();
    }

    public dbg(...args: any[]): void {
        if (debug.enabled) {
            debug(...args);
        }
    }

    /* Creates a player actor. */
    public createPlayer(name: string, obj) {
        const player = new Actor.SentientActor(name);
        player.setIsPlayer(true);
        initCombatant(player, obj);
        this._randomizer.adjustActor(player);
        return player;
    }

    public createRandomActor(query: IQueryDB): null | Actor.BaseActor {
        const parser: Parser = ObjectShell.getParser();
        return parser.createRandomActor(query);
    }

    public createActorByName(name: string): Actor.BaseActor {
        const parser: Parser = ObjectShell.getParser();
        return parser.createActor(name);
    }

    /* Factory method for non-player actors. */
    public createActor(name: string, obj: any = {}): Actor.SentientActor {
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
    }

    /* Factory method for AI brain creation.*/
    public createBrain(actor: BaseActor, brainName: string) {
        switch (brainName) {
            case 'Flame': return new Brain.BrainFlame(actor);
            case 'GoalOriented': {
                if (RG.isSentient(actor)) {
                    return new Brain.BrainGoalOriented(actor);
                }
                else {
                    RG.err('RG', 'createBrain',
                        'Can only create GoalOriented for sentient actor');
                }
            }
            case 'NonSentient': return new Brain.BrainNonSentient(actor);
            case 'SpellCaster': return new Brain.BrainSpellCaster(actor);
            case 'Spirit': return new Brain.BrainSpirit(actor);
            default: {
                if (Brain[brainName]) {
                    return new Brain[brainName](actor);
                }
                else if (brainName && brainName !== '') {
                    let msg = `Warning. No brain type ${brainName} found`;
                    msg += 'Using the default Brain.BrainSentient instead.';
                    console.warn(msg);
                }
                return new Brain.BrainSentient(actor);
            }
        }
    }

    public createSpell(spellName: string) {
        if (Spell.hasOwnProperty(spellName)) {
            return new Spell[spellName]();
        }
        else {
            const keys = Object.keys(Spell).join('\n\t');
            RG.err('FactoryActor', 'createSpell',
                `No spell ${spellName} found in Spell: \n\t${keys}`);
        }
        return null;
    }

    /* Generates N actors based on constraints and returns a list of actors. */
    public generateNActors(nActors: number, func: TShellFunc, maxDanger: number): BaseActor[] {
        if (!Number.isInteger(maxDanger) || maxDanger <= 0) {
            RG.err('Factory.Actor', 'generateNActors',
                'maxDanger (> 0) must be given. Got: ' + maxDanger);
        }
        if (maxDanger < 3) {maxDanger = 3;} // maxDanger 1/2 not very interesting

        const parser: Parser = ObjectShell.getParser();
        const actors: BaseActor[] = [];
        const defaultFunc = { // Used if no func given
            func: (actor: IShell) => actor.danger <= maxDanger
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
                // const objShell = parser.dbGet(RG.TYPE_ACTOR, actor.getName());
                const objShell = parser.dbGet({categ: RG.TYPE_ACTOR,
                                              name: actor.getName()});
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
                if ((func as any).constraint) {
                    const json = JSON.stringify((func as any).constraint);
                    RG.diag('Used constraints were: ' + json);
                }
                else if (!func) {
                    RG.diag('No func was given, so used randomWeighted');
                }
            }

        }
        return actors;
    }

    /* Creates a spawner with given constraints. */
    public createActorSpawner(
        maxDanger: number, constr: IConstraint[], placeConstr?: IConstraint[]
    ): SpawnerActor {
        const spawner = new SpawnerActor('spawner');
        const spawnBrain = spawner.getBrain() as BrainSpawner;
        let spawnConstr: IConstraint[] = [
            {op: 'lte', prop: 'danger', value: maxDanger}];
        spawnConstr = spawnConstr.concat(constr);
        spawnBrain.setConstraint(spawnConstr);
        if (placeConstr) {
            spawnBrain.setPlaceConstraint(placeConstr);
        }
        return spawner;
    }
}

