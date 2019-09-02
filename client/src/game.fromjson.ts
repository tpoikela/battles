
import dbg = require('debug');
const debug = dbg('bitn:Game.FromJSON');

import RG from './rg';
import {OWMap} from './overworld.map';
import {Battle, BattleJSON, Army, ArmyJSON} from './game.battle';
import {GoalsTop} from './goals-top';
import {Evaluator} from './evaluators';
import {EvaluatorsBattle} from './evaluators-battle';
import {GameObject} from './game-object';
import {QuestData} from './quest';
import {WorldFromJSON} from './world.fromjson';
import {Level} from './level';
import {ActorClass} from './actor-class';
import {EventPool} from '../src/eventpool';
import {Dice} from './dice';
import {Spell} from './spell';
import {ELEM_MAP} from '../data/elem-constants';
import {ObjectShell} from './objectshellparser';
import {Component} from './component';
import {Item} from './item';
import {Actor} from './actor';
import {CellMap} from './map';
import * as Element from './element';
import {FactoryWorld} from './factory.world';
import * as World from './world';
import {Random} from './random';
import {OverWorld} from './overworld';
import * as Time from './time';
import {WorldSimulation} from './world.simulation';

import {Brain} from './brain';
import {BrainPlayer} from './brain/brain.player';
import {BrainSpawner} from './brain/brain.virtual';
import {MessageHandler} from './message-handler';
import {JsonMap} from './interfaces';

type IAreaTileJSON = World.IAreaTileJSON;
type Stairs = Element.ElementStairs;
type ElementBase = Element.ElementBase;
type Entity = import('./entity').Entity;
type ConnectionObj = Element.ConnectionObj;

const POOL = EventPool.getPool();
const SentientActor = Actor.Sentient;

Brain.Player = BrainPlayer;
Brain.Spawner = BrainSpawner;

const OBJ_REF_REMOVED = Symbol();
const OBJ_REF_NOT_FOUND = null;

/* Object for converting serialized JSON objects to game objects. Note that all
 * actor/level ID info is stored between uses. If you call restoreLevel() two
 * times, all data from 1st is preserved. Call reset() to clear data. */
export const FromJSON = function() {

    this._dungeonLevel = 1;
    this._parser = ObjectShell.getParser();

    // Lookup table for mapping level ID to Map.Level object
    this.id2level = {};
    this.id2entity = {};
    this.id2EntityJson = {};
    this.id2Object = {};
    this.id2Place = {};

    this.actorsKilled = {};

    // For restoring component refs
    this.id2Component = {};
    this.id2CompJSON = {};

    // Stores comps which needs reference restoring
    this.compsWithMissingRefs = {};

    // Stores connection information for stairs
    this.stairsInfo = {} as {[key: string]: ConnectionObj};

    this.IND = 0; // For debug msg indenting

}; // FromJSON

//--------------------------
// SMALL UTILITY FUNCTIONS
//--------------------------

/* Resets internal data of this object. */
FromJSON.prototype.reset = function() {
    this.id2level = {};
    this.id2entity = {};
    this.id2EntityJson = {};
    this.id2Object = {};
    this.id2Component = {};
    this.id2CompJSON = {};
    this.id2Place = {};

    this.stairsInfo = {};
    this.compsWithMissingRefs = {};
};

FromJSON.prototype.setChunkMode = function(enable: boolean): void {
    this.chunkMode = enable;
};

FromJSON.prototype.getDungeonLevel = function(): number {
    return this._dungeonLevel;
};

FromJSON.prototype.addObjRef = function(type, obj, json): void {
    const id = obj.getID();
    if (!Number.isInteger(id)) {
        RG.err('FromJSON', 'addObjRef',
            `ID must be integer. Got: |${id}|`);
    }
    this.id2entity[id] = obj;
    this.id2Object[id] = obj;
    if (json) {
        this.id2EntityJson[id] = json;
    }

    if (type === 'level') {
        this.id2level[id] = obj;
        this.id2Place[id] = obj;
    }
    else if (type === 'element') {
        // Nothing to do
    }
    else if (type === 'entity') {
        // Nothing to do
    }
    else {
        RG.err('FromJSON', 'addObjRef',
            `Unsupported type ${type} give`);
    }
};

/* Returns an object of requested type. Called should check if OBJ_REF_REMOVED
 * is returned. Then it's up to called to decide what to do, but the object
 * cannot be retrieved. */
FromJSON.prototype.getObjByRef = function(requestObj) {
    let objRef = null;
    if (requestObj.$objRef) {objRef = requestObj.$objRef;}
    else {objRef = requestObj;}

    if (objRef.type === 'entity') {
        const ent = this.id2entity[objRef.id];
        if (!ent) {
            if (!this.actorsKilled[objRef.id]) {
                RG.err('FromJSON', 'getObjRef',
                    `No ID ${objRef.id} found`);
            }
            else {
                return OBJ_REF_REMOVED;
            }
        }
        return ent;
    }
    else if (objRef.type === 'level') {
        return this.id2level[objRef.id];
    }
    else if (objRef.type === 'object') {
        return this.id2Object[objRef.id];
    }
    else if (objRef.type === 'component') {
        return this.id2Component[objRef.id];
    }
    else if (objRef.type === 'place') {
        return this.id2Place[objRef.id];
    }
    return OBJ_REF_NOT_FOUND;
};

//--------------------------
// MAIN API
//--------------------------

/* Main function to call when restoring a game. When given Game.Main in
 * serialized JSON, returns the restored Game.Main object. */
