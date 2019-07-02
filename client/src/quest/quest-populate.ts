
/* File contains code for procedural quest generation. */

import dbg = require('debug');
const debug = dbg('bitn:quest-gen');

import RG from '../rg';
import {RandomCyclic} from '../random-cyclic';
import {Random} from '../random';
import {Placer} from '../placer';
import {ObjectShell} from '../objectshellparser';

import {Names} from '../../data/name-gen';
import {EventPool} from '../eventpool';
import {BaseActor, SentientActor} from '../actor';
import * as Item from '../item';
import * as Component from '../component';
import {Entity} from '../entity';
import {Level} from '../level';

import {QuestData, QuestTargetObj, QuestObjSurrogate} from './quest-data';
import {Quest, Task} from './quest-task';
import {QuestGen} from './quest-gen';

const RNG = Random.getRNG();
const POOL = EventPool.getPool();

type ItemBase = Item.ItemBase;
type ItemOrNull = ItemBase | null;
type ZoneBase = import('../world').ZoneBase;
type AreaTile = import('../world').AreaTile;
type WorldCity = import('../world').City;

import {ElementBase} from '../element';

//---------------------------------------------------------------------------
// OBJECT QUEST-POPULATE
//---------------------------------------------------------------------------

interface CleanupItem {
    location: Level;
    item?: ItemBase;
    actor?: SentientActor;
    element?: ElementBase;
    tag?: string;
}

type Location = Level | ZoneBase;

interface QuestPopulData {
    actor: any[];
    element: any[];
    escort: any[];
    item: any[];
    listen: any[];
    place: any[];
    read: any[];
    reportListen: any[];
    return: any[];
    zone: any[];
}

interface QuestFlags {
    alreadyKnowIt: boolean;
    escort: boolean;
    listen: boolean;
    read: boolean;
    report: boolean;
}

export class QuestPopulate {

    public static legalKeys: Set<string>;

    public pool: EventPool;
    public currTile: AreaTile;
    public questList: QuestData[];
    public conf: {[key: string]: any};
    public maxTriesPerZone: number;
    public questTargetCallback: {[key: string]: (target: any) => void};
    public checkImplemented: boolean;
    public IND: number;
    public debug: boolean;
    public currTaskType: string;
    public rng: Random;

    private questData: {[key: string]: any}; // TODO
    private _cleanup: CleanupItem[]; // TODO
    private flags: QuestFlags;
    private currQuest: QuestData | null;
    // private _data: {[key: string]: any[]};
    private _data: Map<QuestData, QuestPopulData>;
    private _questCrossRefs: Map<any, any>;
    private questGivers: Map<QuestData, SentientActor>;
    private listOfAllTasks: string[];

    constructor(conf?) {
        this.resetData();
        this.questList = [];
        this.conf = {
            maxLength: 10,
            minLength: 1,
            minQuests: 1,
            maxQuests: 2,
            numQuestsPerZone: 1
        };

        this.maxTriesPerZone = 5;

        this.questTargetCallback = {
            escort: this.handleEscort = this.handleEscort.bind(this),
            repair: this.handleRepair = this.handleRepair.bind(this),
            listen: this.handleListen = this.handleListen.bind(this),
            reportListen: this.handleListen = this.handleListen.bind(this),
            report: this.handleReport = this.handleReport.bind(this),
            subquest: this.handleSubQuest = this.handleSubQuest.bind(this)
        };

        // Can be turned off for testing. Some quest features must be implemented
        // outside QuestPopulate, but are not done yet. Thus only the implemented
        // quests should be generated in the actual game.
        this.checkImplemented = true;
        this.IND = 0;
        this.debug = debug.enabled;

        // Set the RNG if specified for constructor
        this.rng = RNG;
        if (conf && conf.rng) {this.rng = conf.rng;}

        this.pool = POOL;
    }

    public resetData(): void {
        this.questData = {quests: []};
        this.questList = [];
        this._cleanup = [];

        this.flags = {
            alreadyKnowIt: false,
            escort: false,
            listen: false,
            read: false,
            report: false
        };
        this.listOfAllTasks = [];

        this.currQuest = null;

        // Data which must be stored between different quest items
        this._data = new Map();

        // Stores the refs between tasks like get-give
        this._questCrossRefs = new Map();
        this.questGivers = new Map();
    }

    public setDebug(val: boolean): void {
        this.debug = val;
        debug.enabled = val;
    }

    public getParentQuestData(): QuestData | null {
        const currIndex = this.questData.quests.indexOf(this.currQuest);
        if (currIndex > 0) {
            return this.questData.quests[currIndex - 1];
        }
        return null;
    }

    public initQuestPopulDataForQuest(questData: QuestData): void {
        this._data.set(questData, {
            actor: [],
            element: [],
            escort: [],
            item: [],
            listen: [],
            place: [],
            read: [],
            reportListen: [],
            return: [],
            zone: [],
        });
    }

