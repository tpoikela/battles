/* This file contains factory objects for creating different types
 * of items. */

import RG from './rg';
import {Random} from './random';
import {Placer} from './placer';
import {ObjectShell} from './objectshellparser';

const RNG = Random.getRNG();

/* This object is used to randomize item properties during procedural
 * generation.*/
export const ItemRandomizer = function() {

    /* Only public function. All logic is deferred to private functions.
     * Adjusts the properties of given item, based also on maxValue.*/
    this.adjustItem = (item, val) => {
        const itemType = item.getType();
        if (_adjustFunctions.hasOwnProperty(itemType)) {
            _adjustFunctions[itemType](item, val);
        }
    };

    /* Distr. of food weights.*/
    const _foodWeights = RG.getFoodWeightDistr();

    const _adjustFoodItem = food => {
        const weight = RNG.getWeighted(_foodWeights);
        food.setWeight(weight);
    };

    const _adjustGoldCoin = (gold, nLevel) => {
        if (!RG.isNullOrUndef([nLevel])) {
            const goldWeights = RG.getGoldCoinCountDistr(nLevel);
            const count = RNG.getWeighted(goldWeights);
            gold.setCount(parseInt(count, 10));
        }
        else {
            RG.err('ItemRandomizer', '_adjustGoldCoin',
                'nLevel is not defined.');
        }
    };

    const _adjustMissile = missile => {
        const count = RNG.getUniformInt(5, 15);
        missile.setCount(count);
    };

    const _isCombatMod = val => val >= 0.0 && val <= 0.02;
    const _isStatsMod = val => val >= 0.1 && val <= 0.12;

    const _getRandStat = () => RNG.arrayGetRand(RG.STATS);

    /* Adjust damage, attack, defense and value of a weapon. */
    const _adjustWeapon = weapon => {
        const randVal = RNG.getUniform();
        if (_isCombatMod(randVal)) {
            const bonus = RNG.getUniformInt(1, 5);
            const type = RNG.getUniformInt(0, 4);
            switch (type) {
                case 0: // Fall through
                case 1: {
                    weapon.setAttack(weapon.getAttack() + bonus);
                    break;
                }
                case 2: // Fall through
                case 3: {
                    weapon.setDefense(weapon.getDefense() + bonus);
                    break;
                }
                case 4: {
                    weapon.setProtection(weapon.getProtection() + bonus);
                    break;
                }
                default: break;
            }
            RG.scaleItemValue('combat', bonus, weapon);
        }
        else if (_isStatsMod(randVal)) {
            const bonus = RNG.getUniformInt(1, 3);
            let stats = null;
            if (weapon.has('Stats')) {
                stats = weapon.get('Stats');
            }
            else {
                stats = new RG.Component.Stats();
                stats.clearValues();
                weapon.add(stats);
            }
            const randStat = _getRandStat();
            const getName = 'get' + randStat;
            const setName = 'set' + randStat;
            stats[setName](stats[getName]() + bonus);
            RG.scaleItemValue('stats', bonus, weapon);
        }
    };

    const _adjustArmour = armour => {
        _adjustWeapon(armour); // The same function works fine for this
    };

    const _runeWeights = RG.getRuneChargeDistr();
    const _adjustRune = rune => {
        const charges = RNG.getWeighted(_runeWeights);
        rune.setCharges(charges);
    };

    /* const _adjustMineral = mineral => {

    };*/

    /* LUT for functions to call on specific items.*/
    const _adjustFunctions = {
        food: _adjustFoodItem,
        goldcoin: _adjustGoldCoin,
        missile: _adjustMissile,
        weapon: _adjustWeapon,
        armour: _adjustArmour,
        ammo: _adjustMissile,
        rune: _adjustRune
        // mineral: _adjustMineral
    };

};

