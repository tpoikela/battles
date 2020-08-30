
import RG from './rg';
import * as Actor from './actor';
import * as Component from './component';
import * as Item from './item';
import {Brain} from './brain';
import {Effects} from '../data/effects';
import {ElementBase} from './element';
import {Evaluator} from './evaluators';
import {Objects} from '../data/battles_objects';
import {Random} from './random';
import {Spell} from '../data/spells';
import {adjustActorValues} from '../data/actors';
import {ObjectShellComps} from './objectshellcomps';

import {ActorGen} from '../data/actor-gen';

import {IShell, StringMap, TShellFunc, TPropType} from './interfaces';

const RNG = Random.getRNG();
export const ObjectShell: any = {};

type Entity = import('./entity').Entity;
type BaseActor = Actor.BaseActor;
type SentientActor = Actor.SentientActor;
type ItemBase = Item.ItemBase;

export interface IShellInputData {
    actors?: IShell[];
    items?: IShell[];
    elements?: IShell[];
    effects?: IShell[];
}

export interface IShellDb {
    actors: StringMap<IShell>;
    items: StringMap<IShell>;
    elements: StringMap<IShell>;
    effects?: StringMap<IShell>;
}

type DBKey = TPropType | 'effects';

export interface IShellDbDanger {
    [key: number]: IShellDb;
}

// Used when querying objects from the shell database, using func is preferred
// because it can implement all behaviour the rest are offering
export interface IQueryDB {
    name?: string; // Specific name sought after
    categ?: DBKey; // actors, items, elements
    danger?: number;
    func?: TShellFunc; // Acceptance func for query
}


export class Creator {
    protected _db: IShellDb;
    protected _dbNoRandom: IShellDb;
    protected _compGen: ObjectShellComps;
    protected _propToCall: {[key in DBKey]: {[key: string]: any}};

    constructor(db: IShellDb, dbNoRandom: IShellDb) {
        this._db = db;
        this._dbNoRandom = dbNoRandom;
        this._compGen = new ObjectShellComps();

        /* Maps obj props to function calls. Essentially this maps bunch of setters
         * to different names. Following formats supported:
         *
         * 1. {factory: funcObj, func: "setter"}
         *  Call obj["setter"]( funcObj(shell.field) )
         *
         * 2. {comp: "CompName", func: "setter"}
         *  Create component comp of type "CompName".
         *  Call comp["setter"]( shell.field)
         *  Call obj.add(comp)
         *
         * 3. {comp: "CompName"}
         *  Create component comp of type "CompName" with new CompName(shell.field)
         *  Call obj.add(comp)
         *
         * 4. "setter"
         *   Call setter obj["setter"](shell.field)
         * */
        this._propToCall = {
            actors: {
                type: 'setType',

                attackRange: {comp: 'Combat', func: 'setAttackRange'},
                attack: {comp: 'Combat', func: 'setAttack'},
                defense: {comp: 'Combat', func: 'setDefense'},
                damage: {comp: 'Combat', func: 'setDamageDie'},
                numHits: {comp: 'Combat', func: 'setNumHits'},

                speed: {comp: 'Stats', func: 'setSpeed'},
                strength: {comp: 'Stats', func: 'setStrength'},
                accuracy: {comp: 'Stats', func: 'setAccuracy'},
                agility: {comp: 'Stats', func: 'setAgility'},
                willpower: {comp: 'Stats', func: 'setWillpower'},
                perception: {comp: 'Stats', func: 'setPerception'},
                magic: {comp: 'Stats', func: 'setMagic'},
                spirituality: {comp: 'Stats', func: 'setSpirituality'},

                fovrange: {comp: 'Perception', func: 'setFOVRange'},

                pp: {comp: 'SpellPower', func: ['setPP', 'setMaxPP']},
                maxPP: {comp: 'SpellPower', func: 'setMaxPP'},
                hp: {comp: 'Health', func: ['setHP', 'setMaxHP']},
                danger: {comp: 'Experience', func: 'setDanger'},
                brain: {func: 'setBrain', factory: this.createBrain}
            },
            items: {
                // Generic item functions
                type: 'setType',
                value: 'setValue',
                weight: {comp: 'Physical', func: 'setWeight'},
                damageType: 'setDamageType',

                speed: {comp: 'Stats', func: 'setSpeed'},
                strength: {comp: 'Stats', func: 'setStrength'},
                accuracy: {comp: 'Stats', func: 'setAccuracy'},
                agility: {comp: 'Stats', func: 'setAgility'},
                willpower: {comp: 'Stats', func: 'setWillpower'},
                perception: {comp: 'Stats', func: 'setPerception'},
                magic: {comp: 'Stats', func: 'setMagic'},
                spirituality: {comp: 'Stats', func: 'setSpirituality'},

                armour: {
                    attack: 'setAttack',
                    defense: 'setDefense',
                    protection: 'setProtection',
                    armourType: 'setArmourType'
                },

                weapon: {
                    damage: 'setDamageDie',
                    attack: 'setAttack',
                    defense: 'setDefense',
                    weaponType: 'setWeaponType',
                    range: 'setAttackRange'
                },
                missile: {
                    damage: 'setDamageDie',
                    attack: 'setAttack',
                    range: 'setAttackRange'
                },
                food: {
                    energy: 'setEnergy'
                }
            },
            elements: {
                z: 'setZ',
                type: 'setType',
                msg: 'setMsg'
            },
            effects: {}
        };

        this._propToCall.items.missileweapon = this._propToCall.items.weapon;
        this._propToCall.items.missileweapon.fireRate = 'setFireRate';
        this._propToCall.items.ammo = this._propToCall.items.missile;
        this._propToCall.items.ammo.ammoType = 'setAmmoType';

    }