    public addQuestPopulData(key: string, populData): void {
        if (!this._data.has(this.currQuest)) {
            this.initQuestPopulDataForQuest(this.currQuest);
        }

        if (this._data.get(this.currQuest).hasOwnProperty(key)) {
            this._data.get(this.currQuest)[key].push(populData);
        }
        else {
            const keys = Object.keys(this._data.get(this.currQuest)).join(',');
            RG.err('QuestPopulate', 'addQuestPopulData',
               `Key ${key} not present. Choices: ${keys}`);
        }
    }

    /* Returns previous item of given type. Type refers to actor/item/place/element.
     * */
    public getQuestPopulData(
        type: string, searchParen: boolean = false
    ): Entity | Location | null {
        if (this._data.has(this.currQuest)) {
            const qData: QuestPopulData = this._data.get(this.currQuest);
            if (qData.hasOwnProperty(type) && qData[type].length > 0) {
                const n = qData[type].length;
                return qData[type][n - 1];
            }
            else if (searchParen) {
                // TODO maybe this should be recursive call to getQuestPopulData()?
                // now it searches only the immediate parent quest
                const parentQuest = this.getParentQuestData();
                if (parentQuest) {
                    const qDataParent: QuestPopulData = this._data.get(parentQuest);
                    if (qDataParent.hasOwnProperty(type)) {
                        const n = qDataParent[type].length;
                        return qDataParent[type][n - 1];
                    }
                }

                RG.err('QuestPopulate', 'getQuestPopulData',
                   `No data for type ${type}. Searched parent also`);
            }
            else {
                const keys = Object.keys(qData);
                RG.err('QuestPopulate', 'getQuestPopulData',
                   `No data for type ${type}. Keys: ${keys}`);
            }
        }
        else {
            RG.err('QuestPopulate', 'getQuestPopulData',
               'No data for currQuest exists');
        }
        return null;
    }

    /* Creates quests for given tile x,y in area in world. Returns the number
     * of quests successfully created. */
    public createQuests(world, area, x, y): number {
        const areaTile: AreaTile = area.getTileXY(x, y);
        const cities: WorldCity[] = areaTile.getZones('City') as WorldCity[];
        let numCreated = 0;
        cities.forEach((city: WorldCity) => {
            numCreated += this.createQuestsForZone(city, areaTile);
        });
        return numCreated;
    }

    /* Creates quests for given zone located in the areaTile. Returns the number
     * of quests correctly created.
     */
    public createQuestsForZone(zone: ZoneBase, areaTile: AreaTile): number {
        const numQuests = this.conf.numQuestsPerZone || 1;
        let numCreated = 0;
        for (let i = 0; i < numQuests; i++) {
            for (let n = 0; n < this.maxTriesPerZone; n++) {
                const questGen = new QuestGen();
                const quest: Quest = questGen.genQuestWithConf(this.conf);
                this.resetData();
                if (this.mapQuestToResources(quest, zone, areaTile)) {
                    this.addQuestComponents(zone);
                    ++numCreated;
                    break;
                }
            }
        }
        return numCreated;
    }

    /* Tries to map a quest to world resources. Returns false if does not succeed.
     * Can happen due to missing actors, levels or items etc. Mapping failure
     * should not be an error. */
    public mapQuestToResources(quest: Quest, zone: ZoneBase, areaTile: AreaTile): boolean {
        ++this.IND;
        this.currTile = areaTile;
        const newQuest = new QuestData();

        this.dbg('*** New quest started ****');
        if (quest.isQuest()) {
            this.dbg('  Quest has ' + quest.numTasks() + ' tasks');
            this.dbg('  Quest has ' + (quest.numQuests() - 1) + ' sub-quests');
        }

        // We need to create a quest target to complete a sub-quest, if
        // currQuest is already defined
        let returnLocation = null;
        if (this.currQuest) {
            const target = {createTarget: 'createSubQuestTarget',
                subQuest: newQuest, args: []};
            this.dbg('Adding |subquest| target for current quest');
            this.currQuest.addTarget('subquest', target);
            returnLocation = this.currQuest.getCurrentLocation() as Level;
        }

        // We need to set return location for sub-quest (handled by
        // <subquest>goto task, but the goto-task will be in the parent quest
        if (returnLocation) {
            this.addQuestPopulData('return', returnLocation);
        }

        this.currQuest = newQuest;
        this.questData.quests.push(this.currQuest);
        const level = this.rng.arrayGetRand(zone.getLevels());
        this.currQuest.addTarget('location', level);


        let ok = true;
        quest.getSteps().forEach(step => {
            const currLoc = this.currQuest.getCurrentLocation() as Level;
            if (step.isQuest()) {
                // Recursive call for sub-quests, check the current
                // location for the quest
                const newZone = currLoc.getParentZone();
                ok = ok && this.mapQuestToResources(step, newZone, areaTile);
            }
            else {
                const currZone = currLoc.getParentZone();
                ok = ok && this.mapTask(quest, step, currZone, areaTile);
            }
        });

        ok = ok && this._checkQuestFlags();
        if (!ok) {
            this.cleanUpFailedQuest();
            --this.IND;
            return false;
        }
        this.dbg('Created quest: ' + this.currQuest.getDescr());

        // Finally, pop a quest from stack and make parent quest
        // the current one
        const nQuests = this.questData.quests.length;
        if (nQuests > 1) {
            this.questList.unshift(this.questData.quests.pop());
            const nLast = this.questData.quests.length - 1;
            this.currQuest = this.questData.quests[nLast];
        }
        else {
            this.questList.unshift(this.currQuest);
        }
        --this.IND;
        return true;
    }

