/* This file contains factory objects for creating different types
 * of items. */

import RG from './rg';
import {Random} from './random';
import {Placer} from './placer';
import {ObjectShell, IQueryDB, Parser} from './objectshellparser';
import {Dice} from './dice';
import * as Component from './component';
import {ItemConstr, IShell, ItemConf, GoldConf, ShopConf} from './interfaces';

const RNG = Random.getRNG();

type TAdjustFunc = (item: ItemBase, val: number) => void;
type ItemBase = import('./item').ItemBase;
type BaseActor = import('./actor').BaseActor;
type SentientActor = import('./actor').SentientActor;
type Level = import('./level').Level;
type Cell = import('./map.cell').Cell;

/* This object is used to randomize item properties during procedural
 * generation.*/
export class ItemRandomizer {

    protected _foodWeights: {[key: string]: number};
    protected _runeWeights: {[key: string]: number};
    protected _adjustFunctions: {[key: string]: TAdjustFunc};

    constructor() {
        this._foodWeights = RG.getFoodWeightDistr();
        this._runeWeights = RG.getRuneChargeDistr();
        /* LUT for functions to call on specific items.*/
        this._adjustFunctions = {
            food: this._adjustFoodItem.bind(this),
            goldcoin: this._adjustGoldCoin.bind(this),
            missile: this._adjustMissile.bind(this),
            weapon: this._adjustWeapon.bind(this),
            armour: this._adjustArmour.bind(this),
            ammo: this._adjustMissile.bind(this),
            rune: this._adjustRune.bind(this),
            tool: this._adjustTool.bind(this),
            // mineral: _adjustMineral
        };

    }

    /* Only public function. All logic is deferred to private functions.
     * Adjusts the properties of given item, based also on maxValue.*/
    public adjustItem(item: ItemBase, val: number) {
        const itemType = item.getType();
        if (this._adjustFunctions.hasOwnProperty(itemType)) {
            this._adjustFunctions[itemType](item, val);
        }
    }

    /* Distr. of food weights.*/
    public _adjustFoodItem(food: ItemBase) {
        const weight = RNG.getWeighted(this._foodWeights);
        food.setWeight(parseFloat(weight));
    }

    public _adjustGoldCoin(gold: ItemBase, nLevel: number) {
        if (!RG.isNullOrUndef([nLevel])) {
            const goldWeights = RG.getGoldCoinCountDistr(nLevel);
            const count = RNG.getWeighted(goldWeights);
            gold.setCount(parseInt(count, 10));
        }
        else {
            RG.err('ItemRandomizer', '_adjustGoldCoin',
                'nLevel is not defined.');
        }
    }

    public _adjustMissile(missile: ItemBase): void {
        const count = RNG.getUniformInt(5, 15);
        const value = missile.getValue();
        missile.setCount(count);
    }

    public _adjustTool(tool: ItemBase): void {
        if (/seeds/.test(tool.getName())) {
            const value = tool.getValue();
            let count = 1;
            if (value <= 5) {
                count = RNG.getUniformInt(5, 15);
            }
            else if (value <= 10) {
                count = RNG.getUniformInt(3, 10);
            }
            else if (value <= 20) {
                count = RNG.getUniformInt(1, 5);
            }
            tool.setCount(count);
        }
    }

    protected _isCombatMod(val: number) {return val >= 0.0 && val <= 0.02;}
    protected _isStatsMod(val: number) {return val >= 0.1 && val <= 0.12;}

    protected _getRandStat(): string {
        return RNG.arrayGetRand(RG.STATS);
    }

