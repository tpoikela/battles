/* eslint comma-dangle: 0 */

const RG = require('../src/rg');
RG.Component = require('../src/component.js');

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

const getTargetCell = obj => {
    if (obj.hasOwnProperty('target')) {
        return obj.target;
    }
    return null;
};

const createUseItemComp = (item, target) => {
    const useItem = new RG.Component.UseItem();
    useItem.setTarget(target);
    useItem.setItem(item);
    const useType = RG.getItemUseType(item, target);
    useItem.setUseType(useType);
    item.getOwner().add(useItem);
};

const valueToNumber = function(value) {
    if (Number.isInteger(value)) {
        return value;
    }
    else { // Assume a die spec
        const arr = RG.parseDieSpec(value);
        const valueDie = new RG.Die(arr[0], arr[1], arr[2]);
        return valueDie.roll();
    }
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
                const actor = getTargetActor(obj);
                if (actor) {
                const name = this.useArgs.name.capitalize();
                    if (RG.Component.hasOwnProperty(name)) {
                        const compToAdd = new RG.Component[name]();

                        // Process optional setters for component values
                        if (this.useArgs.setters) {
                            const setters = this.useArgs.setters;
                            Object.keys(setters).forEach(setFunc => {
                                if (typeof compToAdd[setFunc] === 'function') {
                                    const valueToSet = setters[setFunc];
                                    const numValue = valueToNumber(valueToSet);
                                    compToAdd[setFunc](numValue);
                                }
                                else {
                                    const json = JSON.stringify(compToAdd);
                                    RG.err('useEffect', 'addComp',
                                        `No ${setFunc} in comp ${json}`);
                                }
                            });
                        }

                        const arr = RG.parseDieSpec(this.useArgs.duration);
                        const durDie = new RG.Die(arr[0], arr[1], arr[2]);
                        const dur = durDie.roll();

                        const expiration = new RG.Component.Expiration();
                        expiration.addEffect(compToAdd, dur);

                        actor.add(compToAdd);
                        actor.add(expiration);

                        createUseItemComp(this, actor);
                        return true;
                    }
                    else {
                        RG.err('useEffect', 'addComp', 'Item: ' +
                            this.getName() + ' invalid comp type ' + name);
                    }
                }
                return false;

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
                const actor = getTargetActor(obj);
                const compName = this.useArgs.name;
                if (actor) {
                    if (actor.has(compName)) {
                        const comp = actor.get(compName);
                        const currValue = comp[this.useArgs.get]();
                        const value = this.useArgs.value;
                        const numValue = valueToNumber(value);
                        comp[this.useArgs.set](currValue + numValue);
                        createUseItemComp(this, actor);
                    }
                }
                return false;

            }

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
                if (obj.hasOwnProperty('target')) {
                    const cell = obj.target;
                    if (cell.getBaseElem().getType() === 'wall') {
                        const owner = this.getOwner();
                        cell.setBaseElem(RG.ELEM.FLOOR);
                        RG.gameMsg(owner.getName() +
                            ' digs through stone with ' + this.getName());
                        return true;
                    }
                }
                else {
                    RG.err(this.getName(), 'useItem.digger',
                        'No property |target| given in obj.');
                }
                return false;
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
                const actor = getTargetActor(obj);
                if (actor) {
                    let arr = RG.parseDieSpec(this.useArgs.duration);
                    const durDie = new RG.Die(arr[0], arr[1], arr[2]);
                    const poisonDur = durDie.roll();

                    arr = RG.parseDieSpec(this.useArgs.damage);
                    const dmgDie = new RG.Die(arr[0], arr[1], arr[2]);

                    const poisonComp = new RG.Component.Poison();
                    poisonComp.setDamageDie(dmgDie);

                    const expiration = new RG.Component.Expiration();
                    expiration.addEffect(poisonComp, poisonDur);

                    // Need owner to assign exp correctly
                    let itemOwner = this.getOwner();
                    while (itemOwner.getOwner) {
                        itemOwner = itemOwner.getOwner();
                    }
                    poisonComp.setSource(itemOwner);

                    poisonComp.setProb(this.useArgs.prob);
                    actor.add('Poison', poisonComp);
                    actor.add('Expiration', expiration);
                    createUseItemComp(this, actor);
                    return true;
                }
                return false;
            },
        }, // poison

        // Stun effect
        {
            name: 'stun',
            requires: ['duration'],
            func: function(obj) {
                const actor = getTargetActor(obj);
                if (actor) {
                    const arr = RG.parseDieSpec(this.useArgs.duration);
                    const durDie = new RG.Die(arr[0], arr[1], arr[2]);
                    const stunDur = durDie.roll();
                    const stunComp = new RG.Component.Stun();
                    const expiration = new RG.Component.Expiration();
                    expiration.addEffect(stunComp, stunDur);

                    let itemOwner = this.getOwner();
                    while (itemOwner.getOwner) {
                        itemOwner = itemOwner.getOwner();
                    }
                    stunComp.setSource(itemOwner);

                    actor.add('Stun', stunComp);
                    actor.add('Expiration', expiration);
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
                const actor = getTargetActor(obj);
                if (actor) {
                    const value = this.useArgs.value;
                    const statName = this.useArgs.statName.capitalize();
                    const setFunc = 'set' + statName;
                    const getFunc = 'get' + statName;
                    const stats = actor.get('Stats');
                    const currVal = stats[getFunc]();
                    stats[setFunc](currVal + value);
                    createUseItemComp(this, actor);
                    return true;
                }
                return false;
            }
        },

        // Adds an entity into a cell
        {
            name: 'addEntity',
            requires: ['entityName'],
            func: function(obj) {
                const cell = getTargetCell(obj);
                const parser = RG.ObjectShell.getParser();
                const entity = parser.createEntity(this.useArgs.entityName);
                if (entity) {
                    const [x, y] = [cell.getX(), cell.getY()];
                    const owner = this.getOwner();
                    const level = owner.getLevel();
                    if (level.addEntity(entity, x, y)) {
                        if (this.useArgs.duration) {
                            const fadingComp = new RG.Component.Fading();
                            const {duration} = this.useArgs;
                            fadingComp.setDuration(duration);
                        }
                        createUseItemComp(this, cell);
                        return true;
                    }
                }
                else {
                    RG.err('effects.js', 'effect: addEntity',
                      'Created entity was null');
                }
                return false;
            }
        },


    ],

};

module.exports = RG.Effects;