    /* Used to add cross reference from later quest item to an earlier item. */
    public pushQuestCrossRef(key, data): void {
        const taskType = this.currTaskType;
        if (!key) {
            RG.err('QuestPopulate', 'pushQuestCrossRef',
               `${taskType}: Undefined KEY with data ${data}`);
        }
        if (!data) {
            RG.err('QuestPopulate', 'pushQuestCrossRef',
               `${taskType}: Undefined DATA with key ${key}`);
        }
        if (!this._questCrossRefs.has(key)) {
            this._questCrossRefs.set(key, []);
        }
        this._questCrossRefs.get(key).push(data);
    }

    public popQuestCrossRef(key: object): Entity | null {
        if (this._questCrossRefs.has(key)) {
            const arr = this._questCrossRefs.get(key);
            if (arr.length > 0) {
                const item = this._questCrossRefs.get(key).pop();
                if (arr.length === 0) {
                    this._questCrossRefs.delete(key);
                }
                return item;
            }
        }
        return null;
    }

    /* Maps a single task to resources. Prev. or next step may also affect mapping.
     * Contains large switch-for mapping different atomic tasks to resources. */
    public mapTask(quest: Quest, task: Task, zone: ZoneBase, areaTile): boolean {
        ++this.IND;
        const taskType = task.getTaskType();
        let ok = false;

        if (this.checkImplemented && !tasksImplemented.has(taskType)) {
            // console.log(`TaskType |${taskType}| not implemented. Bail out..`);
            return false;
        }

        this.dbg('Processing taskType |' + taskType + '|');
        this.listOfAllTasks.push(taskType);
        this.currTaskType = taskType;

        switch (taskType) {
            case 'capture': {
                const actorToCapture = this.getActorToCapture();
                if (actorToCapture) {
                    this.currQuest.addTarget('capture', actorToCapture);
                    ok = true;
                }
                break;
            }
            case 'damage': {
                const entToDamage = this.getEntityToDamage();
                if (entToDamage) {
                    this.currQuest.addTarget('damage', entToDamage);
                    ok = true;
                }
                break;
            }
            case 'defend': {
                // Defend city/place/entity from an assault
                const entToDefend = this.getEntityToDefend();
                if (entToDefend) {
                    this.currQuest.addTarget('defend', entToDefend);
                    ok = true;
                }
                break;
            }
            case 'escort': {
                const actorToEscort = this.getActorToEscort(areaTile);
                if (actorToEscort) {
                    this.currQuest.addTarget('escort', actorToEscort);
                    ok = true;
                    this.addQuestPopulData('escort', actorToEscort);
                    // this._data.escort.push(actorToEscort);
                    this.flags.escort = true;
                }
                // Get a rescued NPC to follow you to a place
                break;
            }
            case 'experiment': {
                const item = this.getQuestPopulData('item');
                if (item) {
                    this.currQuest.addTarget('experiment', item);
                    ok = true;
                }
                // TODO decide what this should do
                break;
            }
            case '<get>already_have_it': {
                // Find a item from player inventory and use it
                const item = this.getAlreadyOwnedItem();
                if (item) {
                    this.currQuest.addTarget('get', item);
                    ok = true;
                    this.addQuestPopulData('item', item);
                }
                break;
            }
            case '<get>gather': {
                // Create a random item (not to be stolen) to gather TODO
                const newItem = this.getItemToGather();
                if (newItem) {
                    this.currQuest.addTarget('get', newItem);
                    ok = true;
                    this.addQuestPopulData('item', newItem);
                }
                break;
            }
            case '<get>exchange': {
                // Find a shop in the town, and add an item there
                const item = this.getItemToExchange();
                if (item) {
                    this.currQuest.addTarget('exchange', item);
                    ok = true;
                    this.addQuestPopulData('item', item);
                }
                break;
            }
            case 'give': {
                // FInd previous item in the quest data, and assign task
                const level = this.currQuest.getCurrentLocation();
                const actorToGive = this.getActorForQuests(level.getActors());
                if (actorToGive) {
                    this.currQuest.addTarget('give', actorToGive);
                    ok = true;
                }
                // to give it to someone
                break;
            }
            case '<goto>already_there': {
                // Don't add current location because it's already in the stack
                ok = true;
                if (this.flags.escort) {
                    // There was some glitch, this should not happen
                    ok = false;
                }
                break;
            }
            case '<goto>explore': {
                // Changes the current quest location but also creates
                // an explore target
                const newLocation = this.getNewExploreLocation(zone, areaTile);
                this.currQuest.addTarget('location', newLocation);
                const exploreTarget = this.getExploreTarget();

                if (exploreTarget) {
                    this.currQuest.addTarget('explore', exploreTarget);
                    ok = true;
                    if (this.flags.read) {
                        this.flags.read = false;
                        // Read about this location from previous read target
                        this.pushQuestCrossRef(this.getQuestPopulData('read'),
                            newLocation);
                    }
                    if (this.flags.escort) {
                        this.flags.escort = false;
                        // Prev escort target must be escorted to this location
                        const escortData = this.getQuestPopulData('escort', true);
                        this.pushQuestCrossRef(escortData, newLocation);
                    }
                }
                break;
            }
            case '<goto>goto': {
                // TODO handle flags like learn and alreadyKnowIt
                const newLocation = this.getNewLocation(zone, areaTile);
                this.currQuest.addTarget('location', newLocation);
                ok = true;
                if (this.flags.read) {
                    this.flags.read = false;
                    // Read about this location from previous read target
                    this.pushQuestCrossRef(this.getQuestPopulData('read'),
                        newLocation);
                }
                if (this.flags.listen) {
                    this.flags.listen = false;
                    // Hear about this location from previous listen target
                    this.pushQuestCrossRef(this.getQuestPopulData('listen'),
                        newLocation);
                }
                if (this.flags.escort) {
                    this.flags.escort = false;
                    // Prev escort target must be escorted to this location
                    const escortData = this.getQuestPopulData('escort', true);
                    this.pushQuestCrossRef(escortData, newLocation);
                }
                break;
            }
            case '<kill>kill': {
                const actorToKill = this.getActorToKill();
                if (actorToKill) {
                    this.currQuest.addTarget('kill', actorToKill);
                    ok = true;
                }
                break;
            }
            case '<learn>already_know_it': {
                // Set the flag, next quest step must use this
                this.flags.alreadyKnowIt = true;
                ok = true;
                break;
            }
            case 'listen': {
                const actorToListen = this.getActorToListen();
                if (actorToListen) {
                    this.currQuest.addTarget('listen', actorToListen);
                    this.flags.listen = true;
                    this.addQuestPopulData('listen', actorToListen);
                    ok = true;
                }
                break;
            }
            case 'finishbattle': {
                this.currQuest.addTarget('finishbattle',
                    {createTarget: 'createBattle', args: [zone, areaTile]});
                ok = true;
                break;
            }
            case '<learn>read': {
                const readTarget = this.getReadTarget(zone, areaTile);
                if (readTarget) {
                    this.addQuestPopulData('read', readTarget);
                    // this._data.read.push(readTarget);
                    this.flags.read = true;
                    this.currQuest.addTarget('read', readTarget);
                    ok = true;
                }
                break;
            }
            case 'repair': {
                const repairTarget = this.getRepairTarget();
                if (repairTarget) {
                    this.currQuest.addTarget('repair', repairTarget);
                    ok = true;
                }
                break;
            }
            case '<report>listen': {
                const actorToListen = this.getActorToListen();
                if (actorToListen) {
                    this.currQuest.addTarget('reportListen', actorToListen);
                    this.flags.report = true;
                    this.addQuestPopulData('reportListen', actorToListen);
                    ok = true;
                }

                break;
            }
            case 'report': {
                const actor = this.getActorForReport();
                if (actor) {
                    this.currQuest.addTarget('report', actor);
                    ok = true;
                    if (this.flags.report) {
                        const listenTarget = this.getQuestPopulData('reportListen');
                        this.pushQuestCrossRef(actor, listenTarget);
                        this.flags.report = false;
                    }
                }
                break;
            }
            case '<spy>spy': {
                const actor = this.getActorToSpy();
                if (actor) {
                    this.currQuest.addTarget('spy', actor);
                    ok = true;
                }
                break;
            }
            case '<steal>stealth': {
                // So far, nothing to do
                ok = true;
                break;
            }
            case '<subquest>goto': {
                // Should return to the same location, before the subquest
                const returnLocation = this.getQuestPopulData('return');
                if (returnLocation) {
                    this.currQuest.addTarget('location', returnLocation);
                    ok = true;
                    if (this.flags.escort) {
                        this.flags.escort = false;
                        // Prev escort target must be escorted to this location
                        const escortData = this.getQuestPopulData('escort', true);
                        this.pushQuestCrossRef(escortData, returnLocation);
                    }
                }
                break;
            }
            case '<steal>take': {
                const newItem = this.getItemToSteal();
                if (newItem) {
                    // this.currQuest.addTarget('steal', newItem);
                    this.currQuest.addTarget('get', newItem);
                    this.addQuestPopulData('item', newItem);
                    // this._data.item.push(newItem);
                    ok = true;
                }
                break;
            }
            case 'take': {
                const newItem = this.getItemToSteal();
                if (newItem) {
                    // this.currQuest.addTarget('take', newItem);
                    this.currQuest.addTarget('get', newItem);
                    this.addQuestPopulData('item', newItem);
                    ok = true;
                }
                break;
            }
            case 'use': {
                const useItem = this.getItemToUse();
                if (useItem) {
                    this.currQuest.addTarget('use', useItem);
                    ok = true;
                }
                // Do something like lit a fire or build bridge etc
                break;
            }
            case 'winbattle': {
                this.currQuest.addTarget('winbattle',
                    {createTarget: 'createBattle', args: [zone, areaTile]});
                ok = true;
                // Find a battle outside town/create new one
                break;
            }
            default: {
                RG.err('QuestPopulate', 'mapTask',
                    `Task type ${task.taskType} not supported yet`);
            }
        }

        if (!ok) {
            console.warn('QuestPopulate', 'mapTask',
                `Failed to map ${task.getTaskType()}, ${JSON.stringify(task)}`);
        }
        --this.IND;
        return ok;
    }