/* Factory object for creating items. */
export const FactoryItem = function() {
    this._itemRandomizer = new ItemRandomizer();

    /* Called for random items. Adjusts some of their attributes randomly.*/
    const _doItemSpecificAdjustments = (item, val) => {
        this._itemRandomizer.adjustItem(item, val);
    };

    this.createItem = function(query) {
        const parser = ObjectShell.getParser();
        return parser.createRandomItem(query);
    };

    /* Adds N random items to the given level. Uses parser to generate the
     * items. */
    this.addNRandItems = (level, conf) => {
        const items = this.generateItems(conf);
        const parser = ObjectShell.getParser();

        if (conf.food) {
            const food = parser.createRandomItem({
                func: item => item.type === 'food'
            });

            if (food) {
                _doItemSpecificAdjustments(food, conf.maxValue);
                items.push(food);
            }
            else {
                RG.warn('FactoryItem', 'addNRandItems',
                    'Item.Food was not created properly.');
            }
        }
        Placer.addPropsToFreeCells(level, items, RG.TYPE_ITEM);
        return items.length;
    };

    this.generateItems = function(conf) {
        const nItems = conf.itemsPerLevel || conf.nItems;
        const items = [];
        const parser = ObjectShell.getParser();
        for (let j = 0; j < nItems; j++) {
            const item = parser.createRandomItem({func: conf.func});
            if (item) {
                _doItemSpecificAdjustments(item, conf.maxValue);
                items.push(item);
            }
        }
        return items;
    };

    this.generateGold = function(conf) {
        const nGold = conf.goldPerLevel || conf.nGold;
        const parser = ObjectShell.getParser();
        const goldItems = [];
        for (let i = 0; i < nGold; i++) {
            const gold = parser.createActualObj(RG.TYPE_ITEM,
                RG.GOLD_COIN_NAME);
            _doItemSpecificAdjustments(gold, conf.nLevel);
            goldItems.push(gold);
        }
        return goldItems;
    };

    /* Adds a random number of gold coins to the level. */
    this.addRandomGold = (level, parser, conf) => {
        const goldItems = this.generateGold(conf);
        Placer.addPropsToFreeCells(level, goldItems, RG.TYPE_ITEM);
    };

    /* Returns a shop item based on the configuration. */
    this.getShopItem = (n, conf) => {
        let item = null;
        if (conf.shopFunc) {
            if (typeof conf.shopFunc[n] === 'function') {
                item = conf.parser.createRandomItem({
                    func: conf.shopFunc[n]
                });
            }
            else {
                RG.err('FactoryItem', 'createShop -> getShopItem',
                    'shopFunc must be a function.');
            }
        }
        else if (Array.isArray(conf.shopType)) {
            item = conf.parser.createRandomItem({
                func: item => item.type === conf.shopType[n]
            });
        }
        else if (typeof conf.shopType === 'string') {
            item = conf.parser.createRandomItem({
                func: item => item.type === conf.shopType
            });
        }
        else { // Fallback, if no config
            item = conf.parser.createRandomItem({
                func: item => item.value <= 50 + n * 100
            });
        }
        _doItemSpecificAdjustments(item, 50 + n * 100);
        return item;
    };

    this.addItemsToCells = function(level, parser, cells, conf) {
        if (!conf.maxValue) {
            RG.err('FactoryItem', 'addItemsToCells',
                'conf is missing maxValue');
        }
        const items = this.generateItems(conf);
        Placer.addPropsToCells(level, cells, items, RG.TYPE_ITEM);
    };
};

FactoryItem.addItemsToActor = function(actor, items) {
    const parser = ObjectShell.getParser();
    let createdItem = null;
    items.forEach(item => {
        if (typeof item === 'string') {
            createdItem = parser.createItem(item);
        }
        else if (typeof item === 'object') {
            createdItem = parser.createItem(item.name);
        }
        if (createdItem) {
            actor.getInvEq().addItem(createdItem);
        }
    });
};

/* Given actor and gear type (mithril, ruby, permaice ...), tries to
 * equip a full gear of items to the actor. */
FactoryItem.equipFullGearType = function(actor, type) {
    const parser = ObjectShell.getParser();
    const nameRegexp = new RegExp(type);
    const items = parser.filterItems(item => (
        item.type === 'armour' && nameRegexp.test(item.name)
    ));
    return FactoryItem.equipItemsToActor(actor, items);
};

/* Equips one melee weapon of given type to the actor. */
FactoryItem.equipWeaponOfType = function(actor, type) {
    const parser = ObjectShell.getParser();
    const nameRegexp = new RegExp(type);
    const items = parser.filterItems(item => (
        item.type === 'weapon' && nameRegexp.test(item.name)
    ));
    const oneWeapon = RNG.arrayGetRand(items);
    return FactoryItem.equipItemsToActor(actor, [oneWeapon]);
};

/* Tries to equip the list of given items to actor. Each item can be a
 * string or {name: 'xxx', count: 3} object. */
FactoryItem.equipItemsToActor = function(actor, items) {
    const parser = ObjectShell.getParser();
    let createdItem = null;
    let ok = true;
    items.forEach(item => {
        if (typeof item === 'string') {
            createdItem = parser.createItem(item);
        }
        else if (typeof item === 'object') {
            createdItem = parser.createItem(item.name);
            const itemCount = item.count || 1;
            createdItem.setCount(itemCount);
        }
        if (createdItem) {
            const count = createdItem.getCount();
            actor.getInvEq().addItem(createdItem);
            ok = ok && actor.getInvEq().equipNItems(createdItem, count);
        }
    });
    return ok;
};