FromJSON.prototype.createGame = function(game, gameJSON) {
    if (typeof gameJSON === 'string') {
        RG.err('Game.FromJSON', 'createGame',
            'An object must be given instead of string');
    }
    this.dbg('createGame: Restoring now full game');
    this.IND = 1;

    this.setGlobalConfAndObjects(game, gameJSON);
    if (gameJSON.chunkManager) {
        this.setChunkMode(true);
    }

    Component.setIDCount(gameJSON.lastComponentID);
    // Component.idCount = gameJSON.lastComponentID;

    const allLevels: Level[] = [];
    const levelsToRestore = this.getLevelsToRestore(gameJSON);

    // Levels must be created before the actual world, because the World
    // object contains only level IDs
    levelsToRestore.forEach(levelJson => {
        const level = this.restoreLevel(levelJson);
        allLevels.push(level);
        if (!levelJson.parent) {
            this.dbg('>> No parent. Adding directly ' + level.getID());
            game.addLevel(level);
        }
    });

    if (gameJSON.places) {
        Object.keys(gameJSON.places).forEach(name => {
            const place = gameJSON.places[name];
            const placeObj = this.restorePlace(place);
            game.addPlace(placeObj);
        });
    }

    if (gameJSON.overworld) {
        const overworld = this.restoreOverWorld(gameJSON.overworld);
        game.setOverWorld(overworld);
    }

    if (gameJSON.worldSim) {
        game.setWorldSim(this.restoreWorldSim(gameJSON.worldSim));
    }

    // Connect levels using this.id2level + this.stairsInfo
    this.connectGameLevels(allLevels);

    // Player created separately from other actors for now
    if (gameJSON.player) {
        const player = this.restorePlayer(gameJSON.player);
        this.addRestoredPlayerToGame(player, game, gameJSON);
    }

    // Entity data cannot be restored earlier because not all object refs
    // exist when entities are created
    this.restoreEntityData();

    // Must be called after all entity components are created, this will mainly
    // fill missing component refs in other components
    this.restoreComponentData();

    const gameMaster = this.restoreGameMaster(game, gameJSON.gameMaster);
    game.setGameMaster(gameMaster);
    this.restoreChunkManager(game, gameJSON);

    this.checkNumOfLevels(game, gameJSON);

    // Restore the ID counters for levels and entities, otherwise duplicate
    // IDs will appear when new levels/entities are created
    GameObject.ID = gameJSON.gameObjectID;

    if (debug.enabled) {
        this.dbg(`Restored GameObject ID count to ${GameObject.ID}`);
    }

    if (gameJSON.rng) {
        const rng = new Random(gameJSON.rng.seed);
        rng.setState(gameJSON.rng.state);
        game.setRNG(rng);
    }
    if (gameJSON.diceRng) {
        const diceRng = new Random(gameJSON.diceRng.seed);
        diceRng.setState(gameJSON.diceRng.state);
        Dice.RNG = diceRng;
    }

    this.IND = 0;
    return game;
};

/* Handles creation of restored player from JSON.*/
FromJSON.prototype.restorePlayer = function(json) {
    const player = new SentientActor(json.name);
    player.setIsPlayer(true);
    // TODO hack for now, these are restored later
    player.remove('StatsMods');
    player.remove('CombatMods');

    player.setType(json.type);
    player.setID(json.id);
    // this.id2entity[json.id] = player;
    // this.addEntityInfo(player, json);
    this._dungeonLevel = json.dungeonLevel;
    this.addObjRef('entity', player, json);

    RG.addCellStyle(RG.TYPE_ACTOR, json.name, 'cell-actor-player');
    // this._addEntityFeatures(json, player);
    // this.restorePlayerBrain(player, json.brain);
    return player;
};


FromJSON.prototype.restorePlayerBrain = function(player, brainJSON) {
    const brain = player.getBrain();
    const memory = brain.getMemory();
    const memJSON = brainJSON.memory;
    Object.keys(memJSON).forEach(setter => {
        memory[setter](memJSON[setter]);
    });
    if (brainJSON.markList) {
        brain._markList.fromJSON(brainJSON.markList);
    }
};


FromJSON.prototype.addRestoredPlayerToGame = function(player, game, json) {
    this._addRegenEvents(game, player);
    const id = json.player.levelID;
    const level = game.getLevels().find(item => item.getID() === id);
    if (level) {
        const x = json.player.x;
        const y = json.player.y;
        level.addActor(player, x, y);
        game.addPlayer(player);
    }
    else {
        const levelIDs = game.getLevels().map(l => l.getID());
        const msg = `IDs available: ${levelIDs}`;
        RG.err('Game.FromJSON', 'addRestoredPlayerToGame',
            `Cannot find player level object with level ID ${id}. ${msg}`);
    }
};

/* Restores all data for already created entity. */
FromJSON.prototype.restoreEntity = function(json, entity) {
    if (RG.isActor(entity)) {
        this.createBrain(json.brain, entity);
        this._addEntityFeatures(json, entity);
    }
    else if (RG.isElement(entity)) {
        this.restoreElementEntity(json, entity);
    }
    else {
        this.restoreLevelEntity(json, entity);
    }
    return entity;
};

FromJSON.prototype._addEntityFeatures = function(obj, entity) {
    this.addCompsToEntity(entity, obj.components);
    this.createInventoryItems(obj, entity);
    this.createEquippedItems(obj, entity);
    /* if (obj.fovRange) {
        entity.setFOVRange(obj.fovRange);
    }*/
    if (obj.spellbook) {
        this.createSpells(obj, entity);
    }
};

FromJSON.prototype.restoreElementEntity = function(json, entity) {
    if (entity.getType() === 'lever') {
        json.addTarget.forEach(objRef => {
            const entRef = objRef.$objRef;
            const doorEntity = this.id2entity[entRef.id];
            if (doorEntity) {
                entity.addTarget(doorEntity);
            }
        });
    }
};

FromJSON.prototype.restoreLevelEntity = function(json, entity) {
    this.addCompsToEntity(entity, json.components);
};

