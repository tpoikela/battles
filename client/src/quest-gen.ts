/* File contains code for procedural quest generation. */

import prettybnf = require('prettybnf');
import dbg = require('debug');
const debug = dbg('bitn:quest-gen');

import RG from './rg';
import {Random} from './random';
import {RandomCyclic} from './random-cyclic';
import {Placer} from './placer';
import {ObjectShell} from './objectshellparser';

import {QuestGrammar} from '../data/quest-grammar';
import {Names} from '../data/name-gen';
import {EventPool} from '../src/eventpool';
import {BaseActor, SentientActor} from './actor';
import * as Item from './item';
import * as Component from './component';
import {Entity} from './entity';
import {Level} from './level';
import {ElementExploration} from './element';

const POOL = EventPool.getPool();
const RNG = Random.getRNG();
const questGrammar = QuestGrammar.grammar;

type ItemBase = Item.ItemBase;
type ItemOrNull = ItemBase | null;
type ZoneBase = import('./world').ZoneBase;
type AreaTile = import('./world').AreaTile;
type WorldCity = import('./world').City;

import {ElementBase} from './element';

/* A task represents a part of a quest. */
export class Task {

    public stepType: string;
    public name: string;
    public taskType: string;

    constructor(taskType: string) {
        this.stepType = 'Task';
        this.name = '';
        this.taskType = taskType;
    }

    public isTask(): this is Task {return true;}
    public isQuest(): this is Quest {return false;}

    public getName(): string {
        return this.name;
    }

    public getTaskType(): string {
        return this.taskType;
    }
}

type QuestStep = Task | Quest;

/* A quest object which can be used to model quests. */
export class Quest {
    public name: string;
    public steps: QuestStep[]; // Atomics/sub-quests
    public stepType: string;
    public motive: string;

    constructor(name: string, tasks?: any[]) { // TODO fix typings
        if (name && typeof name !== 'string') {
            RG.err('Quest', 'new', 'Quest must have a name!');
        }
        this.name = name;
        this.steps = []; // Atomics/sub-quests
        this.stepType = 'Quest';
        this.motive = '';

        if (Array.isArray(tasks)) {
            tasks.forEach(taskType => {
                if (taskType.isQuest) {
                    this.addStep(taskType);
                }
                else if (taskType.isTask) {
                    this.addStep(taskType);
                }
                else {
                    const task = new Task(taskType);
                    this.addStep(task);
                }
            });
        }
    }

    public setName(name): void {this.name = name;}
    public getName(): string {return this.name;}
    public setMotive(motive: string): void {this.motive = motive;}
    public getMotive(): string {return this.motive;}
    public isTask(): this is Task {return false;}
    public isQuest(): this is Quest {return true;}

    public getTasks(): Task[] {
        const result = this.steps.filter(step => step.isTask());
        return result as Task[];
    }

    public addStep(step: QuestStep): void {
        if (Array.isArray(step)) {
            this.steps = this.steps.concat(step);
        }
        else {
            this.steps.push(step);
        }
    }

    public numQuests(): number {
        let sum = 1;
        this.steps.forEach(step => {
            if (step.isQuest && step.isQuest()) {
                sum += 1;
            }
        });
        return sum;
    }

    /* Returns the number of immediate tasks. */
    public numTasks(): number {
        const numSubquests = this.numQuests() - 1;
        return this.steps.length - numSubquests;
    }

    public getSteps(): QuestStep[] {
        return this.steps.slice();
    }

    public numSteps(): number {
        return this.steps.length;
    }
}

/* Code adapted from erratic.js by Daniel Connelly. */
function extract(prop, o) {
    return o[prop];
}

/* Chooses a random rule from arrOfRules. */
function chooseRandomRule(arrOfRules) {
    if (Array.isArray(arrOfRules)) {
        const result = RNG.arrayGetRand(arrOfRules);
        debug('chose next rule at RANDOM:', result);
        return result;
    }
    else {
        debug(`chooseRandomRule() not an ARRAY: |${arrOfRules}`);
    }
    return null;
}

