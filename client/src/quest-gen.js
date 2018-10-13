/* File contains code for procedural quest generation. */

const prettybnf = require('prettybnf');
const debug = require('debug')('bitn:quest-gen');
// const fs = require('fs');
const RG = require('./rg');
const Random = require('./random');
const Placer = require('./placer');
const ObjectShell = require('./objectshellparser');

const questGrammar = require('../data/quest-grammar');
const Names = require('../data/name-gen');

const RNG = Random.getRNG();


/* A task represents a part of a quest. */
const Task = function(taskType) {
    this.stepType = 'Task';
    this.name = '';
    this.taskType = taskType;
};

Task.prototype.isTask = function() {return true;};
Task.prototype.isQuest = function() {return false;};

Task.prototype.getName = function() {
    return this.name;
};

Task.prototype.getTaskType = function() {
    return this.taskType;
};

/* A quest object which can be used to model quests. */
const Quest = function(name, tasks) {
    this.name = name;
    this.steps = []; // Atomics/sub-quests
    this.testType = 'Quest';

    if (Array.isArray(tasks)) {
        tasks.forEach(taskType => {
            const task = new Task(taskType);
            this.addStep(task);
        });
    }
};

Quest.prototype.isTask = function() {return false;};
Quest.prototype.isQuest = function() {return true;};

Quest.prototype.getTasks = function() {
    return this.steps.filter(step => step.isTask());
};

Quest.prototype.addStep = function(step) {
    if (Array.isArray(step)) {
        this.steps = this.steps.concat(step);
    }
    else {
        this.steps.push(step);
    }
};

Quest.prototype.numQuests = function() {
    let sum = 1;
    this.steps.forEach(step => {
        if (step.isQuest && step.isQuest()) {
            sum += 1;
        }
    });
    return sum;
};

/* Returns the number of immediate tasks. */
Quest.prototype.numTasks = function() {
    const numSubquests = this.numQuests() - 1;
    return this.steps.length - numSubquests;
};

Quest.prototype.getSteps = function() {
    return this.steps.slice();
};

/* Code adapted from erratic.js by Daniel Connelly. */
function extract(prop, o) {
    return o[prop];
}

