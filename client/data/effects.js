/* eslint comma-dangle: 0 */

const RG = require('../src/rg');
RG.Component = require('../src/component.js');

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
        {
            name: 'use',
            func: function(obj) {
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
        {
            name: 'addComp',
            requires: ['name', 'duration'],
            func: function(obj) {
                if (obj.hasOwnProperty('target')) {
                    const cell = obj.target;
                    if (cell.hasActors()) {
                        const actor = cell.getProp('actors')[0];
                        const name = this.useArgs.name.capitalize();
                        if (RG.Component.hasOwnProperty(name)) {
                            const comp = new RG.Component[name]();

                            const arr = RG.parseDieSpec(this.useArgs.duration);
                            const durDie = new RG.Die(arr[0], arr[1], arr[2]);
                            const dur = durDie.roll();

                            const expiration = new RG.Component.Expiration();
                            expiration.addEffect(comp, dur);

                            actor.add(comp.getType(), comp);
                            actor.add('Expiration', expiration);

                            RG.destroyItemIfNeeded(this);
                            return true;
                        }
                        else {
                            RG.err('useEffect', 'addComp', 'Item: ' +
                                this.getName() + ' invalid comp type ' + name);
                        }
                    }
                }
                return false;

            },
        },

        // Cures an effect specified in use: {cure: {effect: Poison}}
        {
            name: 'cure',
            requires: ['effect'],
            func: function(obj) {
                if (obj.hasOwnProperty('target')) {
                    const cell = obj.target;
                    if (cell.hasActors()) {
                        const actor = cell.getProp('actors')[0];
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
                        RG.destroyItemIfNeeded(this);
                        return true;
                    }
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
                        cell.getBaseElem().setType('floor');
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
                if (obj.hasOwnProperty('target')) {
                    const cell = obj.target;
                    if (cell.hasActors()) {
                        const target = cell.getProp('actors')[0];
                        const arr = RG.parseDieSpec(this.useArgs.hp);
                        const die = new RG.Die(arr[0], arr[1], arr[2]);
                        const pt = die.roll();
                        if (target.has('Health')) {
                            target.get('Health').addHP(pt);
                            RG.destroyItemIfNeeded(this);
                            RG.gameMsg(target.getName() +
                                ' drinks ' + this.getName());
                            return true;
                        }
                    }
                    else {
                        RG.gameWarn(
                            'Cannot see anyone there for using the potion.');
                    }
                }
                else {
                    RG.err(this.getName(), 'useItem.heal',
                        'No prop |target| given in obj.');
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
                if (obj.hasOwnProperty('target')) {
                    const cell = obj.target;
                    if (cell.hasActors()) {
                        const target = cell.getProp('actors')[0];
                        let arr = RG.parseDieSpec(this.useArgs.duration);
                        const durDie = new RG.Die(arr[0], arr[1], arr[2]);
                        const poisonDur = durDie.roll();

                        arr = RG.parseDieSpec(this.useArgs.damage);
                        const dmgDie = new RG.Die(arr[0], arr[1], arr[2]);

                        const poisonComp = new RG.Component.Poison();
                        poisonComp.setDamage(dmgDie);

                        const expiration = new RG.Component.Expiration();
                        expiration.addEffect(poisonComp, poisonDur);

                        // Need owner to assign exp correctly
                        let itemOwner = this.getOwner();
                        while (itemOwner.hasOwnProperty('getOwner')) {
                            itemOwner = itemOwner.getOwner();
                        }
                        poisonComp.setSource(itemOwner);

                        poisonComp.setProb(this.useArgs.prob);
                        target.add('Poison', poisonComp);
                        target.add('Expiration', expiration);
                        RG.destroyItemIfNeeded(this);
                        return true;
                    }
                }
                return false;
            },
        }, // poison

        // Stun effect
        {
            name: 'stun',
            requires: ['duration'],
            func: function(obj) {
                if (obj.hasOwnProperty('target')) {
                    const cell = obj.target;
                    if (cell.hasActors()) {
                        const target = cell.getProp('actors')[0];
                        const arr = RG.parseDieSpec(this.useArgs.duration);
                        const durDie = new RG.Die(arr[0], arr[1], arr[2]);
                        const stunDur = durDie.roll();
                        const stunComp = new RG.Component.Stun();
                        const expiration = new RG.Component.Expiration();
                        expiration.addEffect(stunComp, stunDur);

                        let itemOwner = this.getOwner();
                        while (itemOwner.hasOwnProperty('getOwner')) {
                            itemOwner = itemOwner.getOwner();
                        }
                        stunComp.setSource(itemOwner);

                        target.add('Stun', stunComp);
                        target.add('Expiration', expiration);
                        RG.destroyItemIfNeeded(this);
                        RG.gameMsg(target.getName() +
                            ' is stunned by ' + this.getName());
                        return true;
                    }
                }
                return false;
            },
        }, // stun


    ],

};

module.exports = RG.Effects;
