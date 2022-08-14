
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
import {ObjectShell, Parser} from './objectshellparser';
import {Component, ComponentBase} from './component';
import {Item} from './item';
import {Inventory} from './inv';
import {Actor, BaseActor, SentientActor} from './actor';
import {CellMap} from './map';
import * as Element from './element';
import {FactoryWorld} from './factory.world';
import * as World from './world';
import {Random} from './random';
import {OverWorld} from './overworld';
import * as Time from './time';
import {WorldSimulation} from './world.simulation';
import {Entity} from './entity';

import {Brain} from './brain';
import {BrainPlayer} from './brain/brain.player';
import {BrainSpawner} from './brain/brain.virtual';
import {MessageHandler} from './message-handler';
import {JsonMap, LoadStat, TCoord} from './interfaces';

type IAreaTileJSON = World.IAreaTileJSON;
type Stairs = Element.ElementStairs;
// type Entity = import('./entity').Entity;
type ConnectionObj = Element.ConnectionObj;
type ElementXY = Element.ElementXY;
type WorldBase = World.WorldBase;
type GameMain = import('./game').GameMain;

const POOL = EventPool.getPool();

Brain.Player = BrainPlayer;
Brain.Spawner = BrainSpawner;

const OBJ_REF_REMOVED = Symbol('OBJ_REF_REMOVED');
const OBJ_REF_NOT_FOUND = null;

interface EntityJSON {[key: string]: any;}
interface CompJSON {[key: string]: any;}

/* Object for converting serialized JSON objects to game objects. Note that all
 * actor/level ID info is stored between uses. If you call restoreLevel() two
 * times, all data from 1st is preserved. Call reset() to clear data. */
export class FromJSON {

    // Lookup table for mapping level ID to Map.Level object
    public id2level: {[key: number]: Level};
    public id2entity: {[key: number]: Entity};
    public id2EntityJson: {[key: number]: EntityJSON};
    public id2Object: {[key: number]: object};
    public id2Place: {[key: number]: Level | WorldBase};
    public actorsKilled: any;

    // For restoring component refs
    public id2Component: {[key: number]: ComponentBase};
    public id2CompJSON: {[key: number]: CompJSON};

    public chunkMode: boolean;

    protected _dungeonLevel: number;
    protected _parser: Parser;

    // Stores comps which needs reference restoring
    protected compsWithMissingRefs: {[key: number]: ComponentBase};

    // Stores connection information for stairs
    // protected stairsInfo: {[key: string]: ConnectionObj};
    protected stairsInfo: {[key: string]: any};

    protected IND: number;

    constructor() {
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
        this.chunkMode = false;
    }


    public reset(): void {
        this.id2level = {};
        this.id2entity = {};
        this.id2EntityJson = {};
        this.id2Object = {};
        this.id2Component = {};
        this.id2CompJSON = {};
        this.id2Place = {};

        this.stairsInfo = {};
        this.compsWithMissingRefs = {};
    }


    public setChunkMode(enable: boolean): void {
        this.chunkMode = enable;
    }

    public getDungeonLevel(): number {
        return this._dungeonLevel;
    }

    public addObjRef(type: string, obj, json: JsonMap): void {
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
    }