//---------------------------------------------------------------------------
// QUESTGEN for generating quest sequences procedurally
//---------------------------------------------------------------------------
interface QuestGenConf {
    [key: string]: any;
}

export class QuestGen {
    public static rules: any;
    public static defaultConfig: {[key: string]: any};

    /* Can be used for creating quest grammar/rules from a string in BNF format. */
    public static parse(grammar: string) {
        const ast = prettybnf.parse(grammar);
        const rules = {};
        ast.productions.forEach(prod => {
            rules[prod.lhs.text] = prod.rhs.map(extract.bind(null, 'terms'));
        });
        return rules;
    }

    public stack: Quest[];
    public currQuest: Quest;
    public ruleHist: any; // TODO fix typings
    public startRule: string;

    constructor() {
        this._init();
    }

    public _init(): void {
        this.stack = []; // Stack for quests
        this.currQuest = null;
        this.ruleHist = {};
        this.startRule = 'QUEST';
    }

    /* Generates a quest with specific questgiver motive. */
    public genQuestWithMotive(conf: QuestGenConf = {}): Quest {
        const {motive} = conf;
        const questRules = conf.rules || QuestGen.rules;
        const [nameRule] = chooseRandomRule(questRules[motive]);
        const questType = nameRule.text;
        console.log('questType is', questType);
        const newConf = Object.assign({}, conf);
        newConf.rules = questRules;
        newConf.startRule = questType;
        const quest: Quest = this.genQuestWithConf({startRule: questType,
            rules: questRules});

        quest.setName(questType);
        quest.setMotive(motive);
        return quest;
    }

    /* Main function you want to call. Generates a random quest based on given conf
     * or default conf.
     */
    public genQuestWithConf(conf: QuestGenConf = {}): Quest {
        if (conf.debug) {debug.enabled = true;}
        const questRules = conf.rules || QuestGen.rules;
        const startRule = conf.startRule || 'QUEST';

        let ok = false;
        let watchdog = conf.maxTries || 20;
        let quest = [];

        while (!ok) {
            this._init();
            this.startRule = startRule;

            debug('=== Generating new quest now ===');
            quest = this.generateQuest(questRules, startRule).split('|');
            ok = this._questMeetsReqs(quest, conf);
            if (!ok) {
                debug('QUEST DISCARDED');
            }

            if (--watchdog === 0) {
                console.warn('Could not find a matching quest.');
                break;
            }
        }

        return this.currQuest;
    }

    public genQuestWithName(name: string): Quest {
        const quest = new Quest(name);
        const taskGoto = new Task('<goto>already_there');
        quest.addStep(taskGoto);
        const taskKill = new Task('<kill>kill');
        quest.addStep(taskKill);
        return quest;
    }

    public _questMeetsReqs(quest, conf): boolean {
        let ok = true;

        // Check if quest min/max length is met
        const minLength = conf.minLength || 1;
        const maxLength = conf.maxLength || -1;
        if (quest.length <= maxLength || maxLength === -1) {
            if (quest.length >= minLength) {
                ok = true;
                debug('MATCHING QUEST FOUND');
            }
            else {ok = false;}
        }
        else {ok = false;}

        if (conf.minQuests) {
            ok = ok && this.currQuest.numQuests() >= conf.minQuests;
        }
        if (conf.maxQuests) {
            ok = ok && this.currQuest.numQuests() <= conf.maxQuests;
        }
        return ok;
    }

    public generateQuest(rules, rule) {
        if (!this.ruleHist[rule]) {this.ruleHist[rule] = 1;}
        else {this.ruleHist[rule] += 1;}
        debug(`generateQuest with rule |${rule}|`);

        if ((rule === this.startRule) || (rule === 'QUEST')) {
            debug('New (sub)-quest will be generated');
            const questName = '';
            this.currQuest = new Quest(questName);
            this.stack.push(this.currQuest);
        }

        debug(`Choosing randRule ${rule} from ${JSON.stringify(rules[rule])}`);
        const randRule = chooseRandomRule(rules[rule]);
        if (Array.isArray(randRule)) {
            const steps = randRule.map(this.generateTerm.bind(this, rules));
            this._checkIfQuestOver(rule);
            return steps.join('|');
        }

        debug(`generateQuest end reached, return |${randRule}|`);
        this._checkIfQuestOver(rule);
        return randRule;
    }