    /* Returns an object shell, given category and name.*/
    public get(categ: DBKey, name: string): IShell | null {
        if (this._dbNoRandom[categ]![name]) {
            return this._dbNoRandom[categ]![name];
        }
        return this._db[categ]![name];
    }

    /* Returns an actual game object when given category and name. Note that
     * the blueprint must exist already in the database (blueprints must have
     * been parsed before). */
    public createActualObj(categ: DBKey, name: string): null | Entity {
        const shell = this.get(categ, name);
        const propCalls = this._propToCall[categ];
        if (!shell) {
            RG.err('Creator', 'createActualObj',
                `shell for ${name} is not found.`);
            return null;
        }

        const newObj = this.createNewObject(categ, shell) as Entity;
        if (!newObj) {
            RG.err('ObjectShell.creator', 'createActualObj',
                `Failed to create obj with ${JSON.stringify(shell)}`);
            return null;
        }

        // Example: {name: 'bat', addComp: 'Flying'}
        if (shell && shell.hasOwnProperty('addComp')) {
            this._compGen.addComponents(shell, newObj);
        }

        // If propToCall table has the same key as shell property, call
        // function in this._propToCall using the newly created object.
        for (const p in shell) {

            // Called for basic type: actors, items...
            if (propCalls.hasOwnProperty(p)) {
                const funcName = propCalls[p];
                if (typeof funcName === 'object') {

                    // 1. Add new component to the object
                    if (funcName.hasOwnProperty('comp')) {
                        this._compGen.addCompToObj(newObj, funcName, shell[p]);
                    }
                    // 2. Or use factory to create an object and add it to the
                    // object. Only 'brain' supported for now.
                    else if (funcName.hasOwnProperty('factory')) {
                        if (p === 'brain') {
                            const createdObj
                                = funcName.factory(newObj, shell[p]);
                            (newObj as any)[funcName.func](createdObj);
                        }
                    }
                    // 3. Or call one of the object's methods with the value in
                    // the object shell
                    else {
                        for (const f in funcName) {
                            if (funcName.hasOwnProperty(f)) {
                                const fName = funcName[f];
                                if (newObj.hasOwnProperty(fName)) {
                                    (newObj as any)[fName](shell[p]);
                                }
                            }
                        }
                    }
                }
                else { // 4. For strings, call the setter 'funcName' directly
                    (newObj as any)[funcName](shell[p]);
                }
            }
            // Check for subtypes
            else if (shell.hasOwnProperty('type')) {

                // No idea what this mess of code does
                if (propCalls.hasOwnProperty(shell.type)) {
                    const propTypeCalls = propCalls[shell.type];
                    if (propTypeCalls.hasOwnProperty(p)) {
                        const funcName2 = propTypeCalls[p];
                        if (typeof funcName2 === 'object') {
                            for (const f2 in funcName2) {
                                if (funcName2.hasOwnProperty(f2)) {
                                    const fName2 = funcName2[f2];
                                    if (newObj.hasOwnProperty(fName2)) {
                                        (newObj as any)[funcName2[f2]](shell[p]);
                                    }
                                }
                            }
                        }
                        else {
                            (newObj as any)[funcName2](shell[p]);
                        }
                    }
                }
            }
        }

        if (shell.hasOwnProperty('use')) {this.addUseEffects(shell, newObj);}

        if (shell.hasOwnProperty('equip')) {
            this.addEquippedItems(shell, newObj);
        }

        if (shell.hasOwnProperty('inv')) {
            if (RG.isActor(newObj)) {
                if (RG.isSentient(newObj)) {
                    // TODO
                    this.addInventoryItems(shell, newObj as any);
                }
            }
        }

        if (shell.hasOwnProperty('loot')) {
            this.addLootComponents(shell, newObj);
        }

        if (shell.hasOwnProperty('poison')) {
            this._compGen.addPoison(shell, newObj);
        }

        if (shell.hasOwnProperty('enemies')) {
            this.addEnemies(shell, newObj);
        }

        if (shell.hasOwnProperty('spells')) {
            this.addSpellbookAndSpells(shell, newObj);
        }

        if (shell.hasOwnProperty('onHit')) {
            this._compGen.addOnHitProperties(shell, newObj);
        }

        if (shell.hasOwnProperty('onAttackHit')) {
            this._compGen.addOnAttackHitProperties(shell, newObj);
        }

        if (shell.hasOwnProperty('onEquip')) {
            this._compGen.addOnEquipProperties(shell, newObj);
        }

        if (shell.hasOwnProperty('goals')) {
            this.addGoalsToObject(shell, newObj);
        }

        if (shell.hasOwnProperty('ability')) {
            this.addAbilityEffects(shell, newObj);
        }

        return newObj;
    }