    /* Returns an object of requested type. Called should check if OBJ_REF_REMOVED
     * is returned. Then it's up to called to decide what to do, but the object
     * cannot be retrieved. */
    public getObjByRef(requestObj) {
        let objRef = null;
        if (requestObj.$objRef) {objRef = requestObj.$objRef;}
        else {objRef = requestObj;}

        if (objRef.type === 'entity') {
            const ent = this.id2entity[objRef.id];
            if (!ent) {
                if (!this.actorsKilled[objRef.id]) {
                    const reqObj = JSON.stringify(requestObj);
                    RG.err('FromJSON', 'getObjByRef',
                        `No ID ${objRef.id} found. ReqObj: ${reqObj}`);
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
    }

    /* Main function to call when restoring a game. When given Game.Main in
     * serialized JSON, returns the restored Game.Main object. */
    public createGame(game, gameJSON) {
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
            const ws = this.restoreWorldSim(game._worldSim, gameJSON.worldSim);
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

        // We can restore scheduler/active levels here
        this.restoreActiveLevels(game, gameJSON);

        this.IND = 0;
        game.updateEventPoolRefs();
        return game;
    }


    public restorePlayer(json): SentientActor {
        const player = new SentientActor(json.name);
        player.setIsPlayer(true);
        // TODO hack for now, these are restored later
        player.remove('StatsMods');
        player.remove('CombatMods');

        player.setType(json.type);
        player.setID(json.id);
        this._dungeonLevel = json.dungeonLevel;
        this.addObjRef('entity', player, json);

        RG.addCellStyle(RG.TYPE_ACTOR, json.name, 'cell-actor-player');
        return player;
    }


    public restorePlayerBrain(player, brainJSON): void {
        const brain = player.getBrain();
        const memory = brain.getMemory();
        const memJSON = brainJSON.memory;
        Object.keys(memJSON).forEach(setter => {
            memory[setter](memJSON[setter]);
        });
        if (brainJSON.markList) {
            brain._markList.fromJSON(brainJSON.markList);
        }
    }

    public addRestoredPlayerToGame(player, game: GameMain, json): void {
        const id = json.player.levelID;
        const level: Level = game.getLevels().find(item => item.getID() === id)!;
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
    }


    public restoreEntity(json, entity: Entity): void {
        if (RG.isActor(entity)) {
            this.createBrain(json.brain, entity);
            this._addEntityFeatures(json, entity);
            this.addEffectsToEntity(entity);
        }
        else if (RG.isElement(entity)) {
            this.restoreElementEntity(json, entity);
        }
        else if (RG.isItem(entity)) {
            // this._addEntityFeatures(json, entity);
        }
        else {
            this.restoreLevelEntity(json, entity);
        }
    }


    public _addEntityFeatures(json, entity) {
        this.addCompsToEntity(entity, json.components);
        this.createInventoryItems(json, entity);
        this.createEquippedItems(json, entity);
        if (json.spellbook) {
            this.createSpells(json, entity);
        }
    }


    public restoreElementEntity(json, entity) {
        if (entity.getType() === 'lever') {
            json.addTarget.forEach(objRef => {
                const entRef = objRef.$objRef;
                const doorEntity = this.id2entity[entRef.id];
                if (doorEntity) {
                    entity.addTarget(doorEntity);
                }
            });
        }
        if (json.components) {
            this.addCompsToEntity(entity, json.components);
        }
    }


    public restoreLevelEntity(json, entity) {
        this.addCompsToEntity(entity, json.components);
    }


    /* Adds given components into Entity object. */
    public addCompsToEntity(ent: Entity, comps) {
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
    }

    public addEffectsToEntity(ent: Entity): void {
        if (ent.has('UseEffects')) {
            const effects = ent.get('UseEffects').getEffects();
            if (effects.length === 0) {
                RG.err('Game.FromJSON', 'addEffectsToEntity',
                   'effects length was 0');
            }
            effects.forEach(eff => {
                const shell = {use: eff};
                this._parser.getCreator().addUseEffects(shell, ent);
            });
        }
    }


    public createComponent(name: string, compJSON) {
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
    }


    // valueToSet can be any of following:
    //   1. Create function of defined in Game.FromJSON
    //     - Call function then sets the result of func call
    //     - Function is called with valueToSet.value
    //   2. Sub-component given with createComp
    //     - Need to call createComponent recursively
    //   3. Can be an objRef
    //   4. Can be scalar/object literal which is set with setFunc
    public getCompValue(
        comp, compJSON, setFunc, valueToSet
    ) {
        if (typeof valueToSet === 'string' || typeof valueToSet === 'number') {
            return valueToSet;
        }
        else if (!RG.isNullOrUndef([valueToSet])) {
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
    }

    public createActorClass(args) {
        const {className, actorRef} = args;
        const actor = this.getObjByRef(actorRef);
        if (actor) {
            return ActorClass.create(className, actor);
        }
        RG.err('FromJSON', 'createActorClass',
            `No actor for class ${className} found`);
        return null;
    }


    public createQuestData(json) {
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
    }


    public createBrain(brainJSON, ent): void {
        const type = brainJSON.type;
        if (Brain[type]) {
            const brainObj = new Brain[type](ent);
            ent.setBrain(brainObj);
            if (type === 'Player') {
                this.restorePlayerBrain(ent, brainJSON);
                return;
            }

            // Brain.Spawner props
            if (brainJSON.constraint) {
                brainObj.setConstraint(brainJSON.constraint);
            }
            if (brainJSON.placeConstraint) {
                brainObj.setPlaceConstraint(brainJSON.placeConstraint);
            }
            if (brainJSON.spawnProb) {
                brainObj.spawnProb = brainJSON.spawnProb;
            }
            if (brainJSON.hasOwnProperty('spawnLeft')) {
                brainObj.spawnLeft = brainJSON.spawnLeft;
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
    }


    public createTopGoal(json, entity) {
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
    }


    public createSpells(json, entity) {
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
    }

    /* Restores a single spell for the entity. If called on multi-spell,
     * calls itself recursively to create sub-spells. */
    public restoreSpell(spell, entity) {
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
    }


    public createItem(obj) {
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
                this.createBrain(spiritJSON.brain, spiritObj);
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
    }

    public createInventoryItems(json, player) {
        if (json.new === 'Sentient') {
            player._invEq = new Inventory(player);
        }
        if (json.hasOwnProperty('inventory')) {
            const itemObjs = json.inventory;
            for (let i = 0; i < itemObjs.length; i++) {
                const itemObj = this.createItem(itemObjs[i]);
                player.getInvEq().addItem(itemObj);
            }
        }
    }


    public createEquippedItems(obj, player) {
        if (obj.hasOwnProperty('equipment')) {
            const equipObjs = obj.equipment;
            for (let i = 0; i < equipObjs.length; i++) {
                const itemObj = this.createItem(equipObjs[i]);
                player.getInvEq().restoreEquipped(itemObj);
            }
        }
    }


    public getItemObjectType(item) {
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
    }


    /* Creates a Map.Level object from a json object. NOTE: This method cannot
    * connect stairs to other levels, but only create the stairs elements. */
    public restoreLevel(json): Level {
        const mapObj = this.createCellMap(json.map);
        const level = new Level(mapObj);
        level.setID(json.id);
        level.setLevelNumber(json.levelNumber);
        this.addLevels([level], 'restoreLevel', [json]);

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

        return level;
    }


    public isVirtual(actorJSON): boolean {
        return (actorJSON.x === -1 && actorJSON.y === -1);
    }

    /* Creates elements such as stairs, doors and shop. */
    public createElement(elem): ElementXY {
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
        else {
            createdElem = new Element.ElementXY(elemJSON.name);
            createdElem.setType(elemJSON.type);
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
    }


    /* Creates the actor and sets entity ID refs, but does not restore all
     * entity data. */
    public createActor(json): BaseActor {
        if (json.type === null) {
            RG.err('FromJSON', 'createActor',
                `json.type null, json: ${JSON.stringify(json)}`);
        }

        let entity = null;
        if (json.new && Actor[json.new]) {
            entity = new Actor[json.new](json.name, false);
        }
        else {
            let msg = '';
            const jsonStr = JSON.stringify(json);
            if (!json.new) {
                msg = 'No json.new given. JSON obj: ' + jsonStr;
            }
            else {
                const keys = Object.keys(Actor);
                msg = `Constr ${json.new} not in Actor: ${keys}. JSON obj: ` + jsonStr;
            }
            RG.err('Game.FromJSON', 'createActor', msg);
        }

        entity.add(new Component.Location());
        entity.add(new Component.Typed('BaseActor', RG.TYPE_ACTOR));
        entity.setType(json.type);
        entity.setID(json.id);
        this.addEntityInfo(entity, json);
        return entity;
    }


    /* Adds entity info to restore the entity references back to objects. */
    public addEntityInfo(entity, json): void {
        this.addObjRef('entity', entity, json);
    }

    /* Creates unconnected stairs. The object
     * returned by this method is not complete stairs, but has placeholders for
     * targetLevel (level ID) and targetStairs (x, y coordinates).
     */
    public createUnconnectedStairs(elem): Stairs {
        const {x, y} = elem;
        const id = elem.obj.srcLevel;
        const stairsId = `${id},${x},${y}`;
        const elemObj = elem.obj;
        const sObj = new Element.ElementStairs(elemObj.name);
        if (elemObj.isOneway) {
            const target = elemObj.targetStairs;
            sObj.setTargetOnewayXY(target.x, target.y);
        }
        this.stairsInfo[stairsId] = {targetLevel: elemObj.targetLevel,
            targetStairs: elemObj.targetStairs};
        return sObj;
    }


    public createCellMap(map): CellMap {
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
        map.explored.forEach((explXY: TCoord) => {
            mapObj.getCell(explXY[0], explXY[1]).setExplored();
        });
        return mapObj;
    }


    public createBaseElem(cell: string) {
        const type = ELEM_MAP.elemIndexToType[cell];
        if (ELEM_MAP.elemTypeToObj[type]) {
            return ELEM_MAP.elemTypeToObj[type];
        }
        else {
            RG.err('Game.fromJSON', 'createBaseElem',
                `Unknown type ${type}`);
        }
        return null;
    }


    public setGlobalConfAndObjects(game, gameJSON: JsonMap): void {
        if (gameJSON.globalConf) {
            this.dbg('Setting globalConf for game: '
                + JSON.stringify(gameJSON.globalConf, null, 1));
            game.setGlobalConf(gameJSON.globalConf);
        }
        if (gameJSON.cellStyles) {
            RG.cellStyles = gameJSON.cellStyles as any; // TODO fix
        }
        if (gameJSON.charStyles) {
            RG.charStyles = gameJSON.charStyles as any; // TODO fix
        }
        if (gameJSON.actorsKilled) {
            this.actorsKilled = gameJSON.actorsKilled;
            game.actorsKilled = gameJSON.actorsKilled;
        }
        if (gameJSON.objectShellParser) {
            ObjectShell.restoreParser(gameJSON.objectShellParser);
        }
        if (gameJSON.gameID) {
            game.gameID = gameJSON.gameID;
        }
        const engineJSON: JsonMap = gameJSON.engine as JsonMap;
        if (engineJSON.msgHandler) {
            const msgJSON = engineJSON.msgHandler;
            const pool = game.getPool();
            game._engine._msg = MessageHandler.fromJSON(msgJSON, pool);
        }
        if (gameJSON.gameOver) {
            game.setGameOver(true);
        }
    }


    public connectGameLevels(levels: Level[]): void {
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
                    if (s.isOneway) {
                        return;
                    }
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
    }


    public restoreGameMaster(game, json) {
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
    }


    public restoreBattle(json: BattleJSON): Battle {
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
                    if (RG.isBattleZone(parentZone)) {
                        (parentZone as World.BattleZone).setBattle(battle);
                    }
                    else {
                        RG.err('FromJSON', 'restoreBattle',
                            `Only battleZone can be parentZone of battle`);
                    }
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
    }


    public restoreArmy(json: ArmyJSON): Army {
        const army = new Army(json.name);
        if (json.id) {
            army.setID(json.id);
        }
        json.actors.forEach(id => {
            if (this.id2entity[id]) {
                const ent = this.id2entity[id];
                if (RG.isActor(ent)) {
                    army.addActor(ent as SentientActor);
                }
            }
        });
        army.setDefeatThreshold(json.defeatThreshold);
        Object.entries(json.alignment).forEach((pair) => {
            const [key, value] = pair;
            army.addAlignment(key, value);
        });
        return army;
    }


    public restorePlace(place) {
        const worldJSON = new WorldFromJSON(this.id2level, this.id2entity);
        worldJSON.fromJSON = this;
        const world = worldJSON.createPlace(place);
        this.id2Place = Object.assign(this.id2Place, world.getID2Place());
        return world;
    }


    public restoreOverWorld(json) {
        const ow = OWMap.fromJSON(json);
        const coordMap = new OverWorld.CoordMap();
        for (const p in json.coordMap) {
            if (json.coordMap.hasOwnProperty(p)) {
                coordMap[p] = json.coordMap[p];
            }
        }
        ow.coordMap = coordMap;
        return ow;
    }


    public restoreWorldSim(worldSim: WorldSimulation, json): WorldSimulation {
        const newWs = WorldSimulation.fromJSON(json);
        worldSim.updateCount = newWs.updateCount;
        worldSim.seasonMan = newWs.seasonMan;
        worldSim.dayMan = newWs.dayMan;
        return worldSim;
    }


    /* 2nd step for Entity creation. All entities are now created, so their
     * references can be set properly to other entities. */
    public restoreEntityData(): void {
        const entNumBefore = JSON.parse(JSON.stringify(Entity.num));
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
        if (debug.enabled) {
            const entNumAfter = JSON.parse(JSON.stringify(Entity.num));
            Object.keys(entNumAfter).forEach((key: string) => {
                console.log(`${key}: ${entNumAfter[key] - entNumBefore[key]}`);
            });
        }
    }


    public restoreComponentData() {
        Object.keys(this.compsWithMissingRefs).forEach(id => {
            const comp = this.compsWithMissingRefs[id];
            const json = this.id2CompJSON[id];
            this.restoreComponent(json, comp);
        });
    }


    public restoreComponent(json, comp) {
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
    }


    public reportMissingLevel(connObj) {
        let msg = `connObj: ${JSON.stringify(connObj)}`;
        Object.keys(this.id2level).forEach(id => {
            msg += `\n\t${id}`;
        });
        console.warn(msg + '\n');
    }


    public dbg(msg) {
        if (debug.enabled) {
          const indStr = '>'.repeat(this.IND);
          debug(`${indStr} ${msg}`);
        }
    }

    public getLevelsToRestore(gameJSON) {
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
                            if (area.tileStatus[x][y] === LoadStat.LOADED) {
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
    }


    public createTiles(game, jsonTiles: IAreaTileJSON[]) {
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
            area.setLoaded(tx, ty);
            tileLevel.setParent(area);
            fact.fromJSON = this;
            fact.createZonesFromTile(area, jsonCopy, tx, ty);
            this.restoreSerializedBattles(game, tile);
        });

    }


    /* Given a list of JSON World.AreaTiles, creates the objects and level
     * connections, and attaches them to area in current game. */
    public restoreSerializedBattles(game, tile) {
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
    }

    /* Adds the array of levels into the internal storage. */
    public addLevels(levels, msg = '', jsonArr = []) {
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
    }


    public connectTileLevels(levels: Level[], conns: Stairs[] ) {
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
    }

    public connectConnections(conns) {
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
    }

    public restoreChunkManager(game, gameJSON) {
        if (gameJSON.chunkManager) {
            const {chunkManager} = gameJSON;
            game.setEnableChunkUnload(true);
            // TODO fix ugly as hell
            game._chunkManager.store.data = chunkManager.data;
            game._chunkManager.recordedTileMoves = chunkManager.recordedTileMoves;
        }
    }

    // 'Integrity' check that correct number of levels restored
    // TODO does not work/check anything with the new world architecture
    public checkNumOfLevels(game, gameJSON): void {
        const nLevels = game.getLevels().length;
        if (gameJSON.levels) {
            if (nLevels !== gameJSON.levels.length) {
                const exp = gameJSON.levels.length;
                RG.err('Game.FromJSON', 'checkNumOfLevels',
                    `Exp. ${exp} levels, after restore ${nLevels}`);
            }
        }
    }

    /* Returns the level with given ID. Or throws an error if the level is not
     * found. */
    public getLevelOrFatal(id: number, funcName: string): Level | null {
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
    }


    public restoreActiveLevels(game: GameMain, gameJSON): void {
        const engineJSON = gameJSON.engine;
        engineJSON.activeLevels.forEach((levelID: number) => {
            if (this.id2level[levelID]) {
                game.addActiveLevel(this.id2level[levelID]);
            }
            else {
                RG.warn('FromJSON', 'restoreActiveLevels',
                    `Did not find active level ID ${levelID}`);
            }
        });
    }

}