/* Adds given components into Entity object. */
FromJSON.prototype.addCompsToEntity = function(ent: Entity, comps) {
    for (const id in comps) {
        if (id) {
            const compJSON = comps[id];
            const name = compJSON.setType;
            if (!name) {
                const msg = 'No "setType" in component: ';
                RG.err('Game.FromJSON', 'addCompsToEntity',
                    msg + JSON.stringify(compJSON));

            }
            const newCompObj = this.createComponent(name, compJSON);
            ent.add(newCompObj);
        }
    }
};

/* Creates the component with given name. */
FromJSON.prototype.createComponent = function(name, compJSON) {
    if (!Component.hasOwnProperty(name)) {
        let msg = `No |${name}| in Component.`;
        msg += ` compJSON: ${JSON.stringify(compJSON)}`;
        RG.err('Game.FromJSON', 'createComponent', msg);
    }
    // TODO remove error check, change to Component.create(name)
    // const newCompObj = new Component[name]();
    const newCompObj = Component.create(name);
    for (const setFunc in compJSON) {
        if (typeof newCompObj[setFunc] === 'function') {
            const valueToSet = compJSON[setFunc];
            const value = this.getCompValue(newCompObj,
                compJSON, setFunc, valueToSet);
            newCompObj[setFunc](value);
        }
        else {
            const json = JSON.stringify(compJSON);
            RG.err('FromJSON', 'createComponent',
                `${setFunc} not function in ${name}. Comp: ${json}`);

        }
    }
    const id = newCompObj.getID();
    this.id2Component[id] = newCompObj;
    this.id2CompJSON[id] = compJSON;
    return newCompObj;
};

// valueToSet can be any of following:
//   1. Create function of defined in Game.FromJSON
//     - Call function then sets the result of func call
//     - Function is called with valueToSet.value
//   2. Sub-component given with createComp
//     - Need to call createComponent recursively
//   3. Can be an objRef
//   4. Can be scalar/object literal which is set with setFunc
FromJSON.prototype.getCompValue = function(
    comp, compJSON, setFunc, valueToSet
) {
    if (!RG.isNullOrUndef([valueToSet])) {
        if (Array.isArray(valueToSet)) {
            // For array, call this function recursively
            if ((valueToSet as any).$objRefArray) {
                this.compsWithMissingRefs[compJSON.setID] = comp;
                return valueToSet;
            }
            const newArray = [];
            valueToSet.forEach(value => {
                const val = this.getCompValue(comp, compJSON, setFunc, value);
                newArray.push(val);
            });
            return newArray;
        }
        else if (valueToSet.createFunc) {
            const createdObj =
                this[valueToSet.createFunc](valueToSet.value);
            return createdObj;
        }
        else if (valueToSet.createComp) {
            const compType = valueToSet.createComp.setType;
            // Danger of infinite recursion
            const newSubComp = this.createComponent(compType,
                valueToSet.createComp);
            return newSubComp;
        }
        else if (valueToSet.$objRef) {
            if (valueToSet.$objRef.type !== 'component') {
                const objToSet = this.getObjByRef(valueToSet.$objRef);
                if (objToSet) {
                    return objToSet;
                }
                else {
                    const refJson = JSON.stringify(valueToSet.$objRef);
                    let msg = `Null obj for objRef ${refJson}`;
                    msg += ` compJSON: ${JSON.stringify(compJSON)}`;
                    RG.err('FromJSON', 'getCompValue', msg);
                }
            }
            else {
                this.compsWithMissingRefs[compJSON.setID] = comp;
                return valueToSet;
            }
        }
        else {
            return valueToSet;
        }
    }
    else {
        const jsonStr = JSON.stringify(compJSON);
        let msg = `valueToSet |${valueToSet}|. setFunc |${setFunc}|`;
        msg += `Comp |${compJSON.setType}|, json: ${jsonStr}`;
        RG.err('FromJSON', 'addCompsToEntity', msg);
    }
    return null; // Getting here means serious error
};

FromJSON.prototype.createActorClass = function(args) {
    const {className, actorRef} = args;
    const actor = this.getObjByRef(actorRef);
    if (actor) {
        return ActorClass.create(className, actor);
    }
    RG.err('FromJSON', 'createActorClass',
        `No actor for class ${className} found`);
    return null;
};

FromJSON.prototype.createQuestData = function(json) {
    const questData = new QuestData();
    json.path.forEach(pathData => {
        let target = null;
        if (pathData.target.$objRef) {
            target = this.getObjByRef(pathData.target.$objRef);
        }
        else {
            target = pathData.target;
        }
        if (target === OBJ_REF_REMOVED) {
            target = {msg: 'Quest target missing/killed'};
            // quest is nullified
        }
        else if (!target) {
            const msg = `Missing objRef: ${JSON.stringify(pathData.target)}`;
            RG.err('FromJSON', 'createQuest', msg);
        }
        questData.addTarget(pathData.type, target);
    });
    return questData;
};