    /* Returns an actor from the given array, who is suitable as quest target
     * or quest giver. */
    public getActorForQuests(actors: BaseActor[]): BaseActor {
        let actor = this.rng.arrayGetRand(actors);
        let numTries = 20;
        let createNew = false;

        while (!isOkForQuest(actor)) {
            actor = this.rng.arrayGetRand(actors);
            if (--numTries === 0) {
                createNew = true;
                break;
            }
        }
        if (createNew) {
            // TODO
        }
        return actor;
    }

    public getActorToKill(): SentientActor {
        const location = this.currQuest.getCurrentLocation();
        let actors = location.getActors();
        actors = actors.filter(a => !a.isPlayer() &&
            a.hasNone(['QuestGiver', 'QuestTarget'])
        );
        // TODO make sure to return something meaningful like boss
        return this.rng.arrayGetRand(actors) as SentientActor;
    }

    public getActorForReport(): SentientActor {
        const location = this.currQuest.getCurrentLocation();
        const actors = location.getActors();
        return this.getActorForQuests(actors) as SentientActor;
    }

    public getActorToSpy(): SentientActor {
        const location = this.currQuest.getCurrentLocation();
        const actors = location.getActors();
        return this.getActorForQuests(actors) as SentientActor;
    }

    /* Extracts an actor from current location. */
    public getActorToListen(): SentientActor {
        const level = this.currQuest.getCurrentLocation();
        const actorToListen = this.getActorForQuests(level.getActors());
        return actorToListen as SentientActor;
    }

