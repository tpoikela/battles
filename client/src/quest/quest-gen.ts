
import dbg = require('debug');
const debug = dbg('bitn:quest-gen');
import {Random} from '../random';
import prettybnf = require('prettybnf');

import {Quest, Task} from './quest-task';
import {QuestGrammar} from '../../data/quest-grammar';
const questGrammar = QuestGrammar.grammar;

const RNG = Random.getRNG();

//---------------------------------------------------------------------------
// QUESTGEN for generating quest sequences procedurally
//---------------------------------------------------------------------------
interface QuestGenConf {
    [key: string]: any;
}

function extract(key, obj) {
    return obj[key];
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

    public rng: Random;
    public stack: Quest[];
    public currQuest: Quest;
    public ruleHist: any; // TODO fix typings
    public startRule: string;

    constructor(rng?: Random) {
        this._init();
        this.rng = rng || RNG;
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
        const [nameRule] = this.chooseRandomRule(questRules[motive]);
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
        const randRule = this.chooseRandomRule(rules[rule]);
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

    /* Chooses a random rule from arrOfRules. */
    protected chooseRandomRule(arrOfRules: any[]): any | null {
        if (Array.isArray(arrOfRules)) {
            const result = this.rng.arrayGetRand(arrOfRules);
            debug('chose next rule at RANDOM:', result);
            return result;
        }
        else {
            debug(`chooseRandomRule() not an ARRAY: |${arrOfRules}`);
        }
        return null;
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