FromJSON.prototype.createBrain = function(brainJSON, ent) {
    const type = brainJSON.type;
    if (Brain[type]) {
        const brainObj = new Brain[type](ent);
        ent.setBrain(brainObj);
        if (type === 'Player') {
            this.restorePlayerBrain(ent, brainJSON);
            return;
        }

        if (brainJSON.constraint) {
            brainObj.setConstraint(brainJSON.constraint);
        }
        if (brainJSON.placeConstraint) {
            brainObj.setPlaceConstraint(brainJSON.constraint);
        }
        if (brainJSON.spawnProb) {
            brainObj.spawnProb = brainJSON.spawnProb;
        }

        // Create the memory (if any)
        const memObj = brainObj.getMemory();
        const memJSON = brainJSON.memory;
        if (memJSON) {
            memJSON.enemyTypes.forEach(enemyType => {
                brainObj.addEnemyType(enemyType);
            });

            if (memJSON.lastAttackedID) {
                const entity = this.id2entity[memJSON.lastAttackedID];
                memObj.setLastAttacked(entity);
            }

            if (memJSON.enemies) {
                memJSON.enemies.forEach(enemyID => {
                    const enemy = this.id2entity[enemyID];
                    if (enemy) {
                        memObj.addEnemy(enemy);
                    }
                });
            }
            if (memJSON.friends) {
                memJSON.friends.forEach(friendID => {
                    const friend = this.id2entity[friendID];
                    if (friend) {
                        memObj.addFriend(friend);
                    }
                });
            }
            if (memJSON.seen) {
                memObj._actors.seen = memJSON.seen;
            }

            if (brainJSON.goal) {
                const goal = this.createTopGoal(brainJSON.goal, ent);
                brainObj.setGoal(goal);
            }
        }
        else if (type === 'Rogue') {
            brainObj.getMemory().addEnemyType('player');
        }
    }
    else {
        RG.err('FromJSON', 'createBrain',
            `Cannot find Brain.${type}, JSON: ${brainJSON}`);
    }
};


FromJSON.prototype.createTopGoal = function(json, entity) {
    const goal = new GoalsTop[json.type](entity);
    goal.removeEvaluators();
    json.evaluators.forEach(ev => {
        let evaluator = null;
        if (Evaluator[ev.type]) {
            evaluator = new Evaluator[ev.type](ev.bias);
        }
        else if (EvaluatorsBattle[ev.type]) {
            evaluator = new EvaluatorsBattle[ev.type](ev.bias);
        }
        else {
            const msg = `Entity: ${JSON.stringify(entity)}`;
            RG.err('FromJSON', 'createTopGoal',
                `Evaluator ${ev.type} not found. ${msg}`);
        }
        if (ev.args) {evaluator.setArgs(ev.args);}
        goal.addEvaluator(evaluator);
    });
    return goal;
};

FromJSON.prototype.createSpells = function(json, entity) {
    entity._spellbook = new Spell.SpellBook(entity);
    json.spellbook.spells.forEach(spell => {
        if (Spell.hasOwnProperty(spell.new)) {
            const spellObj = this.restoreSpell(spell, entity);
            entity._spellbook.addSpell(spellObj);
        }
        else {
            RG.err('FromJSON', 'createSpells',
                `No spell ${spell.new} found in Spell`);
        }
    });
    return entity._spellbook;
};

/* Restores a single spell for the entity. If called on multi-spell,
 * calls itself recursively to create sub-spells. */
FromJSON.prototype.restoreSpell = function(spell, entity) {
    const spellObj = new Spell[spell.new]();
    spellObj.setPower(spell.power);
    if (spell.range) {
        spellObj.setRange(spell.range);
    }
    // If spell has damage/duration etc dice, restore them
    if (spell.dice) {
        const dice = {};
        Object.keys(spell.dice).forEach(key => {
            const die = spell.dice[key];
            dice[key] = Dice.create(die);
        });
        spellObj._dice = dice;
    }
    if (spell.spells) {
        spellObj.removeSpells(); // Remove default spells
        spell.spells.forEach(subJSON => {
            const subSpell = this.restoreSpell(subJSON, entity);
            spellObj.addSpell(subSpell);
        });
    }
    return spellObj;
};


FromJSON.prototype.createItem = function(obj) {
    const item = obj;

    // Try to create object using ObjectShell.Parser, if it fails, fallback
    // to default constructor in RG.Item
    let itemObj = null;
    if (this._parser.hasItem(obj.setName)) {
        itemObj = this._parser.createItem(obj.setName);
    }
    else {
        const typeCapitalized = this.getItemObjectType(item);
        if (Item[typeCapitalized]) {
            itemObj = new Item[typeCapitalized]();
        }
        else {
            let msg = `No RG.Item[${typeCapitalized}] found for new()`;
            msg += ` JSON: ${JSON.stringify(obj)}`;
            RG.err('FromJSON', 'createItem', msg);
        }
    }

    for (const func in item) {
        if (func === 'setSpirit') {
            // Calls gem.setSpirit() with created spirit
            const spiritJSON = item[func];
            const spiritObj = this.createActor(spiritJSON);
            this._addEntityFeatures(spiritJSON, spiritObj);
            itemObj[func](spiritObj);
        }
        else if (typeof itemObj[func] === 'function') {
            itemObj[func](item[func]); // Use setter
        }
        else if (func !== 'components') {
            if (func !== 'isUsable') {
                const json = JSON.stringify(itemObj);
                RG.err('Game.FromJSON', 'createItem',
                  `${func} not func in ${json}`);
            }
        }
    }
    this.addEntityInfo(itemObj, obj);
    if (item.components) {
        this.addCompsToEntity(itemObj, obj.components);
    }
    return itemObj;
};


FromJSON.prototype.createInventoryItems = function(obj, player) {
    if (obj.hasOwnProperty('inventory')) {
        const itemObjs = obj.inventory;
        for (let i = 0; i < itemObjs.length; i++) {
            const itemObj = this.createItem(itemObjs[i]);
            player.getInvEq().addItem(itemObj);
        }
    }
};

FromJSON.prototype.createEquippedItems = function(obj, player) {
    if (obj.hasOwnProperty('equipment')) {
        const equipObjs = obj.equipment;
        for (let i = 0; i < equipObjs.length; i++) {
            const itemObj = this.createItem(equipObjs[i]);
            player.getInvEq().restoreEquipped(itemObj);
        }
    }
};