    public getActorToEscort(areaTile: AreaTile): SentientActor {
        const level = this.currQuest.getCurrentLocation();
        const actorToEscort = this.getActorForQuests(level.getActors());
        return actorToEscort as SentientActor;
    }

    public dbg(msg): void {
        if (this.debug) {
            const ind = '=='.repeat(this.IND);
            debug(ind + msg);
        }
    }

    /* Returns an item already in player's possession. */
    public getAlreadyOwnedItem(): ItemOrNull {
        const location = this.currQuest.getCurrentLocation();
        // const actors = location.getActors();
        const player = location.getPlayer() as SentientActor;
        if (player) {
            const items = player.getInvEq().getInventory().getItems();
            return this.rng.arrayGetRand(items);
        }
        return null;
    }

    public getItemToSteal(): ItemOrNull {
        const location = this.currQuest.getCurrentLocation();
        const item = new Item.ItemBase(Names.getItemToStealName());

        let ok = Placer.addEntityToCellType(item, location, c => c.hasHouse());
        if (!ok) {
            // If no house available, use empty cell
            ok = Placer.addEntityToCellType(item, location, c => c.isFree());
        }

        if (!ok) {return null;}

        this._cleanup.push({location, item, tag: 'getItemToSteal'});
        return item;
    }

    public getItemToGather(): ItemOrNull {
        const location = this.currQuest.getCurrentLocation();
        const item = new Item.ItemBase('Quest item to gather');

        if (!Placer.addEntityToCellType(item, location, c => c.isPassable())) {
            return null;
        }

        this._cleanup.push({location, item, tag: 'getItemToGather'});
        return item;
    }

    public getReadTarget(zone, areaTile): QuestObjSurrogate {
        const location = this.currQuest.getCurrentLocation();
        return {
            createTarget: 'createBook', args: [location, zone, areaTile]
        };
    }

    public getItemToUse(): ItemOrNull {
        // TODO this cannot create the item directly because if further
        // resource mapping fails, we need to delete the created item
        const location = this.currQuest.getCurrentLocation();
        const items = location.getItems();
        const useItems = items.filter(item => item.hasOwnProperty('useItem'));
        if (useItems.length > 0) {
            return this.rng.arrayGetRand(useItems);
        }

        const parser = ObjectShell.getParser();
        const itemToPlace = parser.createRandomItem(item => item.use);
        if (!Placer.addEntityToCellType(itemToPlace, location, c => c.isPassable())) {
            return null;
        }
        if (itemToPlace) {
            this._cleanup.push({location, item: itemToPlace, tag: 'getItemToUse'});
            return itemToPlace;
        }
        return null;
    }

    /* Finds a target to repair. */
    public getRepairTarget(): Entity | null {
        const location = this.currQuest.getCurrentLocation();
        const elems = location.getElements();
        const elemsToRepair = elems.filter(e => (
            e.getType() === 'door' ||
            e.getType() === 'leverdoor' ||
            e.getType() === 'lever'
        ));
        if (elemsToRepair.length > 0) {
            const elem: unknown = this.rng.arrayGetRand(elemsToRepair);
            return elem as Entity;
        }
        return null;
    }

