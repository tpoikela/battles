
import { expect } from 'chai';

const {Quest, QuestGen, QuestPopulate}
    = require('../../../client/src/quest-gen');

const FactoryWorld = require('../../../client/src/factory.world');

const questGram1 = '<QUEST> ::= "goto" "kill";';

const questGram2 =
`<QUEST> ::= <goto> "kill";
<goto> ::= <subquest> "goto" | "goto";
<subquest> ::= "goto" | "goto" <QUEST>;`;

const questGram3 =
`<QUEST> ::= <goto> <get> <learn>;
<goto> ::= <learn> "goto_there";
<get> ::= <goto> "get_it";
<learn> ::= "learn_it";`;

describe('QuestGen', () => {
    let questGen = null;

    beforeEach(() => {
        questGen = new QuestGen();
    });

    it('can create simple quests', () => {
        const rules = QuestGen.parse(questGram1);
        const conf = {rules};

        const quest = questGen.genQuestWithConf(conf);
        expect(quest).to.be.instanceof(Quest);
        expect(quest.numQuests()).to.equal(1);
        expect(quest.numTasks()).to.equal(2);
        console.log(JSON.stringify(quest));
    });

    it('can create quests with sub-quests', () => {
        const rules = QuestGen.parse(questGram2);
        const conf = {rules, minQuests: 2};
        const quest = questGen.genQuestWithConf(conf);
        console.log(JSON.stringify(quest));
        expect(quest.numQuests()).to.be.above(1);
    });

    it('creates a single task from each term', () => {
        const rules = QuestGen.parse(questGram3);
        const conf = {debug: true, rules};
        const quest = questGen.genQuestWithConf(conf);
        console.log(JSON.stringify(quest));
        expect(quest.numTasks()).to.equal(6);
    });
});


describe('QuestPopulate', () => {

    it('is used to map quests to resources', () => {
        const questPopul = new QuestPopulate();
        const factWorld = new FactoryWorld();
        const city = factWorld.createCity({
            name: 'QuestCity', nQuarters: 1,
            quarter: [
                {name: 'QuestQuarter', nLevels: 1}
            ]
        });
        const taskList = ['<goto>already_there', '<kill>kill'];
        const quest = new Quest('Kill an actor', taskList);
        questPopul.mapQuestToResources(quest, city, null);
        questPopul.addQuestComponents(city);

        const level = city.getLevels()[0]; // Only one
        const actors = level.getActors();

        let hasGiver = false;
        let hasTarget = false;
        actors.forEach(actor => {
            console.log('Checking actor', actor.getName());
            if (actor.has('QuestTarget')) {hasTarget = true;}
            if (actor.has('QuestGiver')) {hasGiver = true;}
        });

        expect(hasGiver).to.equal(true);
        expect(hasTarget).to.equal(true);
    });
});
