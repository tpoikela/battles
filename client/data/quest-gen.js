/* File contains code for procedural quest generation. */

const prettybnf = require('prettybnf');
const debug = require('debug')('bitn:quest-gen');
const fs = require('fs');
const RG = require('../src/rg');
RG.Random = require('../src/random');

const RNG = RG.Random.getRNG();

RNG.setSeed(Date.now());
/* Code adapted from erratic by Daniel Connelly. */
function extract(prop, o) {
    return o[prop];
}

function parse(grammar) {
    var ast = prettybnf.parse(grammar);
    var rules = {};
    ast.productions.forEach(function(prod) {
        rules[prod.lhs.text] = prod.rhs.map(extract.bind(null, 'terms'));
    });
    return rules;
}

function chooseRandomRule(things) {
    if (Array.isArray(things)) {
        // const result = things[Math.floor(Math.random() * things.length)];
        const result = RNG.arrayGetRand(things);
        debug('choose RANDOM', result);
        return result;
    }
    else {
        debug('choose() not an ARRAY:', things);
    }
    return null;
}

function generateTerm(rules, term) {
    if (!term.text) {
        const json = JSON.stringify(rules);
        throw new Error('Null/undef term.text with rules|', json, '|');
    }
    if (term.type === 'terminal') {return term.text;}
    debug('calling generate() with term.text', term.text);
    return generateQuest(rules, term.text);
}

function generateQuest(rules, rule) {
    const randRule = chooseRandomRule(rules[rule]);
    if (Array.isArray(randRule)) {
        return randRule.map(generateTerm.bind(null, rules)).join('|');
    }
    return randRule;
}

const g = fs.readFileSync('client/data/quest-grammar.g', 'utf8');
const rules = parse(g);

function genQuestWithConf(conf = {}) {
    let ok = false;
    let watchdog = 20;
    let quest = [];
    const minLength = conf.minLength || 1;
    while (!ok) {
        quest = generateQuest(rules, 'QUEST').split('|');
        if (quest.length <= conf.maxLength) {
            if (quest.length >= minLength) {
                ok = true;
            }
        }

        if (--watchdog === 0) {
            console.warn('Could not find a matching quest.');
            break;
        }
    }

    return quest;
}

// The grammar is stored in the string g
// console.log(JSON.stringify(rules));
// console.log(generateQuest(rules, 'QUEST'));
console.log(genQuestWithConf({maxLength: 10, minLength: 3}));