    /* Finds an entity to damage. Can be element or actor. */
    public getEntityToDamage(): Entity | null {
        const location = this.currQuest.getCurrentLocation();
        const elems = location.getElements();
        const doors = elems.filter(elem => elem.getType() === 'door');
        if (doors) {
            const chosenDoor: unknown = this.rng.arrayGetRand(doors);
            return chosenDoor as Entity;
        }

        const actors = location.getActors();
        if (actors.length > 0) {
            return this.rng.arrayGetRand(actors);
        }
        return null;
    }

    public getEntityToDefend(): Entity | null {
        const location = this.currQuest.getCurrentLocation();
        const actors = location.getActors();
        if (actors.length > 0) {
            return this.rng.arrayGetRand(actors);
        }
        return null;
    }

    public getActorToCapture(): SentientActor {
        const location = this.currQuest.getCurrentLocation();
        const actors = location.getActors();
        return this.getActorForQuests(actors) as SentientActor;
    }

    public getItemToExchange(): ItemBase | null {
        const location = this.currQuest.getCurrentLocation();
        const elems = location.getElements();
        const shops = elems.filter(elem => elem.getType() === 'shop');
        this.rng.shuffle(shops);

        while (shops.length > 0) {
            const cell = shops[0].getCell();
            if (cell.hasItems()) {
                const items = cell.getItems();
                const unpaidItems = items.filter(item => item.has('Unpaid'));
                if (unpaidItems.length > 0) {
                    return unpaidItems[0];
                }
            }
            shops.shift();
        }
        return null;
    }

    /* Returns a level from a new zone (which is not 'zone' arg). */
    public getNewLocation(zone: ZoneBase, areaTile: AreaTile): Level {
        if (this.flags.alreadyKnowIt) {
            // TODO should return a location known by player
            this.flags.alreadyKnowIt = false;
        }

        let zones: ZoneBase[] = areaTile.getZones();
        zones = zones.filter(zz => zz.getType() !== 'battlezone');

        let newZone: ZoneBase = this.rng.arrayGetRand(zones);
        if (zones.length > 1) {
            while (newZone.getID() === zone.getID()) {
                newZone = this.rng.arrayGetRand(zones);
            }
        }

        this.addQuestPopulData('zone', newZone);
        return this.rng.arrayGetRand(newZone.getLevels());
    }

    public getNewExploreLocation(zone, areaTile): Level | null {
        const dungeons = areaTile.getZones('Dungeon');
        const mountains = areaTile.getZones('Mountain');
        const allZones = dungeons.concat(mountains);
        const randCycle = new RandomCyclic(allZones);
        if (allZones.length > 0) {
            let newZone = randCycle.next();
            let watchdog = 20;
            while (newZone.getID() === zone.getID()) {
                newZone = randCycle.next();

                if (--watchdog === 0) {
                    break;
                }
            }
            this.addQuestPopulData('zone', newZone);
            return newZone.getLevels()[0];
        }
        return null;
    }

    public getExploreTarget() {
        const zone = this.getQuestPopulData('zone') as ZoneBase;
        const levels = zone.getLevels();
        let exploreElem = null;
        levels.forEach(level => {
            if (!exploreElem) {
                const elems = level.getElements();
                exploreElem = elems.find(e => e.getType() === 'exploration');
            }
        });
        return exploreElem;
    }

    public addQuestComponents(zone): void {
        // Sub-quests must be mapped first, so that quest givers can be obtained
        // for parent quetsts
        for (let i = this.questList.length - 1; i >= 0; i--) {
            const questData: QuestData = this.questList[i];
            questData.resetIter();

            questData.keys().forEach(key => {
                if (QuestPopulate.legalKeys.has(key)) {
                    let target: QuestTargetObj = questData.next(key);
                    while (target) {
                        // Custom create function can be given such as createBattle
                        // or createBook, which must return the target
                        if (RG.isEntity(target)) {
                            this.setAsQuestTarget(key, target as Entity);
                        }
                        else if ((target as QuestObjSurrogate).createTarget) {
                            const {createTarget, args} = target as QuestObjSurrogate;
                            if (typeof this[createTarget] !== 'function') {
                                RG.err('QuestPopulate', 'addQuestComponents',
                                    `${createTarget} not a func in QuestPopulate`);
                            }

                            const targetObj = this[createTarget](target, ...args);
                            this.setAsQuestTarget(key, targetObj);
                            // Replace target with newly create object
                            if (!questData.replaceTarget(key, target, targetObj)) {
                                RG.err('QuestPopulate', 'addQuestComponents',
                                    'Failed to repl obj for ' + createTarget);
                            }
                        }
                        else {
                            // this.setAsQuestTarget(key, target);
                        }
                        target = questData.next(key);
                    }
                }
                else {
                    RG.err('QuestPopulate', 'addQuestComponents',
                        `Unsupported key |${key}| found`);
                }
            });

            // Grab random actor and make it the quest giver
            const level: Level = this.rng.arrayGetRand(zone.getLevels());
            const questGiver = this.getActorForQuests(level.getActors());
            const giverComp = new Component.QuestGiver(questData.getDescr());
            this.addTargetsToGiver(giverComp, questData);

            questGiver.add(giverComp);
            this.addUniqueName(questGiver);

            level.get('Lore').addTopic('quests',
               questGiver.getName() + ' could have some work for you');

            // TODO fix typings
            const giver = questGiver as unknown;
            this.questGivers.set(questData, giver as SentientActor);
        }

    }