    public generateTerm(rules, term) {
        if (!term.text) {
            const json = JSON.stringify(rules);
            throw new Error(`Null/undef term.text with rules| ${json}|`);
        }

        if (term.type === 'terminal') {
            this.currQuest.addStep(new Task(term.text));
            return term.text;
        }
        else {
            debug(`genTerm: term.type ${term.type} text: ${term.text}`);
        }

        debug(`calling generate() with term.text |${term.text}|`);
        return this.generateQuest(rules, term.text);
    }

    public _checkIfQuestOver(rule): void {
        if (rule === this.startRule || rule === 'QUEST') {
            debug('Finishing current quest');
            const qLen = this.stack.length;
            if (qLen > 1) {
                const subQuest = this.stack.pop();
                this.currQuest = this.stack[this.stack.length - 1];
                this.currQuest.addStep(subQuest);
            }
        }
    }
}

// Read in the default grammar rules for quest generation
QuestGen.rules = QuestGen.parse(questGrammar);

/* Default config for quest generation. */
QuestGen.defaultConfig = {
    rules: QuestGen.rules,
    startRule: 'QUEST',
    maxTries: 20,
    debug: false,
    minQuests: 1,
    maxQuests: -1,
    minLength: 1,
    maxLength: -1
};


//---------------------------------------------------------------------------
// QUESTDATA for storing quest mapping information
//---------------------------------------------------------------------------

/* Used when target creation is deferred until all tasks are mapped. */
interface QuestObjSurrogate {
    createTarget: string; // Factory function to call
    args?: any[];
}

type QuestTargetObj = Entity | ZoneBase | QuestObjSurrogate;

interface QuestPathObj {
    type: string;
    target: QuestTargetObj;
}

export class QuestData {
    public static mapStepToType: {[key: string]: string};

    // TODO fix typings
    public _stacks: {[key: string]: QuestTargetObj[]};
    public path: QuestPathObj[];
    public _ptr: {[key: string]: any};

    constructor() {
        this._stacks = {};
        this.path = [];
        this._ptr = {}; // Pointers for iteration
    }

    /* Adds one target for the quest. */
    public addTarget(targetType: string, obj: QuestTargetObj): void {
        if (!RG.isEntity(obj)) {
            if (!(obj as QuestObjSurrogate).createTarget) {
                const json = JSON.stringify(obj);
                RG.err('QuestData', 'addTarget',
                    `Only entities can be added. Got: ${json}`);
            }
        }
        if (QuestData.mapStepToType[targetType]) {
            if (!this._stacks[targetType]) {
                this._stacks[targetType] = [];
            }
            this._stacks[targetType].push(obj);
            this.path.push({type: targetType, target: obj});
        }
        else {
            const steps = JSON.stringify(QuestData.mapStepToType);
            RG.err('QuestData', 'add',
                `Step type ${targetType} not supported. See:\n${steps}`);
        }
    }

    public replaceTarget(key: string, oldTarget: QuestTargetObj, newTarget: Entity): boolean {
        const objList = this._stacks[key];
        let index = objList.indexOf(oldTarget);
        if (index >= 0) {
            objList.splice(index, 1, newTarget);
            index = this.path.findIndex(obj => obj.target === oldTarget);
            if (index >= 0) {
                const oldTargetObj = this.path[index];
                const newTargetObj: QuestPathObj = {
                    target: newTarget, type: oldTargetObj.type};
                this.path.splice(index, 1, newTargetObj);
            }
            else {
                RG.err('QuestData', 'replaceTarget',
                    'Could not replace target on path');
            }
            return true;
        }
        return false;
    }

    public numSteps(): number {
        const num = this.path.length;
        return num;
    }

    public keys(): string[] {
        const keys = Object.keys(this._stacks);
        return keys;
    }

    public getPathTypes(): string[] {
        return this.path.map(pair => pair.type);
    }

    public getPathTargets(): QuestTargetObj[] {
        return this.path.map(pair => pair.target);
    }