/* Chooses a random rule from arrOfRules. */
function chooseRandomRule(arrOfRules) {
    if (Array.isArray(arrOfRules)) {
        const result = RNG.arrayGetRand(arrOfRules);
        debug('choose RANDOM', result);
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
const QuestGen = function() {
    this._init();
};

/* Can be used for creating quest grammar/rules from a string in BNF format. */
QuestGen.parse = function(grammar) {
    const ast = prettybnf.parse(grammar);
    const rules = {};
    ast.productions.forEach(prod => {
        rules[prod.lhs.text] = prod.rhs.map(extract.bind(null, 'terms'));
    });
    return rules;
};

QuestGen.prototype._init = function() {
    this.stack = []; // Stack for quests
    this.currQuest = null;
    this.ruleHist = {};
    this.startRule = 'QUEST';
};

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

/* Main function you want to call. Generates a random quest based on given conf
 * or default conf.
 */
QuestGen.prototype.genQuestWithConf = function(conf = {}) {
    if (conf.debug) {debug.enabled = true;}
    const questRules = conf.rules || QuestGen.rules;
    const startRule = conf.startRule || 'QUEST';
    this.startRule = startRule;
    let ok = false;
    let watchdog = conf.maxTries || 20;
    let quest = [];
    while (!ok) {
        this._init();

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

    // return quest;
    return this.currQuest;
};

QuestGen.prototype.genQuestWithName = function(name) {
    const quest = new Quest(name);
    const taskGoto = new Task('<goto>already_there');
    quest.addStep(taskGoto);
    const taskKill = new Task('<kill>kill');
    quest.addStep(taskKill);
    return quest;
};

QuestGen.prototype._questMeetsReqs = function(quest, conf) {
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
};

QuestGen.prototype.generateQuest = function(rules, rule) {
    if (!this.ruleHist[rule]) {this.ruleHist[rule] = 1;}
    else {this.ruleHist[rule] += 1;}

    if (rule === this.startRule) {
        debug('New (sub)-quest will be generated');
        this.currQuest = new Quest();
        this.stack.push(this.currQuest);
    }

    const randRule = chooseRandomRule(rules[rule]);
    if (Array.isArray(randRule)) {
        const steps = randRule.map(this.generateTerm.bind(this, rules));
        this._checkIfQuestOver(rule);
        return steps.join('|');
    }

    debug(`generateQuest end reached, return |${randRule}|`);
    this._checkIfQuestOver(rule);
    return randRule;
};

QuestGen.prototype.generateTerm = function(rules, term) {
    if (!term.text) {
        const json = JSON.stringify(rules);
        throw new Error('Null/undef term.text with rules|', json, '|');
    }

    if (term.type === 'terminal') {
        this.currQuest.addStep(new Task(term.text));
        return term.text;
    }

    debug(`calling generate() with term.text |${term.text}|`);
    return this.generateQuest(rules, term.text);
};

QuestGen.prototype._checkIfQuestOver = function(rule) {
    if (rule === this.startRule) {
        debug('Finishing current quest');
        const qLen = this.stack.length;
        if (qLen > 1) {
            const subQuest = this.stack.pop();
            this.currQuest = this.stack[this.stack.length - 1];
            this.currQuest.addStep(subQuest);
        }
    }
};

//---------------------------------------------------------------------------
// QUESTDATA for storing quest mapping information
//---------------------------------------------------------------------------

const QuestData = function() {
    this._stacks = {};
    this.path = [];
    this._ptr = {}; // Pointers for iteration
};

QuestData.mapStepToType = {
    capture: 'entity',
    escort: 'entity',
    exchange: 'item',
    damage: 'entity',
    get: 'item',
    give: 'entity',
    kill: 'entity',
    listen: 'entity',
    location: 'place',
    losebattle: 'place',
    read: 'item',
    repair: 'element',
    report: 'entity',
    rescue: 'entity',
    spy: 'entity',
    steal: 'item',
    use: 'item',
    winbattle: 'place'
};

/* Adds one target for the quest. */
QuestData.prototype.addTarget = function(targetType, obj) {
    if (!RG.isEntity(obj)) {
        if (!obj.createTarget) {
            const json = JSON.stringify(obj);
            RG.err('QuestData', 'add',
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
};

QuestData.prototype.numSteps = function() {
    const num = this.path.length;
    return num;
};

QuestData.prototype.keys = function() {
    const keys = Object.keys(this._stacks);
    return keys;
};

QuestData.prototype.getPathTypes = function() {
    return this.path.map(pair => pair.type);
};

QuestData.prototype.getPathTargets = function() {
    return this.path.map(pair => pair.target);
};

QuestData.prototype.pop = function(targetType) {
    if (this._stacks[targetType]) {
        return this._stacks[targetType].pop();
    }
    return null;
};

/* Reset iterators of the quest data. */
QuestData.prototype.resetIter = function() {
    this.keys().forEach(targetType => {
        this._ptr[targetType] = 0;
    });
};

QuestData.prototype.next = function(targetType) {
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
};

QuestData.prototype.getCurrent = function(targetType) {
    if (this._stacks[targetType]) {
        const stack = this._stacks[targetType];
        return stack[stack.length - 1];
    }
    return null;
};

/* Returns human-readable description of the quest. */
QuestData.prototype.getDescr = function() {
    this.resetIter();
    let res = '';
    this.path.forEach(pair => {
        const step = pair.type;
        const value = this.next(step);
        const name = RG.getName(value);
        res += step + ' ' + name + '. ';
    });
    return res;
};

QuestData.prototype.toJSON = function() {
    const path = [];
    this.path.forEach(step => {
        const refType = QuestData.mapStepToType[step.type];
        if (refType) {
            if (step.target.getID) {
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
};

//---------------------------------------------------------------------------
// OBJECT QUEST-POPULATE
//---------------------------------------------------------------------------

const QuestPopulate = function() {
    this.resetData();
    this.questList = [];
    this.conf = {
        maxLength: 10,
        minLength: 1,
        minQuests: 1,
        maxQuests: 2,
        numQuestsPerZone: 1
    };

    this.questTargetCallback = {
        repair: this.handleRepair = this.handleRepair.bind(this)
    };
};

QuestPopulate.prototype.resetData = function() {
    this.questData = {quests: []};
    this._cleanup = [];
    this.flags = {
        alreadyKnowIt: false,
        listen: false,
        read: false
    };

    // Data which must be stored between different quest items
    this._data = {
        item: [],
        place: [],
        actor: [],
        element: [],
        read: []
    };

    // Stores the refs between tasks like get-give
    this._questCrossRefs = new Map();
};

/* Returns previous item of given type. Type refers to actor/item/place/element.
 * */
QuestPopulate.prototype.getPrevType = function(type) {
    if (this._data.hasOwnProperty(type)) {
        const n = this._data[type].length;
        return this._data[type][n - 1];
    }
    return null;
};

/* Creates quests for given tile x,y in area in world. Returns the number
 * of quests successfully created. */
QuestPopulate.prototype.createQuests = function(world, area, x, y) {
    const areaTile = area.getTileXY(x, y);
    const cities = areaTile.getZones('City');
    let numCreated = 0;
    cities.forEach(city => {
        numCreated += this.createQuestsForZone(city, areaTile);
    });
    return numCreated;
};

/* Creates quests for given zone located in the areaTile. Returns the number
 * of quests correctly created.
 */
QuestPopulate.prototype.createQuestsForZone = function(zone, areaTile) {
    const numQuests = this.conf.numQuestsPerZone || 1;
    let numCreated = 0;
    for (let i = 0; i < numQuests; i++) {
        const questGen = new QuestGen();
        const quest = questGen.genQuestWithConf(this.conf);
        this.resetData();
        if (this.mapQuestToResources(quest, zone, areaTile)) {
            this.addQuestComponents(zone);
            ++numCreated;
        }
    }
    return numCreated;
};

/* Tries to map a quest to world resources. Returns false if does not succeed.
 * Can happen due to missing actors, levels or items etc. */
QuestPopulate.prototype.mapQuestToResources = function(quest, zone, areaTile) {
    this.currQuest = new QuestData();
    this.questData.quests.push(this.currQuest);
    const level = RNG.arrayGetRand(zone.getLevels());
    this.currQuest.addTarget('location', level);

    let ok = true;

    quest.getSteps().forEach(step => {
        const currLoc = this.currQuest.getCurrent('location');
        if (step.isQuest()) {
            // Recursive call for sub-quests, check the current
            // location for the quest
            ok = ok && this.mapQuestToResources(step, currLoc, areaTile);
        }
        else {
            ok = ok && this.mapTask(quest, step, currLoc, areaTile);
        }
    });

    if (!ok) {
        this.cleanUpFailedQuest(quest, zone);
        return false;
    }

    const nQuests = this.questData.quests.length;
    if (nQuests > 1) {
        this.questList.unshift(this.questData.quests.pop());
        this.currQuest = this.questData.quests[nQuests - 2];
    }
    else {
        this.questList.unshift(this.currQuest);
    }
    // Finally, add a quest to quest giver
    console.log('Created quest: ' + this.currQuest.getDescr());
    return true;
};

/* Maps a single task to resources. Prev. or next step may also affect mapping.
 * */
QuestPopulate.prototype.mapTask = function(quest, task, zone, areaTile) {
    console.log('mapTask taskType is now', task.getTaskType());
    let ok = false;
    switch (task.getTaskType()) {
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
            // Defend city/place from an assault
            break;
        }
        case 'escort': {
            const actorToEscort = this.getActorToEscort();
            if (actorToEscort) {
                this.currQuest.addTarget('escort', actorToEscort);
                ok = true;
            }
            // Get a rescued NPC to follow you to a place
            break;
        }
        case 'experiment': {
            // TODO decide what this should do
            break;
        }
        case '<get>already_have_it': {
            // Find a item from player inventory and use it
            const item = this.getAlreadyOwnedItem();
            if (item) {
                this.currQuest.addTarget('get', item);
                ok = true;
                this._data.item.push(item);
            }
            break;
        }
        case '<get>gather': {
            // Create a random item (not to be stolen) to gather TODO
            const newItem = this.getItemToSteal();
            if (newItem) {
                this.currQuest.addTarget('get', newItem);
                ok = true;
                this._data.item.push(newItem);
            }
            break;
        }
        case '<get>exchange': {
            // Find a shop in the town, and add an item there
            const item = this.getItemToExchange();
            if (item) {
                this.currQuest.addTarget('exchange', item);
                ok = true;
                this._data.item.push(item);
            }
            break;
        }
        case 'give': {
            // FInd previous item in the quest data, and assign task
            const location = this.currQuest.getCurrent('location');
            const level = location;
            const actorToGive = this.getActorForQuests(level.getActors());
            this.currQuest.addTarget('give', actorToGive);
            ok = true;
            // to give it to someone
            break;
        }
        case '<goto>already_there': {
            // Don't add current location because it's already in the stack
            // this.currQuest.addTarget('location', zone);
            ok = true;
            break;
        }
        case '<goto>explore': {
            // Same as <goto>goto at the moment
            const newLocation = this.getNewLocation(zone, areaTile);
            this.currQuest.addTarget('location', newLocation);
            ok = true;
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
                this._questCrossRefs.set(this.getPrevType('read'), newLocation);
            }
            break;
        }
        case '<kill>kill': {
            const location = this.currQuest.getCurrent('location');
            const level = location;
            const actorToKill = this.getActorForQuests(level.getActors());
            this.currQuest.addTarget('kill', actorToKill);
            ok = true;
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
            this.currQuest.addTarget('listen', actorToListen);
            this.flags.listen = true;
            this._data.listen = actorToListen;
            ok = true;
            break;
        }
        case 'losebattle': {
            this.currQuest.addTarget('losebattle',
                {createTarget: 'createBattle', args: [zone, areaTile]});
            ok = true;
            break;
        }
        case '<learn>read': {
            const readTarget = this.getReadTarget();
            if (readTarget) {
                this._data.read.push(readTarget);
                this.flags.read = true;
                this.currQuest.addTarget('read', readTarget);
            }
            // this._data.read =
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
        case '<spy>report': {
            const actor = this.getActorForReport();
            if (actor) {
                this.currQuest.addTarget('report', actor);
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
            const newLocation = this.getNewLocation(zone, areaTile);
            this.currQuest.addTarget('location', newLocation);
            ok = true;
            break;
        }
        case '<steal>take': {
            const newItem = this.getItemToSteal();
            this.currQuest.addTarget('steal', newItem);
            ok = true;
            this._data.item.push(newItem);
            break;
        }
        case 'take': {
            const newItem = this.getItemToSteal();
            this.currQuest.addTarget('take', newItem);
            ok = true;
            this._data.item.push(newItem);
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
    return ok;
};

/* Returns an actor from the given array, who is suitable as quest target
 * or quest giver. */
QuestPopulate.prototype.getActorForQuests = function(actors) {
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
};

QuestPopulate.prototype.getActorForReport = function() {
    const location = this.currQuest.getCurrent('location');
    const actors = location.getActors();
    return this.getActorForQuests(actors);
};

QuestPopulate.prototype.getActorToSpy = function() {
    const location = this.currQuest.getCurrent('location');
    const actors = location.getActors();
    return this.getActorForQuests(actors);
};

/* Extracts an actor from current location. */
QuestPopulate.prototype.getActorToListen = function() {
    const level = this.currQuest.getCurrent('location');
    const actorToListen = this.getActorForQuests(level.getActors());
    return actorToListen;
};

QuestPopulate.prototype.getActorToEscort = function() {
    const level = this.currQuest.getCurrent('location');
    const actorToEscort = this.getActorForQuests(level.getActors());
    return actorToEscort;
};

/* Returns true if given actor can be used as quest target/giver. */
function isOkForQuest(actor) {
    return !(
        actor.isPlayer() && actor.has('QuestTarget')
        && actor.has('QuestGiver')
    );
}

QuestPopulate.prototype.getAlreadyOwnedItem = function() {
    const location = this.currQuest.getCurrent('location');
    const actors = location.getActors();
    const player = actors.find(a => a.isPlayer && a.isPlayer());
    if (player) {
        const items = player.getInvEq().getInventory().getItems();
        return RNG.arrayGetRand(items);
    }
    return null;
};

QuestPopulate.prototype.getItemToSteal = function() {
    // TODO this cannot create the item directly because if further
    // resource mapping fails, we need to delete the created item
    const location = this.currQuest.getCurrent('location');
    const item = new RG.Item.Base('Quest trophy');
    Placer.addEntityToCellType(item, location, c => c.hasHouse());
    this._cleanup.push({location, item});
    return item;
};

QuestPopulate.prototype.getReadTarget = function(zone, areaTile) {
    const location = this.currQuest.getCurrent('location');
    return {
        createTarget: 'createBook', args: [location, zone, areaTile]
    };
};

QuestPopulate.prototype.getItemToUse = function() {
    // TODO this cannot create the item directly because if further
    // resource mapping fails, we need to delete the created item
    const location = this.currQuest.getCurrent('location');
    const items = location.getItems();
    const useItems = items.filter(item => item.hasOwnProperty('useItem'));
    if (useItems.length > 0) {
        return RNG.arrayGetRand(useItems);
    }

    const parser = ObjectShell.getParser();
    const useItem = parser.createRandomItem(item => item.use);
    if (useItem) {
        return useItem;
    }
    return null;
};

/* Finds a target to repair. */
QuestPopulate.prototype.getRepairTarget = function() {
    const location = this.currQuest.getCurrent('location');
    const elems = location.getElements();
    const elemsToRepair = elems.filter(e => (
        e.getType() === 'door'
    ));
    if (elemsToRepair.length > 0) {
        return RNG.arrayGetRand(elemsToRepair);
    }
    return null;
};

QuestPopulate.prototype.getEntityToDamage = function() {
    const location = this.currQuest.getCurrent('location');
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
};

QuestPopulate.prototype.getActorToCapture = function() {
    const location = this.currQuest.getCurrent('location');
    const actors = location.getActors();
    return this.getActorForQuests(actors);
};

QuestPopulate.prototype.getItemToExchange = function() {
    const location = this.currQuest.getCurrent('location');
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
};

/* Returns a level from a new zone (which is not 'zone' arg). */
QuestPopulate.prototype.getNewLocation = function(zone, areaTile) {
    const zones = areaTile.getZones();
    let newZone = RNG.arrayGetRand(zones);
    if (zones.length > 1) {
        RG.while(() => newZone.getID() === zone.getID(), () => {
            newZone = RNG.arrayGetRand(zones);
        }, 20);
    }
    return RNG.arrayGetRand(newZone.getLevels());
};

//---------------------------------------------------------------------------
// ADDING QUEST-RELATED COMPONENTS (last stage)
// - should be done only if mapping of quest to resources succeeds
//---------------------------------------------------------------------------

QuestPopulate.supportedKeys = new Set([
    'kill', 'location', 'listen', 'give', 'report', 'get', 'steal', 'use',
    'repair', 'damage', 'winbattle', 'losebattle', 'escort', 'spy', 'exchange'
]);

QuestPopulate.prototype.addQuestComponents = function(zone) {
    console.log('Adding quest components now');
    console.log('QuestList', JSON.stringify(this.questList));
    this.questList.forEach(questData => {
        questData.resetIter();

        questData.keys().forEach(key => {
            if (QuestPopulate.supportedKeys.has(key)) {
                let target = questData.next(key);
                while (target) {
                    // Custom create function can be given such as createBattle
                    // or createBook, which is used to create the target item
                    // first
                    if (target.createTarget) {
                        const {createTarget, args} = target;
                        if (typeof this[createTarget] !== 'function') {
                            RG.err('QuestPopulate', 'addQuestComponents',
                                `${createTarget} not a func in QuestPopulate`);
                        }

                        const targetObj = this[createTarget](target, ...args);
                        this.setAsQuestTarget(key, targetObj);
                    }
                    else {
                        this.setAsQuestTarget(key, target);
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
        const level = RNG.arrayGetRand(zone.getLevels());
        const questGiver = this.getActorForQuests(level.getActors());
        const giverComp = new RG.Component.QuestGiver(questData.getDescr());
        this.addTargetsToGiver(giverComp, questData);

        questGiver.add(giverComp);
        this.addUniqueName(questGiver);
        console.log('QuestGiver will be ' + questGiver.getName());
    });

};

QuestPopulate.prototype.addTargetsToGiver = function(giverComp, questData) {
    const questKeys = questData.keys();
	questData.resetIter();

	questKeys.forEach(key => {
		let questTarget = questData.next(key);
		while (questTarget) {
            this._checkTargetValidity(questTarget);
			const targetComp = questTarget.get('QuestTarget');
			if (targetComp) {
				const [target, targetType] = [targetComp.getTarget(),
					targetComp.getTargetType()];
				giverComp.addTarget(targetType, target);
			}
            else {
                const json = JSON.stringify(questTarget);
                RG.err('QuestPopulate', 'addTargetsToGiver',
                    `No QuestTarget found from target ${json}`);
            }
			questTarget = questData.next(key);
		}
	});
	questData.resetIter();
};

QuestPopulate.prototype._checkTargetValidity = function(target) {
    if (!RG.isEntity(target)) {
        const msg = 'Non-Entity given: ' + JSON.stringify(target);
        RG.err('QuestPopulate', '_checkTargetValidity', msg);
    }
};

QuestPopulate.prototype.setAsQuestTarget = function(key, target) {
    if (!target) {
        const msg = `Null/undef target with key |${key}|`;
        RG.err('QuestPopulate', 'setAsQuestTarget', msg);
    }

    if (typeof target.getID !== 'function') {
        let msg = `questTarget without getID() given with key ${key}:`;
        msg += ` ${JSON.stringify(target)}`;
        RG.err('QuestPopulate', 'setAsQuestTarget', msg);
    }

    const qTarget = new RG.Component.QuestTarget();
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
};

QuestPopulate.prototype.handleRepair = function(target) {
    target.add(new RG.Component.Broken());
};

QuestPopulate.prototype.addUniqueName = function(target) {
    if (!target.has('Named')) {
        target.add(new RG.Component.Named());
    }
    const named = target.get('Named');
    if (RG.isActor(target)) {
        named.setUniqueName(Names.getActorName());
    }
    else if (RG.isItem(target)) {
        named.setUniqueName('Quest item ' + RNG.getUniformInt(0, 1000000));
    }
};

QuestPopulate.prototype.createBattle = function(target, zone, areaTile) {
    const battleZones = areaTile.getZones('BattleZone');
    if (battleZones.length > 0) {
        const zone = RNG.arrayGetRand(battleZones);
        const level = zone.getLevels()[0];
        return level;
    }
    else {
        const eventArgs = {
            areaTile, zone
        };
        RG.POOL.emitEvent(RG.EVT_CREATE_BATTLE, eventArgs);
        if (eventArgs.response) {
            return eventArgs.response.level;
        }
    }
    console.log(target, zone, areaTile);
    return null;
};

QuestPopulate.prototype.createBook = function(target, level) {
    const book = new RG.Item.Book();
    if (this._questCrossRefs.has(target)) {
        level.addItem(book);
        const location = this._questCrossRefs.get(target);
        if (!location) {
            RG.err('QuestPopulate', 'createBook',
                'No location found for book');
        }
        // TODO setText() some info about the location etc
        const placeName = location.getParent().getName();
        const bookText = ['Quest hint where to go:'];
        bookText.push('You should go to place called ' + placeName);
        book.setText(bookText);
    }
    else {
        const crossRefs = JSON.stringify(this._questCrossRefs);
        RG.err('QuestPopulate', 'createBook',
            `No cross-refs set for book. refs: ${crossRefs}`);
    }

};

QuestPopulate.prototype.cleanUpFailedQuest = function() {
    this._cleanup.forEach(cleanupObj => {
        const {location} = cleanupObj;
        if (cleanupObj.item) {
            const [x, y] = cleanupObj.item.getXY();
            location.removeItem(cleanupObj.item, x, y);
        }
        else if (cleanupObj.actor) {
            const [x, y] = cleanupObj.actor.getXY();
            location.removeActor(cleanupObj.actor, x, y);
        }
        else if (cleanupObj.element) {
            const [x, y] = cleanupObj.element.getXY();
            location.removeActor(cleanupObj.element, x, y);
        }
    });
};

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

module.exports = {
    Quest, Task, QuestData, QuestGen, QuestPopulate
};
