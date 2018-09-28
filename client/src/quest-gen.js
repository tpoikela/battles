/* File contains code for procedural quest generation. */

const prettybnf = require('prettybnf');
const debug = require('debug')('bitn:quest-gen');
// const fs = require('fs');
const RG = require('../src/rg');
RG.Random = require('../src/random');

const questGrammar = require('../data/quest-grammar');

const RNG = RG.Random.getRNG();

RNG.setSeed(Date.now());

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
            this.add(task);
        });
    }
};

Quest.prototype.isTask = function() {return false;};
Quest.prototype.isQuest = function() {return true;};

Quest.prototype.getTasks = function() {
    return this.steps.filter(step => step.isTask());
};

Quest.prototype.add = function(step) {
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
    quest.add(taskGoto);
    const taskKill = new Task('<kill>kill');
    quest.add(taskKill);
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
        this.currQuest.add(new Task(term.text));
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
            this.currQuest.add(subQuest);
        }
    }
};

//---------------------------------------------------------------------------
// QUESTDATA for storing quest mapping information
//---------------------------------------------------------------------------

const QuestData = function() {
    this.stacks = {};
    this.path = [];
    this._ptr = {}; // Pointers for iteration
};

QuestData.prototype.keys = function() {
    const keys = Object.keys(this.stacks);
    console.log('QuestData keys returning', keys);
    return keys;
};

QuestData.prototype.pop = function(targetType) {
    if (this.stacks[targetType]) {
        return this.stacks[targetType].pop();
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
    if (this.stacks[targetType]) {
        if (!this._ptr.hasOwnProperty(targetType)) {
            this._ptr[targetType] = 0;
        }
        const ptrVal = this._ptr[targetType];
        if (ptrVal < this.stacks[targetType].length) {
            ++this._ptr[targetType];
            return this.stacks[targetType][ptrVal];
        }
    }
    return null;
};

QuestData.prototype.getCurrent = function(targetType) {
    if (this.stacks[targetType]) {
        const stack = this.stacks[targetType];
        return stack[stack.length - 1];
    }
    return null;
};

QuestData.prototype.add = function(targetType, obj) {
    if (!this.stacks[targetType]) {
        this.stacks[targetType] = [];
    }
    this.stacks[targetType].push(obj);
    this.path.push(targetType);
};

/* Returns human-readable description of the quest. */
QuestData.prototype.toString = function() {
    let res = '';
    this.path.forEach(step => {
        res += step + ' ' + this.next(step).getName() + '. ';
    });
    return res;
};

//---------------------------------------------------------------------------
// OBJECT QUEST-POPULATE
//---------------------------------------------------------------------------

const QuestPopulate = function() {
    this.questData = {
        quests: [] // Stack of quests, current is the last
    };
    this.questList = [];
};

QuestPopulate.prototype.createQuests = function(world, area, x, y) {
    const areaTile = area.getTileXY(x, y);
    const cities = areaTile.getZones('City');
    cities.forEach(city => {
        this.createQuestsForZone(city, areaTile);
    });
};


QuestPopulate.prototype.createQuestsForZone = function(zone, areaTile) {
    const numQuests = 1;
    for (let i = 0; i < numQuests; i++) {
        const questGen = new QuestGen();
        const quest = questGen.genQuestWithConf({maxLength: 10, minLength: 1});
        this.questData = {quests: []};
        this.mapQuestToResources(quest, zone, areaTile);
        this.addQuestComponents(zone);
    }
};

QuestPopulate.prototype.mapQuestToResources = function(quest, zone, areaTile) {
    this.currQuest = new QuestData();
    this.questData.quests.push(this.currQuest);
    this.currQuest.add('location', zone);
    quest.getSteps().forEach(step => {
        const currLoc = this.currQuest.getCurrent('location');
        if (step.isQuest()) {
            // Recursive call for sub-quests, check the current
            // location for the quest
            this.mapQuestToResources(step, currLoc, areaTile);
        }
        else {
            this.mapTask(quest, step, currLoc, areaTile);
        }
    });

    const nQuests = this.questData.quests.length;
    if (nQuests > 1) {
        this.questList.unshift(this.questData.quests.pop());
        this.currQuest = this.questData.quests[nQuests - 2];
    }
    else {
        this.questList.unshift(this.currQuest);
    }
    // Finally, add a quest to quest giver
    console.log('Created quest: ' + this.currQuest.toString());
};

/* Maps a single task to resources. Prev. or next step may also affect mapping.
 * */
QuestPopulate.prototype.mapTask = function(quest, task, zone, areaTile) {
    console.log('mapTask taskType is now', task.getTaskType());
    switch (task.getTaskType()) {
        case '<kill>kill': {
            const location = this.currQuest.getCurrent('location');
            const level = location.getLevels()[0]; // TODO make random
            const actorToKill = RNG.arrayGetRand(level.getActors());
            this.currQuest.add('kill', actorToKill);
            console.log('mapTask added an actor to kill');
            break;
        }
        case '<goto>already_there': {
            // Don't add current location because it's already in the stack
            // this.currQuest.add('location', zone);
            break;
        }
        case '<goto>goto': {
            const newLocation = this.getNewLocation(zone, areaTile);
            this.currQuest.add('location', newLocation);
            break;
        }
        default: {
            console.log(`Task type ${task.taskType} not supported yet`);
        }
    }
};


QuestPopulate.prototype.addQuestComponents = function(zone) {
    console.log('Adding quest components now');
    console.log('QuestList', JSON.stringify(this.questList));
    this.questList.forEach(questData => {
        questData.resetIter();
        questData.keys().forEach(key => {
            if (key === 'kill') {
                console.log('addQuestComponents Key was ' + key);
                let killTarget = questData.next(key);
                while (killTarget) {
                    const killComp = new RG.Component.QuestTarget();
                    killComp.setTargetType(key);
                    killComp.setTarget(killTarget);
                    killTarget.add(killComp);
                    killTarget = questData.next(key);
                }
            }
            else {
                console.log('addQuestComponents Key was ' + key);
            }
        });

        // Grab random actor and make it the quest giver
        const level = RNG.arrayGetRand(zone.getLevels());
        const questGiver = RNG.arrayGetRand(level.getActors());
        const giverComp = new RG.Component.QuestGiver(questData);
        giverComp.setQuestData(questData);
        questGiver.add(giverComp);
        console.log('QuestGiver will be ' + questGiver.getName());
    });

};

/*
const runningAsNodeScript = !module.parent && typeof window === 'undefined';
if (runningAsNodeScript) {
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
    Quest, Task, QuestGen, QuestPopulate
};