// TODO move to appropriate place
FromJSON.prototype.getItemObjectType = function(item) {
    if (item.setType === 'spiritgem') {return 'SpiritGem';}
    if (item.setType === 'goldcoin') {return 'GoldCoin';}
    if (item.setType === 'missileweapon') {return 'MissileWeapon';}
    if (!RG.isNullOrUndef([item])) {
        if (!RG.isNullOrUndef([item.setType])) {
            return item.setType.capitalize();
        }
        else {
            const itemJSON = JSON.stringify(item);
            RG.err('FromJSON', 'getItemObjectType',
                'item.setType is undefined. item: ' + itemJSON);
        }
    }
    else {
        RG.err('FromJSON', 'getItemObjectType',
            'item is undefined');
    }
    return null;
};

/* Creates a Map.Level object from a json object. NOTE: This method cannot
* connect stairs to other levels, but only create the stairs elements. */
FromJSON.prototype.restoreLevel = function(json): Level {
    const mapObj = this.createCellMap(json.map);
    const level = new Level(mapObj);
    level.setID(json.id);
    level.setLevelNumber(json.levelNumber);
    // level.setMap(mapObj);

    // Create actors
    json.actors.forEach(actor => {
        const actorObj = this.createActor(actor.obj);
        if (actorObj !== null) {
            if (!this.isVirtual(actor)) {
                level.addActor(actorObj, actor.x, actor.y);
            }
            else {
                level.addVirtualProp(RG.TYPE_ACTOR, actorObj);
            }
        }
        else {
            RG.err('FromJSON', 'restoreLevel',
                `Actor ${JSON.stringify(actor)} returned null`);
        }
    });

    // Create elements such as stairs
    json.elements.forEach(elem => {
        const elemObj = this.createElement(elem);
        if (elemObj !== null) {
            level.addElement(elemObj, elem.x, elem.y);
        }
        else {
            RG.err('FromJSON', 'restoreLevel',
                `createElement ${JSON.stringify(elem)} returned null`);
        }
    });

    // Create items
    json.items.forEach(item => {
        const itemObj = this.createItem(item.obj);
        if (itemObj !== null) {
            level.addItem(itemObj, item.x, item.y);
        }
        else {
            RG.err('FromJSON', 'restoreLevel',
                `Actor ${JSON.stringify(item)} returned null`);
        }
    });

    this.addLevels([level], 'restoreLevel', [json]);
    return level;
};

FromJSON.prototype.isVirtual = function(actorJSON): boolean {
    return (actorJSON.x === -1 && actorJSON.y === -1);
};

/* Creates elements such as stairs, doors and shop. */
FromJSON.prototype.createElement = function(elem): ElementBase {
    const elemJSON = elem.obj;
    const type = elemJSON.type;
    let createdElem = null;
    if (type === 'connection') {
        createdElem = this.createUnconnectedStairs(elem);
    }
    else if (type === 'shop') {
        const shopElem = new Element.ElementShop();
        let shopkeeper = null;
        if (!RG.isNullOrUndef([elemJSON.shopkeeper])) {
            shopkeeper = this.id2entity[elemJSON.shopkeeper];
            if (shopkeeper) {
                shopElem.setShopkeeper(shopkeeper);
            }
            else {
                RG.err('Game.FromJSON', 'createElement',
                    `Shopkeeper with ID ${elemJSON.shopkeeper} not found`);
            }
        }
        shopElem.setCostFactor(elemJSON.costFactorBuy,
            elemJSON.costFactorSell);
        if (elemJSON.isAbandoned) {
            shopElem.abandonShop();
        }
        createdElem = shopElem;
    }
    else if (type === 'door') {
        createdElem = new Element.ElementDoor(elemJSON.closed);
    }
    else if (type === 'leverdoor') {
        createdElem = new Element.ElementLeverDoor(elemJSON.closed);
    }
    else if (type === 'lever') {
        createdElem = new Element.ElementLever();
    }
    else if (type === 'marker') {
        createdElem = new Element.ElementMarker(elemJSON.char);
        createdElem.setTag(elemJSON.tag);
    }
    else if (type === 'exploration') {
        const expElem = new Element.ElementExploration();
        expElem.setExp(elemJSON.setExp);
        // expElem.setMsg(elemJSON.setMsg);
        if (elemJSON.data) {expElem.setData(elemJSON.data);}
        createdElem = expElem;
    }
    else if (type === 'web') {
        createdElem = new Element.ElementWeb();
    }
    else if (type === 'slime') {
        createdElem = new Element.ElementSlime();
    }
    else if (type === 'hole') {
        createdElem = new Element.ElementHole();
    }

    // Finally, restore messages (if any)
    if (elemJSON.msg) {
        createdElem.setMsg(elemJSON.msg);
    }

    if (createdElem) {
        const id = elemJSON.id;
        if (Number.isInteger(id)) {
            createdElem.setID(id);
            this.addObjRef('element', createdElem, elemJSON);
        }
    }

    return createdElem;
};

/* Creates the actor and sets entity ID refs, but does not restore all
 * entity data. */
FromJSON.prototype.createActor = function(json) {
    if (json.type === null) {
        RG.err('FromJSON', 'createActor',
            `json.type null, json: ${JSON.stringify(json)}`);
    }

    let entity = null;
    if (json.new && Actor[json.new]) {
        entity = new Actor[json.new](json.name);
    }
    else {
        let msg = '';
        const jsonStr = JSON.stringify(json);
        if (!json.new) {
            msg = 'No json.new given. JSON obj: ' + jsonStr;
        }
        else {
            const keys = Object.keys(Actor);
            msg = `${json.new} not in RG.Actor: ${keys}. JSON obj: ` + jsonStr;
        }
        RG.err('Game.FromJSON', 'createActor', msg);
    }

    entity.setType(json.type);
    entity.setID(json.id);
    this.addEntityInfo(entity, json);
    return entity;
};