    public addEnemies(shell: IShell, obj) {
        shell.enemies.forEach((enemyType: string) => {
            obj.getBrain().addEnemyType(enemyType);
        });
        if (shell.enemies.length === 0) {
            obj.getBrain().getMemory().removeEnemyTypes();
        }
    }

    /* Creates a spellbook and adds specified spells into it. */
    public addSpellbookAndSpells(shell: IShell, obj) {
        obj.setBook(new Spell.SpellBook(obj));
        shell.spells.forEach(spell => {
            const usedSpell = this.getUsedObject(spell);
            if (Spell[usedSpell]) {
                obj.getBook().addSpell(new Spell[usedSpell]());
            }
            else {
                const msg = `Spell |${usedSpell}| does not exist.`;
                RG.err('Creator', 'addSpellbookAndSpells', msg);
            }
        });
    }


    public addGoalsToObject(shell: IShell, newObj) {
        if (RG.isActor(newObj)) {
            const {goals} = shell;
            goals.forEach(goal => {
                const {name, bias} = goal;
                const newEval = new Evaluator[name](bias);
                Object.keys(goal).forEach(prop => {
                    // Call each setter given with {name: 'AAA', setter: 0...}
                    if (prop !== 'name' && prop !== 'bias') {
                        newEval[prop](goal[prop]);
                    }
                });
                const brain = newObj.getBrain();
                (brain as any).getGoal().addEvaluator(newEval); // TODO fix
            });
        }
    }

    public getUsedObject(strOrObj) {
        if (typeof strOrObj === 'object') {
            if (strOrObj.random) {
                return RNG.arrayGetRand(strOrObj.random);
            }
        }
        return strOrObj;

    }

    /* Factory-method for creating the actual game objects.*/
    public createNewObject(categ, obj) {
        switch (categ) {
            case RG.TYPE_ACTOR:
                const type = obj.type;
                switch (type) {
                    default: {
                        switch (obj.actorType) {
                            case 'BaseActor':
                                return new Actor.BaseActor(obj.name);
                            default: return new Actor.SentientActor(obj.name);
                        }
                    }
                }
            case RG.TYPE_ITEM:
                const subtype = obj.type;
                switch (subtype) {
                    case 'armour': return new Item.Armour(obj.name);
                    case 'book': return new Item.Book(obj.name);
                    case 'food': return new Item.Food(obj.name);
                    case 'gold': return new Item.Gold(obj.name);
                    case 'goldcoin' : return new Item.GoldCoin(obj.name);
                    case 'mineral': return new Item.Mineral(obj.name);
                    case 'missile': return new Item.Missile(obj.name);
                    case 'missileweapon':
                        return new Item.MissileWeapon(obj.name);
                    case 'ammo': return new Item.Ammo(obj.name);
                    case 'potion': return new Item.Potion(obj.name);
                    case 'rune': return new Item.Rune(obj.name);
                    case 'spiritgem': return new Item.SpiritGem(obj.name);
                    case 'weapon': return new Item.Weapon(obj.name);
                    default: {
                        if (subtype) {
                            const item = new Item.ItemBase(obj.name);
                            item.setType(obj.type);
                            return item;
                        }
                        const json = JSON.stringify(obj);
                        const msg =
                            `Null/undef type: ${subtype}, obj: ${json}`;
                        RG.err('', 'createNewObject', msg);
                    }
                }
                break; // Unreachable
            case RG.TYPE_ELEM: {
                const usedType = obj.type || obj.name;
                return new ElementBase(obj.name, usedType);
            }
            default: break;
        }
        return null;
    }

    // Adds the inventory items for the actors which are specified with 'inv'
    public addInventoryItems(shell: IShell, actor: SentientActor) {
        const inv = shell.inv;
        inv.forEach((item: IShell) => {
            const name = item.name || item;
            const count = item.count || 1;
            const itemObj = this.createActualObj(RG.TYPE_ITEM, name);
            if (itemObj) {
                (itemObj as ItemBase).setCount(count);
                // TODO
                actor.getInvEq().addItem(itemObj as any);
            }
            else {
                RG.err('Creator', 'addInventoryItems',
                    `itemObj for ${name} is null. Actor: ${actor.getName()}`);
            }
        });
    }

    // Adds the loot component to the Actor object
    public addLootComponents(shell: IShell, actor): void {
        const loot = shell.loot;
        const lootItem = this.createActualObj(RG.TYPE_ITEM, loot);
        const lootComp = new Component.Loot(lootItem);
        actor.add(lootComp);
    }