    /* Adjust damage, attack, defense and value of a weapon. */
    protected _adjustWeapon(weapon) {
        const randVal = RNG.getUniform();
        if (this._isCombatMod(randVal)) {
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
        else if (this._isStatsMod(randVal)) {
            const bonus = RNG.getUniformInt(1, 3);
            let stats = null;
            if (weapon.has('Stats')) {
                stats = weapon.get('Stats');
            }
            else {
                stats = new Component.Stats();
                stats.clearValues();
                weapon.add(stats);
            }
            const randStat = this._getRandStat();
            const getName = 'get' + randStat;
            const setName = 'set' + randStat;
            stats[setName](stats[getName]() + bonus);
            RG.scaleItemValue('stats', bonus, weapon);
        }
    }

    protected _adjustArmour(armour) {
        this._adjustWeapon(armour); // The same function works fine for this
    }

    protected _adjustRune(rune) {
        const charges = RNG.getWeighted(this._runeWeights);
        rune.setCharges(charges);
    }

    /* public _adjustMineral = mineral => {

    };*/

}

/* Factory object for creating items. */
export class FactoryItem {

    public static addItemsToActor(actor: SentientActor, items: ItemConstr[]): void {
        let createdItem = null;
        items.forEach(item => {
            createdItem = FactoryItem.createItemFromConstr(item);
            if (createdItem) {
                actor.getInvEq().addItem(createdItem);
            }
        });
    }

    /* Given actor and gear type (mithril, ruby, permaice ...), tries to
     * equip a full gear of items to the actor. */
    public static equipFullGearType(actor: SentientActor, type: string): boolean {
        const parser = ObjectShell.getParser();
        const nameRegexp = new RegExp(type);
        const items = parser.filterItems((item: IShell) => (
            item.type === 'armour' && nameRegexp.test(item.name)
        ));
        return FactoryItem.equipItemsToActor(actor, items);
    }

    /* Equips one melee weapon of given type to the actor. */
    public static equipWeaponOfType(actor: SentientActor, type: string): boolean {
        const parser = ObjectShell.getParser();
        const nameRegexp = new RegExp(type);
        const items = parser.filterItems((item: IShell) => (
            item.type === 'weapon' && nameRegexp.test(item.name)
        ));
        const oneWeapon = RNG.arrayGetRand(items);
        return FactoryItem.equipItemsToActor(actor, [oneWeapon]);
    }

    /* Tries to equip the list of given items to actor. Each item can be a
     * string or {name: 'xxx', count: 3} object. */
    public static equipItemsToActor(actor: SentientActor, items: ItemConstr[]): boolean {
        let createdItem = null;
        let ok = true;
        items.forEach(item => {
            createdItem = FactoryItem.createItemFromConstr(item);
            if (createdItem) {
                const count = createdItem.getCount();
                actor.getInvEq().addItem(createdItem);
                ok = ok && actor.getInvEq().equipNItems(createdItem, count);
            }
        });
        return ok;
    }

    public static createItemFromConstr(item: ItemConstr): null | ItemBase {
        const parser: Parser = ObjectShell.getParser();
        let createdItem = null;
        if (typeof item === 'string') {
            createdItem = parser.createItem(item);
        }
        else if (typeof item === 'object') {
            if (item.func) {
                createdItem = parser.createRandomItem({func: item.func});
            }
            else {
                if (item.name) {
                    createdItem = parser.createItem(item.name);
                }
            }
            if (createdItem && item.count) {
                createdItem.setCount(Dice.getValue(item.count));
            }
        }
        return createdItem;
    }

    protected _itemRandomizer: ItemRandomizer;

    constructor() {
        this._itemRandomizer = new ItemRandomizer();
    }

    /* Called for random items. Adjusts some of their attributes randomly.*/
    public _doItemSpecificAdjustments(item: ItemBase, val: number) {
        this._itemRandomizer.adjustItem(item, val);
    }

    public createItem(query: IQueryDB): ItemBase {
        const parser = ObjectShell.getParser();
        return parser.createRandomItem(query);
    }

    /* Adds N random items to the given level. Uses parser to generate the
     * items. */
    public addNRandItems(level: Level, conf: ItemConf): number {
        const items = this.generateItems(conf);
        const parser = ObjectShell.getParser();

        if (conf.food) {
            const food = parser.createRandomItem({
                func: (item: IShell) => item.type === 'food'
            });

            if (food) {
                this._doItemSpecificAdjustments(food, conf.maxValue);
                items.push(food);
            }
            else {
                RG.warn('FactoryItem', 'addNRandItems',
                    'Item.Food was not created properly.');
            }
        }
        Placer.addPropsToFreeCells(level, items);
        return items.length;
    }