/* Adds entity info to restore the entity references back to objects. */
FromJSON.prototype.addEntityInfo = function(entity, json) {
    this.addObjRef('entity', entity, json);
};

/* Creates unconnected stairs. The object
 * returned by this method is not complete stairs, but has placeholders for
 * targetLevel (level ID) and targetStairs (x, y coordinates).
 */
FromJSON.prototype.createUnconnectedStairs = function(elem) {
    const {x, y} = elem;
    const id = elem.obj.srcLevel;
    const stairsId = `${id},${x},${y}`;
    const elemObj = elem.obj;
    const sObj = new Element.ElementStairs(elemObj.name);
    this.stairsInfo[stairsId] = {targetLevel: elemObj.targetLevel,
        targetStairs: elemObj.targetStairs};
    return sObj;
};


FromJSON.prototype.createCellMap = function(map): CellMap {
    if (map.encoded) {
        return CellMap.fromJSON(map);
    }
    const mapObj = new CellMap(map.cols, map.rows);
    map.cells.forEach((col, x) => {
        col.forEach((cell, y) => {
            const baseElem = this.createBaseElem(cell);
            mapObj.setBaseElemXY(x, y, baseElem);
        });
    });
    map.explored.forEach(explXY => {
        mapObj.getCell(explXY[0], explXY[1]).setExplored();
    });
    /*
    Object.keys(map.elements).forEach(key => {
        const [x, y] = RG.key2Num(key);
        mapObj.setElemXY(x, y, this.createBaseElem(map.elements[key]));
    });
    */
    return mapObj;
};


FromJSON.prototype.createBaseElem = function(cell: string) {
    const type = ELEM_MAP.elemIndexToType[cell];
    if (ELEM_MAP.elemTypeToObj[type]) {
        return ELEM_MAP.elemTypeToObj[type];
    }
    else {
        RG.err('Game.fromJSON', 'createBaseElem',
            `Unknown type ${type}`);
    }
    return null;
};

FromJSON.prototype.setGlobalConfAndObjects = function(game, gameJSON: JsonMap) {
    if (gameJSON.globalConf) {
        this.dbg('Setting globalConf for game: '
            + JSON.stringify(gameJSON.globalConf, null, 1));
        game.setGlobalConf(gameJSON.globalConf);
    }
    if (gameJSON.cellStyles) {
        RG.cellStyles = gameJSON.cellStyles;
    }
    if (gameJSON.charStyles) {
        RG.charStyles = gameJSON.charStyles;
    }
    if (gameJSON.actorsKilled) {
        this.actorsKilled = gameJSON.actorsKilled;
        game.actorsKilled = gameJSON.actorsKilled;
    }
    if (gameJSON.objectShellParser) {
        ObjectShell.restoreParser(gameJSON.objectShellParser);
    }
    const engineJSON: JsonMap = gameJSON.engine as JsonMap;
    if (engineJSON.msgHandler) {
        const msgJSON = engineJSON.msgHandler;
        const pool = game.getPool();
        game._engine._msg = MessageHandler.fromJSON(msgJSON, pool);
    }
};


/* Makes all connections in given levels after they've been created as
 * Map.Level objects. */
FromJSON.prototype.connectGameLevels = function(levels: Level[]): void {
    levels.forEach((level: Level) => {
        const stairsList: Stairs[] = level.getConnections();

        stairsList.forEach((s: Stairs) => {
            const connObj = this.stairsInfo[s.getConnID()];
            const targetLevel = this.id2level[connObj.targetLevel];
            if (!targetLevel && this.chunkMode) {
                s.setConnObj(connObj);
                return;
            }

            const targetStairsXY = connObj.targetStairs;
            if (!targetStairsXY) {
                RG.diag(JSON.stringify(level, null, 1));
                RG.diag(connObj);
                RG.diag('Parent: ' + level.getParent().getName());
                RG.diag(JSON.stringify(s));
            }

            const x = targetStairsXY.x;
            const y = targetStairsXY.y;
            if (targetLevel) {
                s.setTargetLevel(targetLevel);
                const targetStairs = targetLevel
                    .getMap().getCell(x, y).getConnection();
                if (targetStairs) {
                    s.connect(targetStairs);
                }
                else {
                    RG.err('Game.FromJSON', 'connectGameLevels',
                        'Target stairs was null. Cannot connect.');
                }
            }
            else {
                // this.reportMissingLevel(connObj);
                const id = connObj.targetLevel;
                RG.err('Game.FromJSON', 'connectGameLevels',
                    `Target level ${id} null. Cannot connect.`);
            }
        });
    });
};

FromJSON.prototype.restoreGameMaster = function(game, json) {
    ++this.IND;
    const gameMaster = game.getGameMaster();
    const battles = {};
    Object.keys(json.battles).forEach(id => {
        json.battles[id].forEach(battleJSON => {
            battles[id] = [];
            if (this.id2level[id]) { // Tile level exists
                this.dbg(`FromJSON Restoring Battle ${id}`);
                const battle = this.restoreBattle(battleJSON);
                battles[id].push(battle);
                // battles[id] = battle;
                /* if (!battle.isJSON) {
                    game.addLevel(battle.getLevel());
                }*/
            }
            else {
                this.dbg(`FromJSON Battle ${id} not created`);
                this.dbg(JSON.stringify(battleJSON));
                // battles[id] = json.battles[id];
                // gameMaster.addBattle(id, json.battles[id]);
                battles[id].push(battleJSON);
            }
        });
    });
    gameMaster.setBattles(battles);
    if (json.battlesDone) {
        gameMaster.battlesDone = json.battlesDone;
    }
    gameMaster.hasBattleSpawned = json.hasBattleSpawned;
    --this.IND;
    return gameMaster;
};