    /* Adds equipped items given with shell.equip into the actor. */
    public addEquippedItems(shell: IShell, actor): void {
        const equip = shell.equip;
        let needShuffle = false;
        equip.forEach(item => {
            const itemName = item.name || item;
            const count = item.count || 1;
            const itemObj = this.createActualObj(RG.TYPE_ITEM, itemName);
            if (itemObj) {
                (itemObj as ItemBase).setCount(count);
                if (!actor.getInvEq().restoreEquipped(itemObj)) {
                    // Shuffle for the next round
                    needShuffle = true;
                }
            }
            else {
                RG.err('Creator', 'addEquippedItems',
                    `itemObj for ${item} is null. Actor: ${actor.getName()}`);
            }
        });
        // Shell may have conflict equip such as 2 weapons or armour.
        // Shuffle this for the next round
        if (needShuffle) {
            RNG.shuffle(shell.equip);
        }
    }

    /* If shell has 'use', this adds specific use effect to the item.*/
    public addUseEffects(shell: IShell, newObj): void {
        newObj.useFuncs = [];
        if (RG.isItem(newObj)) {
            newObj.useItem = this._db.effects.use.func.bind(newObj);
        }
        else if (RG.isActor(newObj)) {
            (newObj as any).useSkill = this._db.effects.use.func.bind(newObj);
            const brain = (newObj.getBrain()) as any;
            if (brain.getGoal) {
                // Prevent adding double evaluator
                if (!brain.getGoal().hasEvalType('UseSkill')) {
                    brain.getGoal().addEvalByName('UseSkill', 1.0);
                }
            }
        }

        if (Array.isArray(shell.use)) {
            for (let i = 0; i < shell.use.length; i++) {
                this._addUseEffectToEntity(shell, newObj, shell.use[i]);
            }
        }
        else if (typeof shell.use === 'object') {
            for (const p in shell.use) {
                if (shell.use.hasOwnProperty(p)) {
                    this._addUseEffectToEntity(shell, newObj, p);
                }
            }
        }
        else {
            this._addUseEffectToEntity(shell, newObj, shell.use);
        }
    }

    public _addUseEffectToEntity(shell: IShell, newObj: any, useName: string): void {
        const useFuncName = useName;
        if (this._db.effects.hasOwnProperty(useFuncName)) {
            const useEffectShell = this._db.effects[useFuncName];
            const useFuncVar = useEffectShell.func;
            newObj.useFuncs.push(useFuncVar);

            if (newObj.has('UseEffects')) {
                const addedShell = {[useName]: shell.use[useName]};
                if (!newObj.get('UseEffects').hasEffect(useName)) {
                    newObj.get('UseEffects').addEffect(addedShell);
                }
            }

            if (useEffectShell.hasOwnProperty('requires')) {
                if (shell.use.hasOwnProperty(useName)) {
                    newObj.useArgs = {};
                    const reqs = useEffectShell.requires;
                    if (typeof reqs === 'object') {
                        for (let i = 0; i < reqs.length; i++) {
                            this._verifyAndAddReq(shell.use[useName], newObj, reqs[i]);
                        }
                    }
                    else {
                        this._verifyAndAddReq(shell.use[useName], newObj, reqs);
                    }
                }
                else {
                    RG.err('ObjectParser', 'addUseEffects',
                        `useEffect shell has 'requires'.
                        newObj shell 'use' must be an object.`
                    );
                }
            }
            if (useEffectShell.hasOwnProperty('optional')) {
                const opts = useEffectShell.optional;
                opts.forEach(option => {
                    if (shell.use[useName].hasOwnProperty(option)) {
                        newObj.useArgs[option] = shell.use[useName][option];
                    }
                });
            }
        }
        else {
            RG.err('ObjectParser', 'addUseEffects',
                'Unknown effect: |' + useFuncName + '|');
        }
    }


    public addAbilityEffects(shell: IShell, newObj): void {
        if (!shell.use) {
            shell.use = shell.ability;
        }
        if (!newObj.has('UseEffects')) {
            newObj.add(new Component.UseEffects());
        }
        this.addUseEffects(shell, newObj);
    }

    /* Verifies that the shell has all requirements, and adds them to the
     * object, into useArgs.reqName. */
    public _verifyAndAddReq(obj, item, reqName) {
        if (obj.hasOwnProperty(reqName)) {
            item.useArgs[reqName] = obj[reqName];
        }
        else {
            RG.err('ObjectParser', '_verifyAndAddReq',
                `Req |${reqName}| not specified in item shell. Item: ${item}`);
        }
    }

    /* Creates actual game object from obj shell in given category.*/
    public createFromShell(categ: DBKey, obj: IShell) {
        if (obj) {
            return this.createActualObj(categ, obj.name);
        }
        else {
            RG.err('Creator', 'createFromShell',
                'obj given must be defined.');
        }
        return null;
    }

    public createBrain(actor, brainName: string): void {
        if (Brain[brainName]) {
            return new Brain[brainName](actor);
        }
        const msg = `ERROR. No brain type |${brainName}| found`;
        RG.err('Creator', 'createBrain', msg);
    }

}
ObjectShell.Creator = Creator;

/* Object handling the procedural generation. It has an object "database" and
 * objects can be pulled randomly from it. */
export class ProcGen {
    protected _db: IShellDb;
    protected _dbDanger: IShellDbDanger;
    protected _cache: {[key: string]: {[key: string]: any}};

    constructor(db: IShellDb, dbDanger: IShellDbDanger) {
        this._db = db;
        this._dbDanger = dbDanger;

        // Internal cache for proc generation
        this._cache = {
            actorWeights: {}
        };
    }

