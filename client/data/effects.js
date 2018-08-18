/* eslint comma-dangle: 0 */

const RG = require('../src/rg');
RG.Component = require('../src/component.js');

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

const createUseItemComp = (item, target, effArgs) => {
    const useItem = new RG.Component.UseItem();
    useItem.setTarget(target);
    useItem.setItem(item);
    if (effArgs) {
        useItem.setEffect(effArgs);
    }
    const useType = RG.getItemUseType(item, target);
    useItem.setUseType(useType);
    console.log('Adding useItem now to ' + item.getTopOwner().getName());
    item.getTopOwner().add(useItem);
};

const getDuration = function(durStr) {
    const arr = RG.parseDieSpec(durStr);
    const durDie = new RG.Die(arr[0], arr[1], arr[2]);
    const duration = durDie.roll();
    return duration;
};

RG.Effects = {

    // Effects can be used in items freely.
    // Each obj arg will have {target:cell}
    // In use-function, 'this' bound to the used item
    // Item user is generally item owner: const user = this.getOwner();

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
            func: function(obj) {
                if (this.getCharges) {
                    if (this.getCharges() === 0) {
                        const name = this.getName();
                        RG.gameMsg(`${name} does not have any charges left`);
                        return false;
                    }
                }
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
            func: function(obj) {
                const effArgs = {
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
            func: function(obj) {
                const effArgs = {
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

        // Adds a value to specified component value.
        // Given use: {addToCompValue: {name: 'Health', set: 'setHP', get:
        // 'getHP', value: -1}},
        // one can be subtracted from hp of Health component.
        {
            name: 'addToCompValue',
            requires: ['name', 'set', 'get', 'value'],
            func: function(obj) {
                const effArgs = {
                    target: obj,
                    targetType: entities,
                    name: this.useArgs.name,
                    set: this.useArgs.set, get: this.useArgs.get,
                    value: this.useArgs.value,
                    effectType: 'AddToCompValue'
                };
                createUseItemComp(this, obj, effArgs);
                return true;
            },

        },

        // Cures an effect specified in use: {cure: {effect: Poison}}
        {
            name: 'cure',
            requires: ['effect'],
            func: function(obj) {
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
            func: function(obj) {
                const name = this.getTopOwner().getName();
                const msg = `${name} digs through stone with ${this.getName()}`;
                const effArgs = {
                    effectType: 'ChangeElement',
                    fromType: 'wall',
                    target: obj,
                    startMsg: msg
                };
                createUseItemComp(this, obj, effArgs);
                return true;
            },
        },

        // Healing effect restores hit points to the target
        {
            name: 'heal',
            requires: ['hp'],
            func: function(obj) {
                const actor = getTargetActor(obj);
                if (actor) {
                    const arr = RG.parseDieSpec(this.useArgs.hp);
                    const die = new RG.Die(arr[0], arr[1], arr[2]);
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
            func: function(obj) {
                const arr = RG.parseDieSpec(this.useArgs.damage);
                const dmgDie = new RG.Die(arr[0], arr[1], arr[2]);
                const effArgs = {
                    target: obj,
                    targetType: ['actors', 'items'],
                    name: 'Poison',
                    duration: this.useArgs.duration,
                    effectType: 'AddComp',
                    setters: {
                        setDamageDie: dmgDie,
                        setProb: this.useArgs.prob,
                        setSource: this.getTopOwner()
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
            func: function(obj) {
                const actor = getTargetActor(obj);
                if (actor) {
                    const stunDur = getDuration(this.useArgs.duration);
                    const stunComp = new RG.Component.Stun();
                    const expiration = new RG.Component.Expiration();
                    expiration.addEffect(stunComp, stunDur);

                    const itemOwner = this.getTopOwner();
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
            func: function(obj) {
                const effArgs = {
                    target: obj,
                    targetType: ['actors'],
                    name: 'Stats',
                    set: 'set' + this.useArgs.statName,
                    get: 'get' + this.useArgs.statName,
                    value: this.useArgs.value,
                    effectType: 'AddToCompValue'
                };
                createUseItemComp(this, obj, effArgs);
                return true;
            }
        },

        // Adds an entity into a cell
        {
            name: 'addEntity',
            requires: ['entityName'],
            optional: ['duration'],
            func: function(obj) {
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

    ],

};

module.exports = RG.Effects;
