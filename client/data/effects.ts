/* eslint comma-dangle: 0 */

import RG from '../src/rg';
import {Dice} from '../src/dice';
import * as Component from '../src/component';

interface TargetObj {
    target: any;
}

interface Setters {
    [key: string]: any;
}

interface EffArgs {
    all?: boolean;
    duration?: number | string;
    effectType: string;
    name?: string;
    entityName?: string;
    target: TargetObj;
    targetType: string[];
    setters?: Setters;
}

const entities = ['actors', 'items', 'elements'];

const getTargetActor = (obj) => {
    if (!obj) {
        const msg = 'Possibly missing args for useItem().';
        RG.err('effects.js', 'getTargetActor',
            `Given object was null/undefined. ${msg}`);
    }
    if (obj.hasOwnProperty('target')) {
        const cell = obj.target;
        if (cell.hasActors()) {
            return cell.getProp('actors')[0];
        }
    }
    return null;
};

const getTopOwnerActor = (itemOrActor) => {
    if (itemOrActor.getTopOwner) {
        return itemOrActor.getTopOwner();
    }
    return itemOrActor;
};

const createUseItemComp = (item, target, effArgs?: EffArgs) => {
    const useItem = new Component.UseItem();
    useItem.setTarget(target);
    useItem.setItem(item);
    if (effArgs) {
        useItem.setEffect(effArgs);
    }
    const useType = RG.getEffectUseType(item, target);
    useItem.setUseType(useType);

    const owner = getTopOwnerActor(item);
    owner.add(useItem);
};

const getDuration = function(durStr: string): number {
    const arr = Dice.parseDieSpec(durStr);
    const durDie = new Dice(arr[0], arr[1], arr[2]);
    const duration = durDie.roll();
    return duration;
};