    /* Returns entries from db based on the query. Returns null if nothing
     * matches.*/
    public dbGet(query: IQueryDB): IShell | StringMap<IShell> {
        const name = query.name;
        const categ = query.categ;
        const danger = query.danger;

        // Specifying name returns an array
        if (!RG.isNullOrUndef([name])) {
            if (!categ) {
                RG.err('ProcGen', 'dbGet',
                    'Both name and categ must be given!');
            }
            return this._db[categ][name];
        }

        if (!RG.isNullOrUndef([danger])) {
            if (this._dbDanger.hasOwnProperty(danger)) {
                const entries = this._dbDanger[danger];
                if (typeof categ !== 'undefined') {
                    if (entries.hasOwnProperty(categ)) {
                        return entries[categ];
                    }
                    else {return {};}
                }
                else {
                    return this._dbDanger[danger];
                }
            }
            else {
                return {};
            }
        }
        // Fetch all entries of given category
        else if (!RG.isNullOrUndef([categ])) {
            if (this._db.hasOwnProperty(categ)) {
                return this._db[categ];
            }
        }
        return {};
    }

    /* Filters given category with a function. Func gets each object as arg,
     * and must return either true or false. Function can be for example:
     *   1.func(obj) {if (obj.name === 'wolf') return true;} Or
     *   2.func(obj) {if (obj.hp > 25) return true;}.
     *   And it can be as complex as needed of course.
     * */
    public filterCategWithFunc(categ: DBKey, func: TShellFunc): IShell[] {
        const objects: StringMap<IShell> = this.dbGet({categ});
        const res: IShell[] = [];
        const keys = Object.keys(objects);

        for (let i = 0; i < keys.length; i++) {
            const name = keys[i];
            const obj: IShell = objects[name];
            const acceptItem = func(obj);
            if (acceptItem) {
                res.push(obj);
            }
        }
        return res;
    }

    //---------------------------------------------------
    // RANDOMIZED METHODS for procedural generation
    //---------------------------------------------------

    /* Returns random object from the db. For example, {categ: "actors",
     * danger: 2}
     * returns a random actors with these constrains.
     * Ex2: {danger: 3, num:1}
     * returns randomly one entry which has danger 3.*/
    public dbGetRand(query: IQueryDB): null | IShell {
        const danger = query.danger;
        const categ = query.categ;
        if (typeof danger !== 'undefined') {
            if (typeof categ !== 'undefined') {
                if (this._dbDanger.hasOwnProperty(danger)) {
                    const entries = this._dbDanger[danger][categ];
                    return this.getRandFromObj<IShell>(entries!);
                }
            }
        }
        return null;
    }

    /* Creates a random actor based on danger value or a filter function.*/
    public getRandomActor(obj: IQueryDB): null | IShell {
        if (obj.hasOwnProperty('danger')) {
            const danger = obj.danger;
            const randShell = this.dbGetRand({danger, categ: RG.TYPE_ACTOR});
            if (randShell !== null) {
                return randShell;
            }
        }
        else if (obj.hasOwnProperty('func')) {
            const res: IShell[] = this.filterCategWithFunc( RG.TYPE_ACTOR, obj.func);
            return RNG.arrayGetRand(res);
        }
        return null;
    }

    /* Returns a random item based on a selection function.
     *
     * Example:
     *  const funcValueSel = function(item) {return item.value >= 100;}
     *  const item = createRandomItem({func: funcValueSel});
     *  // Above returns item with value > 100.
     */
    public getRandomItem(obj: IQueryDB | TShellFunc): null | IShell {
        if (typeof obj === 'function') {
            const res: IShell[] = this.filterCategWithFunc(RG.TYPE_ITEM, obj);
            return RNG.arrayGetRand(res);
        }
        else if (obj.hasOwnProperty('func')) {
            const res: IShell[] = this.filterCategWithFunc(RG.TYPE_ITEM, (obj as IShell).func);
            return RNG.arrayGetRand(res);
        }
        else {
            RG.err('ProcGen', 'getRandomItem',
                `No function with func. obj arg: ${JSON.stringify(obj)}`);
        }
        return null;
    }

    // Uses engine's internal weighting algorithm when given a level number.
    // Note that this method can return null, if no correct danger level is
    // found. You can supply {func: ...} as a fallback solution.
    public getRandomActorWeighted(min: number, max: number): null | IShell {
        const key = min + ',' + max;
        if (!this._cache.actorWeights.hasOwnProperty(key)) {
            this._cache.actorWeights[key] = RG.getDangerProb(min, max);
        }
        const danger = RNG.getWeighted(this._cache.actorWeights[key]);
        const actor = this.getRandomActor({danger: parseInt(danger, 10)});
        return actor;
    }

    /* Returns a property from an object, selected randomly. For example,
     * given object {a: 1, b: 2, c: 3}, may return 1,2 or 3 with equal
     * probability.*/
    public getRandFromObj<T>(obj: StringMap<T>): T {
        const keys = Object.keys(obj);
        const randIndex = RNG.randIndex(keys);
        return obj[keys[randIndex]];
    }
}
ObjectShell.ProcGen = ProcGen;