    public addTargetsToGiver(giverComp, questData): void {
        const questID = giverComp.getQuestID();
        this.dbg('addTargetsToGiver now, ID ' + questID);

        ++this.IND;
        const pathTargets = questData.getPathTargets();
        pathTargets.forEach(questTarget => {
            this._checkTargetValidity(questTarget);
            const targetComp = questTarget.get('QuestTarget');
            if (targetComp) {
                const [target, targetType] = [targetComp.getTarget(),
                    targetComp.getTargetType()];
                giverComp.addTarget(targetType, target);
                targetComp.setQuestID(questID);
            }
            else {
                const json = JSON.stringify(questTarget);
                RG.err('QuestPopulate', 'addTargetsToGiver',
                    `No QuestTarget found from target ${json}`);
            }
        });
        --this.IND;
    }

    public _checkTargetValidity(target: Entity): void {
        if (!RG.isEntity(target)) {
            const msg = 'Non-Entity given: ' + JSON.stringify(target);
            RG.err('QuestPopulate', '_checkTargetValidity', msg);
        }
    }

    public setAsQuestTarget(key: string, target: Entity): void {
        if (!target) {
            const msg = `Null/undef target with key |${key}|`;
            RG.err('QuestPopulate', 'setAsQuestTarget', msg);
        }

        if (typeof target.getID !== 'function') {
            let msg = `questTarget without getID() given with key ${key}:`;
            msg += ` ${JSON.stringify(target)}`;
            RG.err('QuestPopulate', 'setAsQuestTarget', msg);
        }

        const qTarget = Component.create('QuestTarget');
        qTarget.setTargetType(key);
        qTarget.setTarget(target);
        qTarget.setTargetID(target.getID());
        target.add(qTarget);
        if (RG.isActor(target) || RG.isItem(target)) {
            this.addUniqueName(target);
        }

        if (this.questTargetCallback[key]) {
            this.questTargetCallback[key](target);
        }
    }

    /* Adds a location refence to an escorted target. This location
     * is known only after escort target is selected, so we need to
     * use crossrefs. */
    public handleEscort(target): void {
        const escortLocation = this.popQuestCrossRef(target);
        if (escortLocation) {
            const qEscort = Component.create('QuestEscortTarget');
            qEscort.setEscortTo(escortLocation);
            target.add(qEscort);
        }
        else {
            this.dumpInternalData('handleEscort');
            this.errorQuestHandle(target, 'handleEscort');
        }
    }


    public handleRepair(target): void {
        target.add(Component.create('Broken'));
    }

    /* Adds some info to listen to for the target actor. */
    public handleListen(target): void {
        const questInfo = Component.create('QuestInfo');
        questInfo.setQuestion('Can you tell me something to report?');
        questInfo.setInfo('Generate something to report');
        // TODO add some quest-specific info
        questInfo.setGivenBy(target.getID());
        target.add(questInfo);
    }

    public handleReport(target): void {
        const questReport = Component.create('QuestReport');
        const listenTarget = this.popQuestCrossRef(target);
        if (listenTarget) {
            questReport.setExpectInfoFrom(listenTarget.getID());
        }
        target.add(questReport);
    }

    public handleSubQuest(target): void {
        const qTarget = target.get('QuestTarget');
        const giverComp = target.get('QuestGiver');
        if (qTarget && giverComp) {
            qTarget.setSubQuestID(giverComp.getQuestID());
        }
        else {
            const json = JSON.stringify(target);
            RG.err('QuestPopulate', 'handleSubQuest',
                'Target must have QuestTarget + Giver comps: ' + json);
        }
    }

    /* Adds a unique name to the given target entity (uses Named comp). */
    public addUniqueName(target): void {
        if (!target.has('Named')) {
            const namedComp = Component.create('Named');
            if (target.getName) {
                namedComp.setName(target.getName());
            }
            target.add(namedComp);
        }
        const named = target.get('Named');
        if (RG.isActor(target)) {
            named.setUniqueName(Names.getActorName());
            const name = target.getName();
            const firstChar = name[0];
            RG.addCharStyle(RG.TYPE_ACTOR, name, firstChar);
            RG.addCellStyle(RG.TYPE_ACTOR, name, 'cell-actor-unique');
        }
        else if (RG.isItem(target)) {
            // TODO add proper random name generation
            const itemName = 'Quest item ' + this.rng.getUniformInt(0, 1000000);
            console.log('addUniqueName rand item name ' + itemName);
            named.setUniqueName(itemName);
        }
    }

    public createBattle(target, zone, areaTile): Level | null {
        const battleZones: ZoneBase[] = areaTile.getZones('BattleZone');
        if (battleZones.length > 0) {
            const battleZone = this.rng.arrayGetRand(battleZones);
            // BattleZone has only 1 level at the moment
            const level = battleZone.getLevels()[0];
            return level;
        }
        else {
            const eventArgs: any = { // TODO fix typings
                areaTile, zone
            };
            this.pool.emitEvent(RG.EVT_CREATE_BATTLE, eventArgs);
            if (eventArgs.response) {
                console.log('createBattle return eventArgs.response.level');
                const {battle} = eventArgs.response;
                if (battle) {
                    return battle.getLevel();
                }
            }
            else {
                RG.err('QuestPopulate', 'createBattle',
                    'No response in eventArgs for EVT_CREATE_BATTLE');
            }
        }
        return null;
    }