FromJSON.prototype.restoreBattle = function(json: BattleJSON): Battle {
    const battleLevel = this.getLevelOrFatal(json.level, 'restoreBattle');
    if (battleLevel) {
        ++this.IND;
        this.dbg(`\trestoreBattle found level ID ${json.level}`);
        const battle = new Battle(json.name);
        battle.setID(json.id);
        battle.setLevel(battleLevel);
        battle.setStats(json.stats);
        battle.finished = json.finished;
        const armies = [] as Army[];
        json.armies.forEach(armyJSON => {
            armies.push(this.restoreArmy(armyJSON));
        });
        battle.setArmies(armies);

        // Need to remove the event listeners if battle over
        if (battle.finished) {
            debug(`${json.name} finished. rm listeners`);
            POOL.removeListener(battle);
            armies.forEach(army => {
                POOL.removeListener(army);
            });
        }
        // Restore the handle to parent zone
        if (json.parent) {
            const parentZone = this.id2Place[json.parent];
            if (parentZone) {
                parentZone.setBattle(battle);
            }
            else {
                const str = JSON.stringify(json);
                RG.err('FromJSON', 'restoreBattle',
                  `Could not find parent zone with ID ${json.parent}: ${str}`);
            }
        }
        --this.IND;
        return battle;
    }
    RG.err('Game.FromJSON', 'restoreBattle',
        `No level for battle ID's ${json.level}`);
    return null;
};

FromJSON.prototype.restoreArmy = function(json: ArmyJSON): Army {
    const army = new Army(json.name);
    if (json.id) {
        army.setID(json.id);
    }
    json.actors.forEach(id => {
        if (this.id2entity[id]) {
            army.addActor(this.id2entity[id]);
        }
    });
    army.setDefeatThreshold(json.defeatThreshold);
    Object.entries(json.alignment).forEach((pair) => {
        const [key, value] = pair;
        army.addAlignment(key, value);
    });
    return army;
};

/* Assume the place is World object for now. */
FromJSON.prototype.restorePlace = function(place) {
    const worldJSON = new WorldFromJSON(this.id2level, this.id2entity);
    worldJSON.fromJSON = this;
    const world = worldJSON.createPlace(place);
    this.id2Place = Object.assign(this.id2Place, world.getID2Place());
    return world;
};

FromJSON.prototype.restoreOverWorld = function(json) {
    const ow = OWMap.fromJSON(json);
    const coordMap = new OverWorld.CoordMap();
    for (const p in json.coordMap) {
        if (json.coordMap.hasOwnProperty(p)) {
            coordMap[p] = json.coordMap[p];
        }
    }
    ow.coordMap = coordMap;
    return ow;
};

FromJSON.prototype.restoreWorldSim = function(json): WorldSimulation {
    return WorldSimulation.fromJSON(json);
};

FromJSON.prototype.restoreEntityData = function() {
    Object.keys(this.id2EntityJson).forEach(id => {
        const json = this.id2EntityJson[id];
        const entity = this.id2entity[id];
        if (json && entity) {
            this.restoreEntity(json, entity);
        }
        else {
            let msg = json ? '' : '|JSON is null/undef|';
            msg += entity ? '' : '|entity is null/undef|';
            RG.err('FromJSON', 'restoreEntityData',
                `ID: ${id} ${msg}`);
        }
    });
};

FromJSON.prototype.restoreComponentData = function() {
    Object.keys(this.compsWithMissingRefs).forEach(id => {
        const comp = this.compsWithMissingRefs[id];
        const json = this.id2CompJSON[id];
        this.restoreComponent(json, comp);
    });
};


FromJSON.prototype.restoreComponent = function(json, comp) {
    Object.keys(json).forEach(setFunc => {
        const valueToSet = json[setFunc];
        if (Array.isArray(valueToSet)) {
            if ((valueToSet as any).$objRefArray) {
                const arr = [];
                valueToSet.forEach(objRef => {
                    if (objRef.$objRef) {
                        arr.push(this.getObjByRef(objRef.$objRef));
                    }
                    else {
                        const msg = JSON.stringify(valueToSet);
                        RG.err('FromJSON', 'restoreComponent',
                            `$objRefArray found but no $objRefs inside: ${msg}`
                        );
                    }
                });
                comp[setFunc](arr);
            }
        }
        else if (valueToSet.$objRef) {
            if (valueToSet.$objRef.type === 'component') {
                comp[setFunc](this.getObjByRef(valueToSet.$objRef));
            }
        }
    });
};

FromJSON.prototype.reportMissingLevel = function(connObj) {
    let msg = `connObj: ${JSON.stringify(connObj)}`;
    Object.keys(this.id2level).forEach(id => {
        msg += `\n\t${id}`;
    });
    console.warn(msg + '\n');
};

/* Re-schedules the HP/PP regeneration for an actor */
FromJSON.prototype._addRegenEvents = function(game, actor) {
    // Add HP regeneration
    const regenPlayer = new Time.RegenEvent(actor,
        20 * RG.ACTION_DUR);
    game.addEvent(regenPlayer);

    // Add PP regeneration (if needed)
    if (actor.has('SpellPower')) {
        const regenPlayerPP = new Time.RegenPPEvent(actor,
            30 * RG.ACTION_DUR);
        game.addEvent(regenPlayerPP);
    }

};

FromJSON.prototype.dbg = function(msg) {
    if (debug.enabled) {
      const indStr = '>'.repeat(this.IND);
      debug(`${indStr} ${msg}`);
    }
};

FromJSON.prototype.getLevelsToRestore = function(gameJSON) {
    let levels = [];
    let numLevels = 0;
    if (gameJSON.levels) {return gameJSON.levels;}
    if (!gameJSON.places) {
        return levels;
    }

    Object.keys(gameJSON.places).forEach(name => {
        const place = gameJSON.places[name];
        if (place.area) {
            place.area.forEach(area => {
                area.tiles.forEach((tileCol, x) => {
                    tileCol.forEach((tile, y) => {
                        if (area.tilesLoaded[x][y]) {
                            numLevels += tile.levels.length;
                            levels = levels.concat(tile.levels);
                        }
                    });
                });
            });
        }
    });
    this.dbg(`Restoring ${levels.length} out of ${numLevels}`);
    return levels;
};