/* Object parser for reading game data. Game data is contained within shell
 * objects which are simply object literals without functions etc. */
export class Parser {

    protected _base: any;
    protected _db: any;
    protected _dbDanger: any;
    protected _dbNoRandom: any;
    protected _creator: Creator;
    protected _procgen: ProcGen;

    // NOTE: 'SHELL' means vanilla JS object, which has not been
    // created with new:
    //      SHELL:   const rat = {name: "Rat", type: "animal"};
    //      OBJECT: const ratObj = new RG.Actor.Rogue("rat");
    //              ratObj.setType("animal");
    //
    // Shells are used in external data file to describe game objects in a more
    // concise way. Game objects are created from shells by this object.
    constructor() {
        // Stores the base shells
        this._base = {
            actors: {},
            effects: {},
            items: {},
            elements: {}
        } as IShellDb;

        this._db = {
            actors: {},
            effects: {},
            items: {},
            elements: {}
        } as IShellDb;

        this._dbDanger = {} as IShellDbDanger; // All entries indexed by danger

        this._dbNoRandom = {
            actors: {},
            items: {},
            elements: {}
        } as IShellDb; // All entries excluded from random generation

        this._creator = new Creator(this._db, this._dbNoRandom);
        this._procgen = new ProcGen(this._db, this._dbDanger);
    }

    public getCreator(): Creator {
        return this._creator;
    }

    public getProcGen(): ProcGen {
        return this._procgen;
    }

    //-----------------------------------------------------------------------
    // "PARSING" METHODS
    //-----------------------------------------------------------------------

    /* Parses all shell data, items, actors, level etc.*/
    public parseShellData(obj: IShellInputData): void {
        const keys = Object.keys(obj) as DBKey[];
        for (let i = 0; i < keys.length; i++) {
            const shells: undefined | IShell[] = obj[keys[i]];
            if (Array.isArray(shells)) {
                this.parseShellCateg(keys[i], shells);
            }
            else {
                RG.err('ObjectShell.Parser', 'parseShellData',
                    `${keys[i]} is not an array of shells!`);
            }
        }
    }

    /* Parses one specific shell category, ie items or actors. */
    public parseShellCateg(categ: DBKey, objsArray: IShell[]): void {
        for (let i = 0; i < objsArray.length; i++) {
            this.parseObjShell(categ, objsArray[i]);
        }
    }

    /* Parses an object shell. Returns null for invalid objects, and
     * corresponding object for actual actors. If 'base' property exists,
     * all base properties will be added to the returned object.
     * */
    public parseObjShell(categ: DBKey, obj: IShell): IShell {
        if (this.validShellGiven(obj)) {
            // Get properties from base shell
            if (obj.hasOwnProperty('base')) {
                const baseShells = typeof obj.base === 'string' ? [obj.base]
                    : obj.base;
                baseShells.forEach(bName => {
                    if (this.baseExists(categ, bName)) {
                        obj = this.extendObj(obj, this.getBase(categ, bName));
                    }
                    else {
                        RG.err('ObjectParser', 'parseObjShell',
                            'Unknown base ' + bName + ' specified for '
                            + JSON.stringify(obj));
                    }
                });
            }

            // If type not given, use name as type
            if (categ === RG.TYPE_ACTOR) {this.addTypeIfUntyped(obj);}

            this.storeIntoDb(categ, obj);
            return obj;
        }
        else {
            return null;
        }
    }

    /* Checks that the object shell given is correctly formed.*/
    public validShellGiven(obj: IShell): boolean {
        if (!obj.hasOwnProperty('name')) {
            RG.err('Parser', 'validShellGiven',
                `shell doesn't have a name. shell: ${JSON.stringify(obj)}`);
            return false;
        }
        return true;
    }

    /* If an object doesn't have type, the name is chosen as its type.*/
    public addTypeIfUntyped(obj: IShell): void {
        if (!obj.hasOwnProperty('type')) {
            obj.type = obj.name;
        }
    }

    /* Returns an object shell, given category and name.*/
    public get(categ: DBKey, name: string): IShell {
        return this._db[categ][name];
    }

    /* Return specified base shell.*/
    public getBase(categ: DBKey, name: string): IShell {
        return this._base[categ][name];
    }

    /* All shells can be used as base, not only ones with
     * 'dontCreate: true' */
    public storeForUsingAsBase(categ: DBKey, obj: IShell): void {
        this._base[categ][obj.name] = obj;
    }

    /* Stores the object into given category.*/
    public storeIntoDb(categ: DBKey, obj: IShell): void {
        if (this._db.hasOwnProperty(categ)) {
            this.storeForUsingAsBase(categ, obj);

            if (obj.hasOwnProperty('noRandom')) {
                this._dbNoRandom[categ][obj.name] = obj;
            }
            else if (!obj.hasOwnProperty('dontCreate')) {

                this._db[categ][obj.name] = obj;
                if (obj.hasOwnProperty('danger')) {
                    const danger = obj.danger;
                    if (!this._dbDanger.hasOwnProperty(danger)) {
                        this._dbDanger[danger] = {};
                    }
                    if (!this._dbDanger[danger].hasOwnProperty(categ)) {
                        this._dbDanger[danger][categ] = {};
                    }
                    this._dbDanger[danger][categ][obj.name] = obj;
                }

            } // dontCreate: true shells are skipped (used as base)
        }
        else {
            RG.err('ObjectParser', 'storeIntoDb',
                'Unknown category: ' + categ);
        }
        if (categ !== 'effects') {
            this.storeRenderingInfo(categ, obj);
        }
    }