    public createBook(target: QuestTargetObj, level: Level): Item.Book | null {
        const book = new Item.Book(Names.getBookName());
        const location = this.popQuestCrossRef(target);
        if (location) {
            level.addItem(book);
            // TODO setText() some info about the location etc
            const placeName = RG.formatLocationName(location);
            const bookText = ['Quest hint where to go:'];
            bookText.push('You should go to place called ' + placeName);
            book.setText(bookText);
            book.addMetaData('place', {levelID: location.getID(), name: placeName});
            return book;
        }
        else {
            const crossRefs = JSON.stringify(this._questCrossRefs);
            RG.err('QuestPopulate', 'createBook',
                `No cross-refs set for book. refs: ${crossRefs}`);
        }
        return null;
    }

    public createSubQuestTarget(target): SentientActor {
        const {subQuest} = target;
        const giver = this.questGivers.get(subQuest);
        return giver;
    }

    /* Checks that any flag set has been unset, and corresponding crossrefs
     * have been set. If not, this can create problems when adding quest
     * components. */
    protected _checkQuestFlags(): boolean {
        let allAreFalse = true;
        Object.keys(this.flags).forEach(flagName => {
            if (this.flags[flagName] !== false) {
                allAreFalse = false;
                console.log('Flag ', flagName, 'still true!');
            }
        });
        return allAreFalse;
    }

    /* Cleans up already created resources which would've been part of quest.
     * Quest gen failed for some reason, so we'll clean up the resources. */
    protected cleanUpFailedQuest(): void {
        let numCleaned = 0;
        this._cleanup.forEach((cleanupObj: CleanupItem) => {
            const {location} = cleanupObj;
            let ok = false;
            let questObj = null;
            if (cleanupObj.item) {
                const [x, y] = cleanupObj.item.getXY();
                questObj = cleanupObj.item;
                try {
                    ok = location.removeItem(cleanupObj.item, x, y);
                }
                catch (e) {
                    const {tag} = cleanupObj;
                    const name = cleanupObj.item.getName();
                    const itemList = location.getItems().map(i => i.toString());
                    let msg = `Failed to cleanup item ${name} @ ${x},${y}`;
                    if (tag) {msg += '\nTag specified: |' + tag + '|';}
                    msg += '\n' + e.message;
                    msg += '\nItems at loc: ' + itemList;
                    RG.err('QuestPopulate', 'cleanUpFailedQuest', msg);
                }
            }
            else if (cleanupObj.actor) {
                const [x, y] = cleanupObj.actor.getXY();
                ok = location.removeActor(cleanupObj.actor);
                questObj = cleanupObj.actor;
            }
            else if (cleanupObj.element) {
                const [x, y] = cleanupObj.element.getXY();
                ok = location.removeElement(cleanupObj.element, x, y);
                questObj = cleanupObj.element;
            }
            if (ok) {
                ++numCleaned;
            }
        });
        if (numCleaned !== this._cleanup.length) {
            RG.warn('QuestPopulate', 'cleanUpFailedQuest',
                'Did not remove all quest items for failed quest');
        }
        // Clear the list to prevent double cleanup
        this._cleanup = [];
    }

    protected errorQuestHandle(target, funcName): void {
        let msg = 'Failed to get location for escort: ';
        msg +=  '\n\ttarget: ' + target.getName();
        msg +=  '\n\tcrossRefs: ' + JSON.stringify(Object.values(
            this._questCrossRefs.entries()));
        RG.err('QuestPopulate', funcName, msg);
    }

    /* Used for debugging to show various pieces of internal data. */
    protected dumpInternalData(tag): void {
        if (typeof window !== 'undefined') {
            (window as any).QUEST_GEN = this;
        }
    }
}

/* A list of which quests are currently supported/implemented. */
const tasksImplemented = new Set([
    'damage',
    'escort',
    '<get>gather', 'give',
    '<kill>kill',
    '<goto>already_there', '<goto>explore', '<goto>goto',
    '<learn>already_know_it', '<learn>read',
    'listen', '<report>listen', 'report',
    '<steal>stealth', '<steal>take', 'take',
    '<subquest>goto',
    'finishbattle', 'winbattle'
]);

/* Returns true if given actor can be used as quest target/giver. */
function isOkForQuest(actor: BaseActor): boolean {
    return actor.has('Corporeal') &&
        (RG.ALL_RACES.indexOf(actor.getType()) >= 0) &&
    !(
        actor.isPlayer() || actor.has('QuestTarget')
        || actor.has('QuestGiver')
    );
}


QuestPopulate.legalKeys = new Set([
    'defend', 'capture', 'explore',
    'kill', 'location', 'listen', 'give', 'report', 'reportListen',
    'get', 'steal', 'use',
    'repair', 'damage', 'winbattle', 'finishbattle', 'escort', 'spy',
    'exchange', 'read', 'experiment', 'subquest'
]);
