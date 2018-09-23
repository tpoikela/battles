/* File contains code for procedural quest generation. */

const prettybnf = require('prettybnf');
const debug = require('debug')('bitn:quest-gen');
// const fs = require('fs');
const RG = require('../src/rg');
RG.Random = require('../src/random');

const questGrammar = require('./quest-grammar');

const RNG = RG.Random.getRNG();

RNG.setSeed(Date.now());

/* A task represents a part of a quest. */
const Task = function(name) {
    this.type = 'Task';
    this.name = name;
    this.isQuest = () => false;
};

/* A quest object which can be used to model quests. */
const Quest = function() {
    this.steps = []; // Atomics/sub-quests
    this.type = 'Quest';

    this.isQuest = () => true;

    this.add = function(step) {
        if (Array.isArray(step)) {
            this.steps = this.steps.concat(step);
        }
        else {
            this.steps.push(step);
        }
    };

    this.numQuests = function() {
        let sum = 1;
        this.steps.forEach(step => {
            if (step.isQuest && step.isQuest()) {
                sum += 1;
            }
        });
        return sum;
    };

    /* Returns the number of immediate tasks. */
    this.numTasks = function() {
        const numSubquests = this.numQuests() - 1;
        return this.steps.length - numSubquests;
    };
};

/* Code adapted from erratic by Daniel Connelly. */
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


/* QuestGen object. */
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
        // const tasks = steps.map(step => new Task(step));
        // this.currQuest.add(tasks);
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

const runningAsScript = !module.parent;
if (runningAsScript) {
    // The grammar is stored in the string g
    // console.log(JSON.stringify(rules));
    // console.log(generateQuest(rules, 'QUEST'));
    const questGen = new QuestGen();
    console.log(questGen.genQuestWithConf({maxLength: 10, minLength: 3}));
    console.log(JSON.stringify(questGen.stack));
    console.log(JSON.stringify(questGen.ruleHist));
}

module.exports = {
    Quest, Task, QuestGen
};