    /* Stores char/CSS className for the object for rendering purposes.*/
    public storeRenderingInfo(categ: TPropType, obj: IShell): void {
        let fg = '';
        let bg = '';
        if (obj.hasOwnProperty('color')) {
            if (RG.isNullOrUndef([obj.color])) {
                const json = JSON.stringify(obj);
                RG.err('Parser', 'storeRenderingInfo',
                    `obj.color null/undef! obj: ${json}`);
            }
            fg = obj.color.fg;
            bg = obj.color.bg;
        }

        if (obj.hasOwnProperty('colorfg')) {
            fg = obj.colorfg;
        }
        if (obj.hasOwnProperty('colorbg')) {
            bg = obj.colorbg;
        }
        /*if (!fg || !bg || !obj.className) {
            const json = JSON.stringify(obj.color);
            RG.err('Parser', 'storeRenderingInfo',
                `fg and bg OR className must be given. ${obj.name} Got: ${json}`);
        }*/
        if (fg !== '' || bg !== '') {
            if (!obj.className) {obj.className = '';}
            obj.className += ' cell-fg-' + fg.toLowerCase() +
                ' cell-bg-' + bg.toLowerCase();
        }

        if (obj.hasOwnProperty('char')) {
            if (obj.hasOwnProperty('name')) {
                RG.addCharStyle(categ, obj.name, obj.char);
                if (obj.dontCreate) {
                    RG.addCharStyle(categ, obj.type, obj.char);
                }
            }
            else {
                RG.addCharStyle(categ, obj.type, obj.char);
            }
        }
        if (obj.hasOwnProperty('className')) {
            if (obj.hasOwnProperty('name')) {
                RG.addCellStyle(categ, obj.name, obj.className);
                if (obj.dontCreate) {
                    RG.addCellStyle(categ, obj.type, obj.className);
                }
            }
            else {
                RG.addCellStyle(categ, obj.type, obj.className);
            }
        }
    }

    /* Returns true if shell base exists.*/
    public baseExists(categ: DBKey, baseName: string): boolean {
        if (this._base.hasOwnProperty(categ)) {
            return this._base[categ].hasOwnProperty(baseName);
        }
        return false;
    }

    /* Extends the given object shell with a given base shell.*/
    public extendObj(obj: IShell, baseObj: IShell): IShell {
        for (const prop in baseObj) {
            if (!obj.hasOwnProperty(prop)) {
                if (prop !== 'dontCreate') {
                    obj[prop] = baseObj[prop];
                }
            }
        }
        return obj;
    }

    //---------------------------------------------------------------
    // CREATE METHODS (to be removed, but kept now because removing
    //   these would break the API in major way)
    //---------------------------------------------------------------

    public createEntity(name: string) {
        if (this.hasObj(RG.TYPE_ITEM, name)) {
            return this.createItem(name);
        }
        else if (this.hasObj(RG.TYPE_ACTOR, name)) {
            return this.createActor(name);
        }
        return null;
    }

    public createActor(name: string): BaseActor {
        return this.createActualObj(RG.TYPE_ACTOR, name) as BaseActor;
    }

    public createItem(name: string): ItemBase {
        return this.createActualObj(RG.TYPE_ITEM, name) as ItemBase;
    }

    public createElement(name: string) {
        return this.createActualObj(RG.TYPE_ELEM, name);
    }

    public hasItem(name: string): boolean {
        return this.hasObj(RG.TYPE_ITEM, name);
    }

    public hasObj(categ: DBKey, name: string): boolean {
        return this.dbExists(categ, name);
    }

    /* Returns an actual game object when given category and name. Note that
     * the shell must exist already in the database (shell must have
     * been parser before). */
    public createActualObj(categ: DBKey, name: string) {
        if (!this.dbExists(categ, name)) {
            RG.err('Parser', 'createActualObj',
                `Categ: ${categ} Name: ${name} doesn't exist.`);
            return null;
        }
        return this._creator.createActualObj(categ, name);
    }

    /* Creates actual game object from obj shell in given category.*/
    public createFromShell(categ: DBKey, obj: IShell) {
        if (!this.dbExists(categ, obj.name)) {
            this.parseObjShell(categ, obj);
        }
        return this._creator.createFromShell(categ, obj);
    }

    //--------------------------------------------------------------------
    // Query methods for object shells
    //--------------------------------------------------------------------

    public dbExists(categ: DBKey, name: string): boolean {
        if (this._db.hasOwnProperty(categ)) {
            if (this._db[categ].hasOwnProperty(name)) {
                return true;
            }
        }
        if (this._dbNoRandom[categ][name]) {
            return true;
        }
        return false;
    }