export const Effects = {

    // Effects can be used in items freely.
    // Each obj arg will have {target:cell}
    // In use-function, 'this' bound to the used item or actor with ability
    // Item user is generally item owner: const user = this.getTopOwner();

    // Each effect entry looks like the following
    // { name: "effectName",
    //   func: function(obj) {...}, // 'this' bound to the used item
    //   requires: required args inside item, these can be used inside functions
    //      using this.useArgs.argName.

    // Example:
    // Given EFFECT:
    // {name: "heal", func: function(obj) {..}, requires: "hp"}
    // The item must be specified in the following way:
    // {
    //  name: "Healing potion",
    //  use: {heal: {hp: "2d4+8"}}
    // }


    effects: [

        // Generic use function added to all items with use effects
        // Calls each use-function implementation
        {
            name: 'use',
            func(obj, idx=-1) {
                if (this.getCharges) {
                    if (this.getCharges() === 0) {
                        const name = this.getName();
                        RG.gameMsg(`${name} does not have any charges left`);
                        return false;
                    }
                }
                // This is used when one of the effects/abilities is chosen
                if (idx >= 0) {
                    return this.useFuncs[idx].call(this, obj);
                }

                // This is used for items when no specific effect chosen
                for (let i = 0; i < this.useFuncs.length; i++) {
                    if (this.useFuncs[i].call(this, obj)) {
                        return true;
                    }
                }
                return false;
            },
        },

        // Adds an effect (via Component) for specified duration
        // Example: {addComp: {name: "Ethereal", duration: "3d3"}}
        // In fact, addComp: {name: "Stun", duration: "1d6"} is identical to
        // 'stun' effect.
        //
        // To create temporary boosts, you can use the following:
        // use: {addComp:
        //    {name: 'CombatMods', setters: {setDefense: 5}, duration: '2d4'}
        // }
        {
            name: 'addComp',
            requires: ['name', 'duration'],
            optional: ['setters'],
            func(obj) {
                const effArgs: EffArgs = {
                    duration: this.useArgs.duration,
                    effectType: 'AddComp',
                    name: this.useArgs.name,
                    target: obj,
                    targetType: ['actors', 'items']
                };
                if (this.useArgs.setters) {
                    effArgs.setters = this.useArgs.setters;
                }
                createUseItemComp(this, obj, effArgs);
                return true;
            },
        },

        // Removes a component from an entity.
        // Optionally all: true can be given to remove all comps
        {
            name: 'removeComp',
            requires: ['name'],
            optional: ['all'],
            func(obj) {
                const effArgs: EffArgs = {
                    all: this.useArgs.all,
                    effectType: 'RemoveComp',
                    name: this.useArgs.name,
                    target: obj,
                    targetType: entities
                };
                createUseItemComp(this, obj, effArgs);
                return true;
            },
        },

        // Modifies specified component value.
        // Given use: {modifyCompValue: {name: 'Health', set: 'setHP', get:
        // 'getHP', value: -1}},
        // one can be subtracted from hp of Health component.
        {
            name: 'modifyCompValue',
            requires: ['name', 'set', 'get', 'value'],
            optional: ['op'],
            func(obj) {
                const effArgs = {
                    target: obj,
                    targetType: entities,
                    name: this.useArgs.name,
                    set: this.useArgs.set, get: this.useArgs.get,
                    value: this.useArgs.value,
                    effectType: 'ModifyCompValue'
                };
                createUseItemComp(this, obj, effArgs);
                return true;
            },

        },

        // Cures an effect specified in use: {cure: {effect: Poison}}
        {
            name: 'cure',
            requires: ['effect'],
            func(obj) {
                const actor = getTargetActor(obj);
                if (actor) {
                    const effectName = this.useArgs.effect.capitalize();
                    if (actor.has(effectName)) {
                        // const rmvComp = actor.get(effectName);
                        actor.remove(effectName);
                        RG.gameMsg(actor.getName()
                            + ' seems to be cured of ' + effectName);
                    }
                    else {
                        RG.gameMsg(this.getName() + ' was wasted');
                    }
                    createUseItemComp(this, actor);
                    return true;
                }
                return false;
            },

        },

        // Digger effect can be used to dig into stones and rocks
        {
            name: 'digger',
            func(obj) {
                const owner = getTopOwnerActor(this);
                const name = owner.getName();
                const msg = `${name} digs through stone with ${this.getName()}`;
                const effArgs = {
                    // name: this.useArgs.name,
                    effectType: 'ChangeElement',
                    fromType: 'wall',
                    target: obj,
                    startMsg: msg,
                    targetType: ['elements']
                };
                createUseItemComp(this, obj, effArgs);
                return true;
            },
        },

        // Healing effect restores hit points to the target
        {
            name: 'heal',
            requires: ['hp'],
            func(obj) {
                const actor = getTargetActor(obj);
                if (actor) {
                    const die = Dice.create(this.useArgs.hp);
                    const pt = die.roll();
                    if (actor.has('Health')) {
                        actor.get('Health').addHP(pt);
                        createUseItemComp(this, actor);
                        RG.gameMsg(actor.getName() +
                            ' drinks ' + this.getName());
                        return true;
                    }
                }
                else {
                    RG.gameWarn(
                        'Cannot see anyone there for using the potion.');
                }
                return false;
            },
        }, // heal

        // Poison effect which deals damage for a period of time bypassing any
        // protection
        {
            name: 'poison',
            requires: ['duration', 'damage', 'prob'],
            func(obj) {
                const arr = Dice.parseDieSpec(this.useArgs.damage);
                const dmgDie = new Dice(arr[0], arr[1], arr[2]);
                const effArgs = {
                    target: obj,
                    targetType: ['actors', 'items'],
                    name: 'Poison',
                    duration: this.useArgs.duration,
                    effectType: 'AddComp',
                    setters: {
                        setDamageDie: dmgDie,
                        setProb: this.useArgs.prob,
                        setSource: getTopOwnerActor(this)
                    }
                };
                createUseItemComp(this, obj, effArgs);
                return true;
            },
        }, // poison

        // Stun effect
        {
            name: 'stun',
            requires: ['duration'],
            func(obj) {
                const actor = getTargetActor(obj);
                if (actor) {
                    const stunDur = getDuration(this.useArgs.duration);
                    const stunComp = new Component.Stun();
                    const expiration = new Component.Expiration();
                    expiration.addEffect(stunComp, stunDur);

                    const itemOwner = getTopOwnerActor(this);
                    stunComp.setSource(itemOwner);

                    actor.add(stunComp);
                    actor.add(expiration);
                    createUseItemComp(this, actor);
                    RG.gameMsg(actor.getName() +
                        ' is stunned by ' + this.getName());
                    return true;
                }
                return false;
            }
        }, // stun

        // Modifies of the actor stats with given value
        {
            name: 'modifyStat',
            requires: ['statName', 'value'],
            func(obj) {
                const effArgs = {
                    target: obj,
                    targetType: ['actors'],
                    name: 'Stats',
                    set: 'set' + this.useArgs.statName.capitalize(),
                    get: 'get' + this.useArgs.statName.capitalize(),
                    value: this.useArgs.value,
                    effectType: 'ModifyCompValue'
                };
                createUseItemComp(this, obj, effArgs);
                return true;
            }
        },

        // Adds an entity into a cell. Use this only if entity is specified
        // using object shells in data/items.ts, data/actors.ts or
        // data/elements.ts. If you want to use your own constructor for an
        // element, then use 'addElement'
        {
            name: 'addEntity',
            requires: ['entityName'],
            optional: ['duration'],
            func(obj) {
                const effArgs = {
                    target: obj,
                    targetType: ['cell'],
                    entityName: this.useArgs.entityName,
                    effectType: 'AddEntity',
                    duration: this.useArgs.duration
                };
                createUseItemComp(this, obj, effArgs);
                return true;
            }
        },

        // Adds an element into a cell. numAllowed indicates how many of these
        // elements can be piled up into a cell
        {
            name: 'addElement',
            requires: ['elementName'],
            optional: ['duration', 'numAllowed'],
            func(obj) {
                const effArgs = {
                    target: obj,
                    targetType: ['cell'],
                    elementName: this.useArgs.elementName,
                    effectType: 'AddElement',
                    duration: this.useArgs.duration,
                    numAllowed: this.useArgs.numAllowed || 1,
                    successMsg: this.useArgs.successMsg,
                    failureMsg: this.useArgs.failureMsg,
                };
                createUseItemComp(this, obj, effArgs);
                return true;
            }
        },

        // Removes an element from a cell. Notice that there is no support for
        // temporal removal (too tricky to implement for now)
        {
            name: 'removeElement',
            requires: ['elementName'],
            optional: ['successMsg', 'failureMsg'],
            func(obj) {
                const effArgs = {
                    target: obj,
                    targetType: ['cell'],
                    elementName: this.useArgs.elementName,
                    effectType: 'RemoveElement',
                    successMsg: this.useArgs.successMsg,
                    failureMsg: this.useArgs.failureMsg,
                };
                createUseItemComp(this, obj, effArgs);
                return true;
            }
        },

    ],

};