    public pop(targetType) {
        if (this._stacks[targetType]) {
            return this._stacks[targetType].pop();
        }
        return null;
    }

    /* Reset iterators of the quest data. */
    public resetIter(): void {
        this.keys().forEach(targetType => {
            this._ptr[targetType] = 0;
        });
    }

    public next(targetType) {
        if (this._stacks[targetType]) {
            if (!this._ptr.hasOwnProperty(targetType)) {
                this._ptr[targetType] = 0;
            }
            const ptrVal = this._ptr[targetType];
            if (ptrVal < this._stacks[targetType].length) {
                ++this._ptr[targetType];
                return this._stacks[targetType][ptrVal];
            }
        }
        return null;
    }

    public getCurrent(targetType) {
        if (this._stacks[targetType]) {
            const stack = this._stacks[targetType];
            return stack[stack.length - 1];
        }
        return null;
    }

    public getCurrentLocation(): Level {
        const location = this.getCurrent('location') as Level;
        if (location) {return location;}
        RG.err('QuestGen', 'getCurrentLocation',
            'No location found');
    }

    /* Returns human-readable description of the quest. */
    public getDescr(): string {
        // this.resetIter();
        let res = '';
        this.path.forEach(pair => {
            const step = pair.type;
            // const value = this.next(step);
            const value = pair.target;
            const name = RG.getName(value);
            res += step + ' ' + name + '. ';
        });
        return res;
    }

    public toJSON() {
        const path: any = [];
        this.path.forEach(step => {
            const refType = QuestData.mapStepToType[step.type];
            if (refType) {
                if ((step.target as Entity).getID) {
                    const pathData = {
                        type: step.type,
                        target: RG.getObjRef(refType, step.target)
                    };
                    path.push(pathData);
                }
                else {
                    const pathData = {
                        type: step.type, target: step.target};
                    path.push(pathData);
                }
            }
            else {
                console.error('Used step is', step);
                RG.err('QuestData', 'toJSON',
                    `No refType for step type ${step.type}`);
            }
        });
        path.$objRefArray = true;
        return {
            createFunc: 'createQuestData',
            value: {
                path
            }
        };
    }
}

QuestData.mapStepToType = {
    capture: 'entity',
    escort: 'entity',
    exchange: 'item',
    experiment: 'item',
    explore: 'element',
    damage: 'entity',
    defend: 'entity',
    get: 'item',
    give: 'entity',
    kill: 'entity',
    listen: 'entity',
    location: 'place',
    finishbattle: 'place',
    read: 'item',
    repair: 'element',
    report: 'entity',
    rescue: 'entity',
    spy: 'entity',
    steal: 'item',
    take: 'item',
    subquest: 'entity',
    use: 'item',
    winbattle: 'place'
};

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
    return: any[];
    zone: any[];
}

interface QuestFlags {
    alreadyKnowIt: boolean;
    escort: boolean;
    listen: boolean;
    read: boolean;
}

export class QuestPopulate {

    public static supportedKeys: Set<string>;

    public currTile: AreaTile;
    public questList: QuestData[];
    public conf: {[key: string]: any};
    public maxTriesPerZone: number;
    public questTargetCallback: {[key: string]: (target) => void};
    public checkImplemented: boolean;
    public IND: number;
    public debug: boolean;
    public currTaskType: string;

    private questData: {[key: string]: any}; // TODO
    private _cleanup: CleanupItem[]; // TODO
    private flags: QuestFlags;
    private currQuest: QuestData | null;
    // private _data: {[key: string]: any[]};
    private _data: Map<QuestData, QuestPopulData>;
    private _questCrossRefs: Map<any, any>;
    private questGivers: Map<QuestData, SentientActor>;
    private listOfAllTasks: string[];

    constructor() {
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
            report: this.handleReport = this.handleReport.bind(this),
            subquest: this.handleSubQuest = this.handleSubQuest.bind(this)
        };