    /* Returns entries from db based on the query. Returns null if nothing
     * matches.*/
    public dbGet(query: IQueryDB) {
        return this._procgen.dbGet(query);
    }

    public dbGetActor(query: IQueryDB) {
        const newQuery = {name: query.name, categ: RG.TYPE_ACTOR};
        return this._procgen.dbGet(newQuery);
    }

    public dbGetItem(query: IQueryDB) {
        const newQuery = {name: query.name, categ: RG.TYPE_ITEM};
        return this._procgen.dbGet(newQuery);
    }

    public dbGetRand(query: IQueryDB) {return this._procgen.dbGetRand(query);}

    public filter(categ: DBKey, func): IShell[] {
        return this._procgen.filterCategWithFunc(categ, func);
    }

    public filterItems(func): IShell[] {
        return this._procgen.filterCategWithFunc(RG.TYPE_ITEM, func);
    }

    public dbGetNoRandom(query: IQueryDB): IShell[] {
        const name = query.name;
        const categ = query.categ;
        const danger = query.danger;

        if (categ && this._dbNoRandom[categ]) {
            if (!name) {
                return Object.values(this._dbNoRandom[categ]);
            }
            else {
                const found = this._dbNoRandom[categ][name];
                if (found) {return [found];}
            }
        }
        else if (categ && danger) {
            RG.err('ProcGen', 'dbGetNoRandom',
                'Query by danger not implemented yet');
        }
        return [];
    }

    //----------------------------------------------------------------------
    // RANDOMIZED METHODS for procedural generation
    //----------------------------------------------------------------------

    /* Creates a random actor based on danger value or a filter function.*/
    public createRandomActor(obj: IQueryDB): null | BaseActor {
        const randShell = this._procgen.getRandomActor(obj);
        if (randShell) {
            return this._creator.createFromShell(RG.TYPE_ACTOR, randShell) as BaseActor;
        }
        return null;
    }

    // Uses engine's internal weighting algorithm when given a level number.
    // Note that this method can return null, if no correct danger level is
    // found. You can supply {func: ...} as a fallback solution.
    public createRandomActorWeighted(min, max, obj?: IQueryDB): null | BaseActor {
        const actorShell = this._procgen.getRandomActorWeighted(min, max);
        if (actorShell) {
            return this._creator.createFromShell(RG.TYPE_ACTOR, actorShell) as BaseActor;
        }
        else if (!RG.isNullOrUndef([obj])) {
            return this.createRandomActor(obj!);
        }
        return null;
    }

    /* Creates a random item based on a selection function.
     *
     * Example:
     *  const funcValueSel = function(item) {return item.value >= 100;}
     *  const item = createRandomItem({func: funcValueSel});
     *  // Above returns item with value > 100.
     *  */
    public createRandomItem(obj: IQueryDB | TShellFunc): null | ItemBase {
        const randShell = this._procgen.getRandomItem(obj);
        if (randShell) {
            return this._creator.createFromShell('items', randShell) as ItemBase;
        }
        return null;
    }

    public toJSON(): any {
        const json: any = {
            _base: {},
            _db: {},
            _dbDanger: this._dbDanger,
            _dbNoRandom: this._dbNoRandom
        };
        ['actors', 'items', 'elements'].forEach(prop => {
            json._base[prop] = this._base[prop];
            json._db[prop] = this._db[prop];
        });
        return json;
    }

    /* Restore the parser from an existing DB. For save games mainly. */
    public restoreFromDb(json: any): void {
        // TODO dbByName
        const props = ['_base', '_db', '_dbDanger', '_dbNoRandom'];
        props.forEach(dbName => {
            Object.keys(json[dbName]).forEach(key => {
                this[dbName][key] = json[dbName][key];
            });
        });
    }

}
ObjectShell.Parser = Parser;


export const createItem = function(nameOrShell: string | IShell) {
    const parser = ObjectShell.getParser();
    const creator = parser.getCreator();
    if (typeof nameOrShell === 'string') {
        return creator.createItem(nameOrShell);
    }
    else {
        parser.parseObjShell(RG.TYPE_ITEM, nameOrShell);
        return creator.createFromShell(RG.TYPE_ITEM, nameOrShell);
    }
};

export const getParser = function(): Parser {
    if (!ObjectShell.parserInstance) {
        const parser = new Parser();
        parser.parseShellData(Effects);

        const jsonStr = JSON.stringify(Objects);
        const objectsNew = JSON.parse(jsonStr);
        adjustActorValues(objectsNew.actors);

        parser.parseShellData(objectsNew);
        ObjectShell.parserInstance = parser;

        const randActors = ActorGen.genActors(500);
        // console.log(JSON.stringify(randActors, null, 1));
        parser.parseShellData({actors: randActors});
    }
    return ObjectShell.parserInstance;
};
ObjectShell.getParser = getParser;

export const restoreParser = function(json: any): void {
    const parser = new Parser();
    parser.restoreFromDb(json);
    parser.parseShellData(Effects);
    ObjectShell.parserInstance = parser;
};
ObjectShell.restoreParser = restoreParser;