/* Given a list of JSON World.AreaTiles, creates the objects and level
 * connections, and attaches them to area in current game. */
FromJSON.prototype.createTiles = function(game, jsonTiles: IAreaTileJSON[]) {
    const allLevels = game.getLevels();
    this.addLevels(allLevels, 'createTiles');

    // Levels must be created before the actual world, because the World
    // object contains only level IDs
    let levelsJson = [];
    jsonTiles.forEach(json => {
        levelsJson = levelsJson.concat(json.levels);
    });
    const restoredLevels: Level[] = [];

    levelsJson.forEach(json => {
        const level = this.restoreLevel(json);
        restoredLevels.push(level);
        allLevels.push(level);
    });

    // Connect levels using this.id2level + this.stairsInfo
    this.connectGameLevels(restoredLevels);

    // Entity data cannot be restored earlier because not all object refs
    // exist when entities are created
    this.restoreEntityData();
    this.restoreComponentData();

    const area = game.getCurrentWorld().getCurrentArea();
    const fact = new FactoryWorld();
    fact.setId2Level(this.id2level);
    fact.id2entity = this.id2entity;

    jsonTiles.forEach(json => {
        const [tx, ty] = [json.x, json.y];
        const tile = new World.AreaTile(tx, ty, area);

        const tileLevel = this.id2level[json.level];
        tile.setLevel(tileLevel);
        game.addLevel(tileLevel);

        const jsonCopy = JSON.parse(JSON.stringify(json));
        area.setTile(tx, ty, tile);
        tileLevel.setParent(area);
        fact.createZonesFromTile(area, jsonCopy, tx, ty);
        this.restoreSerializedBattles(game, tile);
    });

};

FromJSON.prototype.restoreSerializedBattles = function(game, tile) {
    const tileId = tile.getLevel().getID();
    const master = game.getGameMaster();
    if (master.battles[tileId]) {
        const battles = master.battles[tileId];
        master.battles[tileId] = [];
        battles.forEach(battleJSON => {
            const battle = this.restoreBattle(battleJSON);
            master.battles[tileId].push(battle);
            // master.battles[tileId] = battle;
        });
    }
};

/* Adds the array of levels into the internal storage. */
FromJSON.prototype.addLevels = function(levels, msg = '', jsonArr = []) {
    levels.forEach((level: Level, i) => {
        const id = level.getID();
        if (!this.id2level.hasOwnProperty(id)) {
            let levelJSON = null;
            if (i < jsonArr.length) {
                levelJSON = jsonArr[i];
            }
            this.addObjRef('level', level, levelJSON);
            this.dbg(`Added level ${id} to this.id2level ${msg}`);
        }
        else {
            RG.log(level); // For error reporting
            RG.err('Game.FromJSON', `addLevels - ${msg}`,
            `Duplicate level ID detected ${id}`);
        }
    });
};

FromJSON.prototype.connectTileLevels = function(levels: Level[], conns: Stairs[] ) {
    conns.forEach(conn => {
        const stairsId = conn.getID();
        const targetLevel = conn.getTargetLevel();
        this.stairsInfo[stairsId] = {
            targetLevel,
            targetStairs: conn.getTargetStairs()
        };
    });
    this.addLevels(levels, 'connectTileLevels');
    this.connectConnections(conns);
};

FromJSON.prototype.connectConnections = function(conns) {
    conns.forEach(s => {
        const connObj = this.stairsInfo[s.getID()];
        const targetLevel = this.id2level[connObj.targetLevel];

        const targetStairsXY = connObj.targetStairs;
        const {x, y} = targetStairsXY;
        if (targetLevel) {
            s.setTargetLevel(targetLevel);
            const targetStairs = targetLevel
                .getMap().getCell(x, y).getConnection();
            if (targetStairs) {
                s.connect(targetStairs);
            }
            else {
                RG.err('Game.FromJSON', 'connectConnections',
                    'Target stairs was null. Cannot connect.');
            }
        }
        else {
            const id = connObj.targetLevel;
            RG.err('Game.FromJSON', 'connectConnections',
                `Target level ${id} null. Cannot connect.`);
        }
    });
};

FromJSON.prototype.restoreChunkManager = function(game, gameJSON) {
    if (gameJSON.chunkManager) {
        game.setEnableChunkUnload(true);
    }
};

// 'Integrity' check that correct number of levels restored
// TODO does not work/check anything with the new world architecture
FromJSON.prototype.checkNumOfLevels = function(game, gameJSON): void {
    const nLevels = game.getLevels().length;
    if (gameJSON.levels) {
        if (nLevels !== gameJSON.levels.length) {
            const exp = gameJSON.levels.length;
            RG.err('Game.FromJSON', 'checkNumOfLevels',
                `Exp. ${exp} levels, after restore ${nLevels}`);
        }
    }
};

/* Returns the level with given ID. Or throws an error if the level is not
 * found. */
FromJSON.prototype.getLevelOrFatal = function(id, funcName) {
    if (!Number.isInteger(id)) {
        const errMsg = `ID must be number. Got ${id}`;
        RG.err('Game.FromJSON', funcName, errMsg);
    }
    if (this.id2level.hasOwnProperty(id)) {
        return this.id2level[id];
    }
    let msg = `No level with ID ${id}.`;
    msg += ` Available: ${Object.keys(this.id2level)}`;
    RG.err('Game.FromJSON', funcName, msg);
    return null;
};