        // Can be turned off for testing. Some quest features must be implemented
        // outside QuestPopulate, but are not done yet. Thus only the implemented
        // quests should be generated in the actual game.
        this.checkImplemented = true;
        this.IND = 0;
        this.debug = debug.enabled;
    }

    public resetData(): void {
        this.questData = {quests: []};
        this.questList = [];
        this._cleanup = [];

        this.flags = {
            alreadyKnowIt: false,
            escort: false,
            listen: false,
            read: false
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
                // TODO maybe this should be recursive call to getQuestPopulData()
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
        const level = RNG.arrayGetRand(zone.getLevels());
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
            console.log(`TaskType |${taskType}| not implemented. Bailing out...`);
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
                    this.pushQuestCrossRef(this.getQuestPopulData('read'), newLocation);
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
            case 'report': {
                const actor = this.getActorForReport();
                if (actor) {
                    this.currQuest.addTarget('report', actor);
                    ok = true;
                    if (this.flags.listen) {
                        const listenTarget = this.getQuestPopulData('listen');
                        this.pushQuestCrossRef(actor, listenTarget);
                        this.flags.listen = false;
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
    public getActorForQuests(actors: BaseActor[]): Entity {
        let actor = RNG.arrayGetRand(actors);
        let numTries = 20;
        let createNew = false;

        while (!isOkForQuest(actor)) {
            actor = RNG.arrayGetRand(actors);
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
        return RNG.arrayGetRand(actors);
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
            return RNG.arrayGetRand(items);
        }
        return null;
    }

    public getItemToSteal(): ItemOrNull {
        const location = this.currQuest.getCurrentLocation();
        const item = new Item.ItemBase(Names.getItemToStealName());

        if (!Placer.addEntityToCellType(item, location, c => c.hasHouse())) {
            return null;
        }

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
            return RNG.arrayGetRand(useItems);
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
    public getRepairTarget() {
        const location = this.currQuest.getCurrentLocation();
        const elems = location.getElements();
        const elemsToRepair = elems.filter(e => (
            e.getType() === 'door' ||
            e.getType() === 'leverdoor' ||
            e.getType() === 'lever'
        ));
        if (elemsToRepair.length > 0) {
            return RNG.arrayGetRand(elemsToRepair);
        }
        return null;
    }

    public getEntityToDamage(): Entity {
        const location = this.currQuest.getCurrentLocation();
        const elems = location.getElements();
        const doors = elems.filter(elem => elem.getType() === 'door');
        if (doors) {
            return RNG.arrayGetRand(doors);
        }

        const actors = location.getActors();
        if (actors.length > 0) {
            return RNG.arrayGetRand(actors);
        }
        return null;
    }

    public getEntityToDefend() {
        const location = this.currQuest.getCurrentLocation();
        const actors = location.getActors();
        if (actors.length > 0) {
            return RNG.arrayGetRand(actors);
        }
        return null;
    }

    public getActorToCapture() {
        const location = this.currQuest.getCurrentLocation();
        const actors = location.getActors();
        return this.getActorForQuests(actors);
    }

    public getItemToExchange() {
        const location = this.currQuest.getCurrentLocation();
        const elems = location.getElements();
        const shops = elems.filter(elem => elem.getType() === 'shop');
        RNG.shuffle(shops);

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
        let zones: ZoneBase[] = areaTile.getZones();
        zones = zones.filter(zz => zz.getType() !== 'battlezone');

        let newZone: ZoneBase = RNG.arrayGetRand(zones);
        if (zones.length > 1) {
            while (newZone.getID() === zone.getID()) {
                newZone = RNG.arrayGetRand(zones);
            }
        }

        this.addQuestPopulData('zone', newZone);
        return RNG.arrayGetRand(newZone.getLevels());
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
                if (QuestPopulate.supportedKeys.has(key)) {
                    let target: QuestTargetObj = questData.next(key);
                    while (target) {
                        // Custom create function can be given such as createBattle
                        // or createBook, which must return the target
                        if (isEntity(target)) {
                            this.setAsQuestTarget(key, target);
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
            const level: Level = RNG.arrayGetRand(zone.getLevels());
            const questGiver = this.getActorForQuests(level.getActors());
            const giverComp = new Component.QuestGiver(questData.getDescr());
            this.addTargetsToGiver(giverComp, questData);

            questGiver.add(giverComp);
            this.addUniqueName(questGiver);

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
        }
        else if (RG.isItem(target)) {
            // TODO add proper random name generation
            const itemName = 'Quest item ' + RNG.getUniformInt(0, 1000000);
            console.log('addUniqueName rand item name ' + itemName);
            named.setUniqueName(itemName);
        }
    }

    public createBattle(target, zone, areaTile) {
        const battleZones = areaTile.getZones('BattleZone');
        if (battleZones.length > 0) {
            const battleZone = RNG.arrayGetRand(battleZones);
            // BattleZone has only 1 level at the moment
            const level = battleZone.getLevels()[0];
            return level;
        }
        else {
            const eventArgs: any = { // TODO fix typings
                areaTile, zone
            };
            POOL.emitEvent(RG.EVT_CREATE_BATTLE, eventArgs);
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

    /* Cleans up already created resources which would've been part of quest.
     * Quest gen failed for some reason, so we'll clean up the resources. */
    protected cleanUpFailedQuest(): void {
        this._cleanup.forEach((cleanupObj: CleanupItem) => {
            const {location} = cleanupObj;
            if (cleanupObj.item) {
                const [x, y] = cleanupObj.item.getXY();
                try {
                    location.removeItem(cleanupObj.item, x, y);
                }
                catch (e) {
                    const {tag} = cleanupObj;
                    const name = cleanupObj.item.getName();
                    let msg = `Failed to cleanup item ${name} @ ${x},${y}`;
                    if (tag) {msg += '\nTag specified: |' + tag + '|';}
                    msg += '\n' + e.message;
                    // msg += '\nItems at loc: ' + JSON.stringify(location.getItems());
                    RG.err('QuestPopulate', 'cleanUpFailedQuest', msg);
                }
            }
            else if (cleanupObj.actor) {
                const [x, y] = cleanupObj.actor.getXY();
                location.removeActor(cleanupObj.actor);
            }
            else if (cleanupObj.element) {
                const [x, y] = cleanupObj.element.getXY();
                location.removeElement(cleanupObj.element, x, y);
            }
        });
    }

    protected errorQuestHandle(target, funcName): void {
        let msg = 'Failed to get location for escort: ';
        msg +=  '\n\ttarget: ' + target.getName();
        msg +=  '\n\tcrossRefs: ' + this._questCrossRefs.entries();
        RG.err('QuestPopulate', funcName, msg);
    }

    /* Used for debugging to show various pieces of internal data. */
    protected dumpInternalData(tag): void {
        if (typeof window !== 'undefined') {
            (window as any).QUEST_GEN = this;
        }
    }
}

const tasksImplemented = new Set([
    'damage',
    'escort',
    '<get>gather', 'give',
    '<kill>kill',
    '<goto>already_there', '<goto>explore', '<goto>goto',
    '<learn>already_know_it', '<learn>read',
    'listen', 'report',
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

//---------------------------------------------------------------------------
// ADDING QUEST-RELATED COMPONENTS (last stage)
// - should be done only if mapping of quest to resources succeeds
//---------------------------------------------------------------------------

QuestPopulate.supportedKeys = new Set([
    'defend', 'capture', 'explore',
    'kill', 'location', 'listen', 'give', 'report', 'get', 'steal', 'use',
    'repair', 'damage', 'winbattle', 'finishbattle', 'escort', 'spy',
    'exchange', 'read', 'experiment', 'subquest'
]);

/*
const runningAsNodeScript = !module.parent && typeof window === 'undefined';
if (runningAsNodeScript) {
    RNG.setSeed(Date.now());
    // The grammar is stored in the string g
    // console.log(JSON.stringify(rules));
    // console.log(generateQuest(rules, 'QUEST'));
    const questGen = new QuestGen();
    console.log(questGen.genQuestWithConf({maxLength: 10, minLength: 3}));
    console.log(JSON.stringify(questGen.stack));
    console.log(JSON.stringify(questGen.ruleHist));
}
*/

function isEntity(obj: any): obj is Entity {
    if ((obj as Entity).comps && (obj as Entity).compsByType && (obj as Entity).add && (obj as Entity).get) {
        return true;
    }
    return false;
}
