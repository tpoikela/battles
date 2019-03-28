
import RG from './rg';
import {Objects} from '../data/battles_objects';
import {ActorsData, adjustActorValues} from '../data/actors';
import * as Actor from './actor';
import * as Item from './item';
import {Effects} from '../data/effects';
import {Brain} from './brain';
// import * as Brain from './brain';
import {Random} from './random';
import {ElementBase} from './element';
import * as Component from './component';
import {Dice} from './dice';
import {Spell} from '../data/spells';
import {Evaluator} from './evaluators';

import {ActorGen} from '../data/actor-gen';

import {IAddCompObj, IShell, StringMap, TShellFunc} from './interfaces';

const RNG = Random.getRNG();
export const ObjectShell: any = {};

type BaseActor = Actor.BaseActor;
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

export interface IShellDbDanger {
    [key: number]: IShellDb;
}

// Used when querying objects from the shell database, using func is preferred
// because it can implement all behaviour the rest are offering
export interface IQueryDB {
    name?: string; // Specific name sought after
    categ?: string; // actors, items, elements
    danger?: number;
    func?: TShellFunc; // Acceptance func for query
}

export const Creator = function(db: IShellDb, dbNoRandom: IShellDb) {
    this._db = db;
    this._dbNoRandom = dbNoRandom;
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
    const _propToCall: any = {
        actors: {
            type: 'setType',
            attack: {comp: 'Combat', func: 'setAttack'},
            defense: {comp: 'Combat', func: 'setDefense'},
            damage: {comp: 'Combat', func: 'setDamageDie'},
            speed: {comp: 'Stats', func: 'setSpeed'},

            strength: {comp: 'Stats', func: 'setStrength'},
            accuracy: {comp: 'Stats', func: 'setAccuracy'},
            agility: {comp: 'Stats', func: 'setAgility'},
            willpower: {comp: 'Stats', func: 'setWillpower'},
            perception: {comp: 'Stats', func: 'setPerception'},
            magic: {comp: 'Stats', func: 'setMagic'},

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
            type: 'setType',
            msg: 'setMsg'
        }
    };

    _propToCall.items.missileweapon = _propToCall.items.weapon;
    _propToCall.items.missileweapon.fireRate = 'setFireRate';
    _propToCall.items.ammo = _propToCall.items.missile;
    _propToCall.items.ammo.ammoType = 'setAmmoType';

    /* Returns an object shell, given category and name.*/
    this.get = (categ: string, name: string): IShell | null => {
        if (this._dbNoRandom[categ][name]) {
            return this._dbNoRandom[categ][name];
        }
        return this._db[categ][name];
    };

    /* Creates a component of specified type.*/
    this.createComponent = (type, val) => {
        switch (type) {
            case 'Combat': return new Component.Combat();
            case 'Experience': return new Component.Experience();
            case 'Health': return new Component.Health(val);
            case 'Stats': return new Component.Stats();
            default:
                if (Component.hasOwnProperty(type)) {
                    return new Component[type]();
                }
                else {
                    RG.err('Creator', 'createComponent',
                        'Component |' + type + '| does not exist.');
                }
        }
        return null;
    };

    /* Returns an actual game object when given category and name. Note that
     * the blueprint must exist already in the database (blueprints must have
     * been parsed before). */
    this.createActualObj = function(categ: string, name: string) {
        const shell = this.get(categ, name);
        const propCalls = _propToCall[categ];
        if (!shell) {
            RG.err('Creator', 'createActualObj',
                `shell for ${name} is not found.`);
        }

        const newObj = this.createNewObject(categ, shell);
        if (!newObj) {
            RG.err('ObjectShell.creator', 'createActualObj',
                `Failed to create obj with ${JSON.stringify(shell)}`);
        }

        // Example: {name: 'bat', addComp: 'Flying'}
        if (shell.hasOwnProperty('addComp')) {
            this.addComponents(shell, newObj);
        }

        // If propToCall table has the same key as shell property, call
        // function in _propToCall using the newly created object.
        for (const p in shell) {

            // Called for basic type: actors, items...
            if (propCalls.hasOwnProperty(p)) {
                const funcName = propCalls[p];
                if (typeof funcName === 'object') {

                    // 1. Add new component to the object
                    if (funcName.hasOwnProperty('comp')) {
                        this.addCompToObj(newObj, funcName, shell[p]);
                    }
                    // 2. Or use factory to create an object and add it to the
                    // object. Only 'brain' supported for now.
                    else if (funcName.hasOwnProperty('factory')) {
                        if (p === 'brain') {
                            const createdObj
                                = funcName.factory(newObj, shell[p]);
                            newObj[funcName.func](createdObj);
                        }
                    }
                    // 3. Or call one of the object's methods with the value in
                    // the object shell
                    else {
                        for (const f in funcName) {
                            if (funcName.hasOwnProperty(f)) {
                                const fName = funcName[f];
                                if (newObj.hasOwnProperty(fName)) {
                                    newObj[fName](shell[p]);
                                }
                            }
                        }
                    }
                }
                else { // 4. For strings, call the setter 'funcName' directly
                    newObj[funcName](shell[p]);
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
                                        newObj[funcName2[f2]](shell[p]);
                                    }
                                }
                            }
                        }
                        else {
                            newObj[funcName2](shell[p]);
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
            this.addInventoryItems(shell, newObj);
        }

        if (shell.hasOwnProperty('loot')) {
            this.addLootComponents(shell, newObj);
        }


        if (shell.hasOwnProperty('poison')) {
            this.addPoison(shell, newObj);
        }

        if (shell.hasOwnProperty('enemies')) {
            this.addEnemies(shell, newObj);
        }

        if (shell.hasOwnProperty('spells')) {
            this.addSpellbookAndSpells(shell, newObj);
        }

        if (shell.hasOwnProperty('onHit')) {
            this.addOnHitProperties(shell, newObj);
        }

        if (shell.hasOwnProperty('onAttackHit')) {
            this.addOnAttackHitProperties(shell, newObj);
        }

        if (shell.hasOwnProperty('onEquip')) {
            this.addOnEquipProperties(shell, newObj);
        }

        if (shell.hasOwnProperty('goals')) {
            this.addGoalsToObject(shell, newObj);
        }

        // TODO map different props to function calls
        return newObj;
    };

    /* Adds Poison as addOnHit property. */
    this.addPoison = (shell: IShell, obj): void => {
        const poison = shell.poison;
        const poisonComp = new Component.Poison();
        poisonComp.setProb(poison.prob);
        poisonComp.setSource(obj);
        poisonComp.setDamageDie(Dice.create(poison.damage));

        const dieDuration = Dice.create(poison.duration);
        poisonComp.setDurationDie(dieDuration);
        const addOnHit = new Component.AddOnHit();
        addOnHit.setComp(poisonComp);
        obj.add(addOnHit);
    };

    /* Adds any component as AddOnHit property. */
    this.addOnHitProperties = (shell: IShell, obj) => {
        shell.onHit.forEach(onHit => {
            this.processAddComp(onHit, obj);
        });
    };

    this.addOnAttackHitProperties = (shell: IShell, obj) => {
        shell.onAttackHit.forEach(onHit => {
            const addOnHitComp = this.processAddComp(onHit, obj);
            addOnHitComp.setOnDamage(false);
            addOnHitComp.setOnAttackHit(true);
        });
    };

    this.addOnEquipProperties = (shell: IShell, newObj) => {
        shell.onEquip.forEach(onEquip => {
            const isEquip = true;
            this.processAddComp(onEquip, newObj, isEquip);
        });
    };

    this.processAddComp = (onHit: IAddCompObj, obj, isEquip = false) => {
        // Create the comp to be returned
        let addOnHit = null;
        if (isEquip) {
            addOnHit = new Component.AddOnEquip();
        }
        else {
            addOnHit = new Component.AddOnHit();
        }

        if (onHit.addComp) {
            const comp = this.createComponent(onHit.addComp);
            if (comp.setSource) {
                if (RG.isActor(obj)) {
                    comp.setSource(obj);
                }
            }

            // Set the values of added component using functions provided in
            // func array
            if (Array.isArray(onHit.func)) {
                onHit.func.forEach(func => {
                    if (typeof comp[func.setter] === 'function') {
                        comp[func.setter](func.value);
                    }
                    else {
                        const str = comp.toJSON();
                        RG.err('ObjectShellParser', 'addOnHitProperties',
                            `Not a func: ${func.setter} in comp ${str}`);
                    }
                });
            }

            // Then create the AddOnHit component and wrap the original
            // component into Duration to make it transient
            const addedComp = comp;

            if (onHit.duration) {
                const durDie = Dice.create(onHit.duration);
                const durComponent = new Component.Duration();
                durComponent.setDurationDie(durDie);
                durComponent.setComp(addedComp);
                addOnHit.setComp(durComponent);

                // Set the message for comp expiration, if any are given
                // in the obj shell
                if (onHit.expireMsg) {
                    durComponent.setExpireMsg(onHit.expireMsg);
                }
            }
            else {
                addOnHit.setComp(addedComp);
            }
            obj.add(addOnHit);
            return addOnHit;
        }
        else if (onHit.transientComp) {
            // If createComp given, use the object as it is without creating
            // a new Component

            addOnHit.setComp(JSON.parse(JSON.stringify(onHit)));
            obj.add(addOnHit);
            return addOnHit;
        }
        return null;
    };


    this.addEnemies = (shell: IShell, obj) => {
        shell.enemies.forEach(enemyType => {
            obj.getBrain().addEnemyType(enemyType);
        });
    };

    /* Creates a spellbook and adds specified spells into it. */
    this.addSpellbookAndSpells = (shell: IShell, obj) => {
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
    };


    this.addGoalsToObject = (shell: IShell, newObj) => {
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
                newObj.getBrain().getGoal().addEvaluator(newEval);
            });
        }
    };

    this.getUsedObject = (strOrObj) => {
        if (typeof strOrObj === 'object') {
            if (strOrObj.random) {
                return RNG.arrayGetRand(strOrObj.random);
            }
        }
        return strOrObj;

    };

    /* Factory-method for creating the actual game objects.*/
    this.createNewObject = (categ, obj) => {
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
    };

    /* Adds a component to the newly created object, or updates existing
     * component if it exists already.*/
    this.addCompToObj = function(newObj, compData, val) {
        if (compData.hasOwnProperty('func')) {

            // This 1st branch is used by Health only (needed?)
            if (Array.isArray(compData.func)) {
                compData.func.forEach(fname => {
                    const compName = compData.comp;
                    if (newObj.has(compName)) {
                        // 1. Call existing comp with setter (fname)
                        if (typeof newObj.get(compName)[fname] === 'function') {
                            newObj.get(compName)[fname](val);
                        }
                        else {
                            this.noFuncError(compName, fname, compData);
                        }
                    }
                    else { // 2. Or create a new component
                        const comp = this.createComponent(compName);
                        if (typeof comp[fname] === 'function') {
                            comp[fname](val); // Then call comp setter
                            newObj.add(comp);
                        }
                        else {
                            this.noFuncError(compName, fname, compData);
                        }
                    }
                });
            }
            else {
                const fname = compData.func;
                const compName = compData.comp;
                if (newObj.has(compName) && typeof fname === 'string') {
                    // 1. Call existing comp with setter (fname)
                    newObj.get(compName)[fname](val);
                }
                else { // 2. Or create a new component
                    const comp = this.createComponent(compName);
                    newObj.add(comp);
                    if (typeof comp[fname] === 'function') {
                        comp[fname](val); // Then call comp setter
                    }
                    else if (typeof fname === 'object') {
                        const funcNames = Object.keys(compData.func);
                        funcNames.forEach(funcName => {
                            const newCompData = {
                                func: funcName,
                                comp: compName
                            };
                            const newVal = compData.func[funcName];
                            this.addCompToObj(newObj, newCompData, newVal);
                        });
                    }
                    else {
                        RG.log(JSON.stringify(fname));
                        RG.err('ObjectShellParser', 'addCompToObj',
                            `No function ${fname} in ${compName}`);
                    }
                }
            }
        }
        else if (newObj.has(compData.comp)) {
            RG.err('ObjectShellParser', 'xxx',
                'Not implemented');
        }
        else {
            newObj.add(this.createComponent(compData.comp, val));
        }
    };

    this.noFuncError = (compName: string, fname: string, compData) => {
        const json = 'compData ' + JSON.stringify(compData);
        RG.err('ObjectShellParser', 'addCompToObj',
           `Comp: ${compName} no func ${fname}, ${json}`);
    };

    /* This function makes a pile of mess if used on non-entities. */
    this.addComponents = (shell: IShell, entity) => {
        if (typeof shell.addComp === 'string') {
            _addCompFromString(shell.addComp, entity);
        }
        else if (Array.isArray(shell.addComp)) {
            shell.addComp.forEach(comp => {
                let usedComp = comp;
                if (comp.random) {
                    usedComp = RNG.arrayGetRand(comp.random);
                }
                if (typeof usedComp === 'string') {
                    _addCompFromString(usedComp, entity);
                }
                else {
                    _addCompFromObj(entity, usedComp);
                }
            });
        }
        else if (typeof shell.addComp === 'object') {
            let usedComp = shell.addComp;
            if (shell.addComp.random) {
                usedComp = RNG.arrayGetRand(shell.addComp.random);
            }
            _addCompFromObj(entity, usedComp);
        }
        else {
            RG.err('Creator', 'addComponents',
                'Giving up. shell.addComp must be string, array or object.');
        }
    };

    const _addCompFromString = (compName, entity) => {
        try {
            const comp = new Component[compName]();
            entity.add(comp);
        }
        catch (e) {
            let msg = `shell.addComp |${compName}|`;
            msg += 'Component names are capitalized.';
            RG.err('Creator', '_addCompFromString',
                `${e.message} - ${msg}`);
        }
    };

    const _addCompFromObj = (entity, compObj) => {
        this.addCompToObj(entity, compObj, null);
    };

    // Adds the inventory items for the actors which are specified with 'inv'
    this.addInventoryItems = function(shell, actor) {
        const inv = shell.inv;
        inv.forEach(item => {
            const name = item.name || item;
            const count = item.count || 1;
            const itemObj = this.createActualObj(RG.TYPE_ITEM, name);
            if (itemObj) {
                itemObj.setCount(count);
                actor.getInvEq().addItem(itemObj);
            }
            else {
                RG.err('Creator', 'addInventoryItems',
                    `itemObj for ${name} is null. Actor: ${actor.getName()}`);
            }
        });
    };

    // Adds the loot component to the Actor object
    this.addLootComponents = function(shell: IShell, actor): void {
        const loot = shell.loot;
        const lootItem = this.createActualObj(RG.TYPE_ITEM, loot);
        const lootComp = new Component.Loot(lootItem);
        actor.add(lootComp);
    };

    /* Adds equipped items given with shell.equip into the actor. */
    this.addEquippedItems = function(shell: IShell, actor): void {
        const equip = shell.equip;
        let needShuffle = false;
        equip.forEach(item => {
            const itemName = item.name || item;
            const count = item.count || 1;
            const itemObj = this.createActualObj(RG.TYPE_ITEM, itemName);
            if (itemObj) {
                itemObj.setCount(count);
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
    };

    /* If shell has 'use', this adds specific use effect to the item.*/
    this.addUseEffects = (shell: IShell, newObj): void => {
        newObj.useFuncs = [];
        newObj.useItem = this._db.effects.use.func.bind(newObj);
        if (typeof shell.use === 'object'
            && shell.use.hasOwnProperty('length')) {
            for (let i = 0; i < shell.use.length; i++) {
                _addUseEffectToItem(shell, newObj, shell.use[i]);
            }
        }
        else if (typeof shell.use === 'object') {
            for (const p in shell.use) {
                if (shell.use.hasOwnProperty(p)) {
                    _addUseEffectToItem(shell, newObj, p);
                }
            }
        }
        else {
            _addUseEffectToItem(shell, newObj, shell.use);
        }
    };

    const _addUseEffectToItem = (shell: IShell, item, useName) => {
        const useFuncName = useName;
        if (this._db.effects.hasOwnProperty(useFuncName)) {
            const useEffectShell = this._db.effects[useFuncName];
            const useFuncVar = useEffectShell.func;
            item.useFuncs.push(useFuncVar);

            if (useEffectShell.hasOwnProperty('requires')) {
                if (shell.use.hasOwnProperty(useName)) {
                    item.useArgs = {};
                    const reqs = useEffectShell.requires;
                    if (typeof reqs === 'object') {
                        for (let i = 0; i < reqs.length; i++) {
                            _verifyAndAddReq(shell.use[useName], item, reqs[i]);
                        }
                    }
                    else {
                        _verifyAndAddReq(shell.use[useName], item, reqs);
                    }
                }
                else {
                    RG.err('ObjectParser', 'addUseEffects',
                        `useEffect shell has 'requires'.
                        Item shell 'use' must be an object.`
                    );
                }
            }
            if (useEffectShell.hasOwnProperty('optional')) {
                const opts = useEffectShell.optional;
                opts.forEach(option => {
                    if (shell.use[useName].hasOwnProperty(option)) {
                        item.useArgs[option] = shell.use[useName][option];
                    }
                });
            }
        }
        else {
            RG.err('ObjectParser', 'addUseEffects',
                'Unknown effect: |' + useFuncName + '|');
        }
    };

    /* Verifies that the shell has all requirements, and adds them to the
     * object, into useArgs.reqName. */
    const _verifyAndAddReq = (obj, item, reqName) => {
        if (obj.hasOwnProperty(reqName)) {
            item.useArgs[reqName] = obj[reqName];
        }
        else {
            RG.err('ObjectParser', '_verifyAndAddReq',
                `Req |${reqName}| not specified in item shell. Item: ${item}`);
        }
    };

    /* Creates actual game object from obj shell in given category.*/
    this.createFromShell = function(categ: string, obj: IShell) {
        if (obj) {
            return this.createActualObj(categ, obj.name);
        }
        else {
            RG.err('Creator', 'createFromShell',
                'obj given must be defined.');
        }
        return null;
    };

};
ObjectShell.Creator = Creator;

Creator.prototype.createBrain = function(actor, brainName: string): void {
    if (Brain[brainName]) {
        return new Brain[brainName](actor);
    }
    const msg = `ERROR. No brain type |${brainName}| found`;
    RG.err('Creator', 'createBrain', msg);
};


/* Object handling the procedural generation. It has an object "database" and
 * objects can be pulled randomly from it. */
export const ProcGen = function(db, dbDanger, dbByName) {
    this._db = db;
    this._dbDanger = dbDanger;
    this._dbByName = dbByName;

    // Internal cache for proc generation
    const _cache = {
        actorWeights: {}
    };

    /* Returns entries from db based on the query. Returns null if nothing
     * matches.*/
    this.dbGet = (query: IQueryDB): IShell[] | StringMap<IShell> => {
        const name = query.name;
        const categ = query.categ;
        const danger = query.danger;

        // Specifying name returns an array
        if (!RG.isNullOrUndef([name])) {
            if (this._dbByName.hasOwnProperty(name)) {
                return this._dbByName[name];
            }
            else {return [];}
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

    };

    /* Filters given category with a function. Func gets each object as arg,
     * and must return either true or false. Function can be for example:
     *   1.func(obj) {if (obj.name === 'wolf') return true;} Or
     *   2.func(obj) {if (obj.hp > 25) return true;}.
     *   And it can be as complex as needed of course.
     * */
    this.filterCategWithFunc = function(categ, func: TShellFunc): IShell[] {
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
    };

    //---------------------------------------------------
    // RANDOMIZED METHODS for procedural generation
    //---------------------------------------------------

    /* Returns random object from the db. For example, {categ: "actors",
     * danger: 2}
     * returns a random actors with these constrains.
     * Ex2: {danger: 3, num:1}
     * returns randomly one entry which has danger 3.*/
    this.dbGetRand = function(query: IQueryDB) {
        const danger = query.danger;
        const categ = query.categ;
        if (typeof danger !== 'undefined') {
            if (typeof categ !== 'undefined') {
                if (this._dbDanger.hasOwnProperty(danger)) {
                    const entries = this._dbDanger[danger][categ];
                    return this.getRandFromObj(entries);
                }
            }
        }
        return null;
    };


    /* Creates a random actor based on danger value or a filter function.*/
    this.getRandomActor = function(obj: IQueryDB) {
        if (obj.hasOwnProperty('danger')) {
            const danger = obj.danger;
            const randShell = this.dbGetRand({danger, categ: RG.TYPE_ACTOR});
            if (randShell !== null) {
                return randShell;
            }
        }
        else if (obj.hasOwnProperty('func')) {
            const res = this.filterCategWithFunc( RG.TYPE_ACTOR, obj.func);
            return RNG.arrayGetRand(res);
        }
        return null;
    };

    /* Returns a random item based on a selection function.
     *
     * Example:
     *  const funcValueSel = function(item) {return item.value >= 100;}
     *  const item = createRandomItem({func: funcValueSel});
     *  // Above returns item with value > 100.
     */
    this.getRandomItem = function(obj: IQueryDB | TShellFunc) {
        if (typeof obj === 'function') {
            const res = this.filterCategWithFunc(RG.TYPE_ITEM, obj);
            return RNG.arrayGetRand(res);
        }
        else if (obj.hasOwnProperty('func')) {
            const res = this.filterCategWithFunc(RG.TYPE_ITEM, (obj as IShell).func);
            return RNG.arrayGetRand(res);
        }
        else {
            RG.err('ProcGen', 'getRandomItem',
                `No function with func. obj arg: ${JSON.stringify(obj)}`);
        }
        return null;
    };

    // Uses engine's internal weighting algorithm when given a level number.
    // Note that this method can return null, if no correct danger level is
    // found. You can supply {func: ...} as a fallback solution.
    this.getRandomActorWeighted = function(min, max) {
        const key = min + ',' + max;
        if (!_cache.actorWeights.hasOwnProperty(key)) {
            _cache.actorWeights[key] = RG.getDangerProb(min, max);
        }
        const danger = RNG.getWeighted(_cache.actorWeights[key]);
        const actor = this.getRandomActor({danger});
        return actor;
    };

    /* Returns a property from an object, selected randomly. For example,
     * given object {a: 1, b: 2, c: 3}, may return 1,2 or 3 with equal
     * probability.*/
    this.getRandFromObj = obj => {
        const keys = Object.keys(obj);
        const randIndex = RNG.randIndex(keys);
        return obj[keys[randIndex]];
    };
};
ObjectShell.ProcGen = ProcGen;

/* Object parser for reading game data. Game data is contained within shell
 * objects which are simply object literals without functions etc. */
export const Parser = function() {

    // NOTE: 'SHELL' means vanilla JS object, which has not been
    // created with new:
    //      SHELL:   const rat = {name: "Rat", type: "animal"};
    //      OBJECT: const ratObj = new RG.Actor.Rogue("rat");
    //              ratObj.setType("animal");
    //
    // Shells are used in external data file to describe game objects in a more
    // concise way. Game objects are created from shells by this object.

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
    this._dbByName = {} as StringMap<IShell>; // All entries indexed by name

    this._dbNoRandom = {
        actors: {},
        items: {},
        elements: {}
    } as IShellDb; // All entries excluded from random generation

    this._creator = new Creator(this._db, this._dbNoRandom);
    this._procgen = new ProcGen(this._db, this._dbDanger,
        this._dbByName);

    this.getCreator = function() {
        return this._creator;
    };

    this.getProcGen = function() {
        return this._procgen;
    };
    //-----------------------------------------------------------------------
    // "PARSING" METHODS
    //-----------------------------------------------------------------------

    /* Parses all shell data, items, monsters, level etc.*/
    this.parseShellData = function(obj: IShellInputData): void {
        const keys = Object.keys(obj);
        for (let i = 0; i < keys.length; i++) {
            this.parseShellCateg(keys[i], obj[keys[i]]);
        }
    };

    /* Parses one specific shell category, ie items or monsters.*/
    this.parseShellCateg = function(categ: string, objsArray: IShell[]): void {
        for (let i = 0; i < objsArray.length; i++) {
            this.parseObjShell(categ, objsArray[i]);
        }
    };

    /* Parses an object shell. Returns null for invalid objects, and
     * corresponding object for actual actors. If 'base' property exists,
     * all base properties will be added to the returned object.
     * */
    this.parseObjShell = function(categ: string, obj: IShell): IShell {
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
    };

    /* Checks that the object shell given is correctly formed.*/
    this.validShellGiven = (obj: IShell): boolean => {
        if (!obj.hasOwnProperty('name')) {
            RG.err('Parser', 'validShellGiven',
                `shell doesn't have a name. shell: ${JSON.stringify(obj)}`);
            return false;
        }
        return true;
    };

    /* If an object doesn't have type, the name is chosen as its type.*/
    this.addTypeIfUntyped = (obj: IShell): void => {
        if (!obj.hasOwnProperty('type')) {
            obj.type = obj.name;
        }
    };

    /* Returns an object shell, given category and name.*/
    this.get = (categ: string, name: string): IShell => this._db[categ][name];

    /* Return specified base shell.*/
    this.getBase = (categ: string, name: string): IShell => this._base[categ][name];

    /* All shells can be used as base, not only ones with
     * 'dontCreate: true' */
    this.storeForUsingAsBase = (categ: string, obj: IShell): void => {
        this._base[categ][obj.name] = obj;
    };

    /* Stores the object into given category.*/
    this.storeIntoDb = function(categ: string, obj: IShell): void {
        if (this._db.hasOwnProperty(categ)) {
            this.storeForUsingAsBase(categ, obj);

            if (obj.hasOwnProperty('noRandom')) {
                this._dbNoRandom[categ][obj.name] = obj;
            }
            else if (!obj.hasOwnProperty('dontCreate')) {
                if (this._dbByName.hasOwnProperty(obj.name)) {
                    this._dbByName[obj.name].push(obj);
                }
                else {
                    const newArr = [];
                    newArr.push(obj);
                    this._dbByName[obj.name] = newArr;
                }

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
        this.storeRenderingInfo(categ, obj);
    };

    /* Stores char/CSS className for the object for rendering purposes.*/
    this.storeRenderingInfo = (categ, obj) => {
        if (obj.hasOwnProperty('color')) {
            if (RG.isNullOrUndef([obj.color])) {
                const json = JSON.stringify(obj);
                RG.err('Parser', 'storeRenderingInfo',
                    `obj.color null/undef! obj: ${json}`);
            }
            let {fg, bg} = obj.color;

            if (obj.hasOwnProperty('colorfg')) {
                fg = obj.colorfg;
            }
            if (obj.hasOwnProperty('colorbg')) {
                bg = obj.colorbg;
            }
            if (!fg || !bg) {
                const json = JSON.stringify(obj.color);
                RG.err('Parser', 'storeRenderingInfo',
                    `fg and bg must be given. ${obj.name} Got: ${json}`);
            }
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
    };

    /* Returns true if shell base exists.*/
    this.baseExists = (categ: string, baseName: string): boolean => {
        if (this._base.hasOwnProperty(categ)) {
            return this._base[categ].hasOwnProperty(baseName);
        }
        return false;
    };

    /* Extends the given object shell with a given base shell.*/
    this.extendObj = (obj: IShell, baseObj: IShell): IShell => {
        for (const prop in baseObj) {
            if (!obj.hasOwnProperty(prop)) {
                if (prop !== 'dontCreate') {
                    obj[prop] = baseObj[prop];
                }
            }
        }
        return obj;
    };


    //---------------------------------------------------------------
    // CREATE METHODS (to be removed, but kept now because removing
    //   these would break the API in major way)
    //---------------------------------------------------------------

    this.createEntity = function(name) {
        if (this.hasObj(RG.TYPE_ITEM, name)) {
            return this.createItem(name);
        }
        else if (this.hasObj(RG.TYPE_ACTOR, name)) {
            return this.createActor(name);
        }
        return null;
    };

    this.createActor = function(name: string): BaseActor {
        return this.createActualObj(RG.TYPE_ACTOR, name);
    };

    this.createItem = function(name: string): ItemBase {
        return this.createActualObj(RG.TYPE_ITEM, name);
    };

    this.createElement = function(name: string) {
        return this.createActualObj(RG.TYPE_ELEM, name);
    };

    this.hasItem = function(name: string) {
        return this.hasObj(RG.TYPE_ITEM, name);
    };

    this.hasObj = function(categ: string, name: string): boolean {
        return this.dbExists(categ, name);
    };

    /* Returns an actual game object when given category and name. Note that
     * the shell must exist already in the database (shell must have
     * been parser before). */
    this.createActualObj = function(categ: string, name: string) {
        if (!this.dbExists(categ, name)) {
            RG.err('Parser', 'createActualObj',
                `Categ: ${categ} Name: ${name} doesn't exist.`);
            return null;
        }
        return this._creator.createActualObj(categ, name);
    };

    /* Creates actual game object from obj shell in given category.*/
    this.createFromShell = (categ, obj) => {
        if (!this.dbExists(categ, obj.name)) {
            this.parseObjShell(categ, obj);
        }
        return this._creator.createFromShell(categ, obj);
    };

    //--------------------------------------------------------------------
    // Query methods for object shells
    //--------------------------------------------------------------------

    this.dbExists = (categ, name) => {
        if (this._db.hasOwnProperty(categ)) {
            if (this._db[categ].hasOwnProperty(name)) {
                return true;
            }
        }
        if (this._dbNoRandom[categ][name]) {
            return true;
        }
        return false;
    };

    /* Returns entries from db based on the query. Returns null if nothing
     * matches.*/
    this.dbGet = (query: IQueryDB) => this._procgen.dbGet(query);

    this.dbGetRand = (query: IQueryDB) => this._procgen.dbGetRand(query);

    this.filter = function(categ, func) {
        return this._procgen.filterCategWithFunc(categ, func);
    };

    this.filterItems = function(func) {
        return this._procgen.filterCategWithFunc(RG.TYPE_ITEM, func);
    };

    this.dbGetNoRandom = (query: IQueryDB): IShell[] => {
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
    };

    //----------------------------------------------------------------------
    // RANDOMIZED METHODS for procedural generation
    //----------------------------------------------------------------------

    /* Creates a random actor based on danger value or a filter function.*/
    this.createRandomActor = obj => {
        const randShell = this._procgen.getRandomActor(obj);
        if (randShell) {
            return this._creator.createFromShell(RG.TYPE_ACTOR, randShell);
        }
        return null;
    };

    // Uses engine's internal weighting algorithm when given a level number.
    // Note that this method can return null, if no correct danger level is
    // found. You can supply {func: ...} as a fallback solution.
    this.createRandomActorWeighted = function(min, max, obj) {
        const actorShell = this._procgen.getRandomActorWeighted(min, max);
        if (actorShell) {
            return this._creator.createFromShell(RG.TYPE_ACTOR, actorShell);
        }
        else if (!RG.isNullOrUndef([obj])) {
            return this.createRandomActor(obj);
        }
        return null;
    };

    /* Creates a random item based on a selection function.
     *
     * Example:
     *  const funcValueSel = function(item) {return item.value >= 100;}
     *  const item = createRandomItem({func: funcValueSel});
     *  // Above returns item with value > 100.
     *  */
    this.createRandomItem = (obj: IQueryDB | TShellFunc) => {
        const randShell = this._procgen.getRandomItem(obj);
        if (randShell) {
            return this._creator.createFromShell('items', randShell);
        }
        return null;
    };

    this.toJSON = function(): any {
        return {
            db: this._db
        };
    };

};
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

export const getParser = function() {
    if (!ObjectShell.parserInstance) {
        const parser = new Parser();
        parser.parseShellData(Effects);

        const jsonStr = JSON.stringify(Objects);
        const objectsNew = JSON.parse(jsonStr);
        adjustActorValues(objectsNew.actors);

        parser.parseShellData(objectsNew);
        ObjectShell.parserInstance = parser;

        const randActors = ActorGen.genActors(100);
        parser.parseShellData({actors: randActors});
    }
    return ObjectShell.parserInstance;
};
ObjectShell.getParser = getParser;