    public generateItems(conf: ItemConf): ItemBase[] {
        const nItems = conf.itemsPerLevel || conf.nItems;
        const items: ItemBase[] = [];
        if (!nItems) {return items;}

        const parser: Parser = ObjectShell.getParser();
        if (conf.typeWeights) {
            for (let j = 0; j < nItems; j++) {
                const itemType = RNG.getWeighted(conf.typeWeights);
                const newFunc = (shell) => conf.item(shell) && shell.type === itemType;
                const item = parser.createRandomItem({func: newFunc});
                if (item) {
                    this._doItemSpecificAdjustments(item, conf.maxValue);
                    items.push(item);
                }
            }
        }
        else {
            for (let j = 0; j < nItems; j++) {
                const item = parser.createRandomItem({func: conf.item});
                if (item) {
                    this._doItemSpecificAdjustments(item, conf.maxValue);
                    items.push(item);
                }
            }
        }
        return items;
    }

    public generateGold(conf: GoldConf): ItemBase[] {
        const nGold = conf.goldPerLevel || conf.nGold;
        const parser: Parser = ObjectShell.getParser();
        const goldItems: ItemBase[] = [];
        if (!nGold) {
            return goldItems;
        }
        for (let i = 0; i < nGold; i++) {
            const gold = parser.createItem(RG.GOLD_COIN_NAME);
            if (!RG.isNullOrUndef([conf.nLevel])) {
                this._doItemSpecificAdjustments(gold, conf.nLevel!);
            }
            else {
                RG.warn('FactoryItem', 'generateGold',
                    `nLevel null/undef in conf ${JSON.stringify(conf)}`);
            }
            goldItems.push(gold);
        }
        return goldItems;
    }

    /* Adds a random number of gold coins to the level. */
    public addRandomGold(level: Level, parser: Parser, conf: ItemConf) {
        const goldItems = this.generateGold(conf);
        Placer.addPropsToFreeCells(level, goldItems);
    }

    /* Returns a shop item based on the configuration. */
    public getShopItem(n: number, conf: ShopConf): null | ItemBase {
        let shopItem: null | ItemBase = null;

        if (conf.shopFunc) {
            if (typeof conf.shopFunc[n] === 'function') {
                shopItem = conf.parser.createRandomItem({
                    func: conf.shopFunc[n]
                });
            }
            else {
                RG.err('FactoryItem', 'createShop -> getShopItem',
                    'shopFunc must be a function.');
            }
        }
        else if (Array.isArray(conf.shopType)) {
            if (conf.shopType.length < n) {
                shopItem = conf.parser.createRandomItem({
                    func: (item: IShell) => item.type === conf.shopType![n]
                });
            }
            else {
                RG.err('FactoryItem', 'getShopItem',
                    `${n} out of bounds in conf. ${JSON.stringify(conf.shopType)}`);
            }
        }
        else if (typeof conf.shopType === 'string') {
            shopItem = conf.parser.createRandomItem({
                func: (item: IShell) => item.type === conf.shopType
            });
        }
        else { // Fallback, if no config
            shopItem = conf.parser.createRandomItem({
                func: (item: IShell) => (
                    item.value <= 50 + n * 100 && item.type !== 'goldcoin'
                )
            });
        }
        if (shopItem) {
            this._doItemSpecificAdjustments(shopItem, 50 + n * 100);
        }
        return shopItem;
    }

    public addItemsToCells(level: Level, parser: Parser, cells: Cell[], conf: ItemConf) {
        if (!conf.maxValue) {
            RG.err('FactoryItem', 'addItemsToCells',
                'conf is missing maxValue');
        }
        const items = this.generateItems(conf);
        Placer.addPropsToCells(level, cells, items);
    }


}
