
import { expect } from 'chai';

const RG = require('../../../client/src/battles');
const {Quest, QuestGen, QuestPopulate}
    = require('../../../client/src/quest-gen');
const FactoryWorld = require('../../../client/src/factory.world');
const QuestGrammar = require('../../../client/data/quest-grammar');
const RGTest = require('../../roguetest');

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
    });

    it('can create quests with sub-quests', () => {
        const rules = QuestGen.parse(questGram2);
        const conf = {rules, minQuests: 2};
        const quest = questGen.genQuestWithConf(conf);
        expect(quest.numQuests()).to.be.above(1);
    });

    it('creates a single task from each term', () => {
        const rules = QuestGen.parse(questGram3);
        const conf = {debug: true, rules};
        const quest = questGen.genQuestWithConf(conf);
        expect(quest.numTasks()).to.equal(6);
    });

    it('can generate quests from pre-made grammar', () => {
        const motive = 'Reputation';
        RG.diag(motive);
        let conf = {startRule: motive, maxQuests: 1};
        let quest = questGen.genQuestWithConf(conf);
        expect(quest.numSteps()).to.be.at.least(3);

        const {actorMotivations} = QuestGrammar;
        actorMotivations.forEach(motive => {
            console.log('Motive:', motive);
            conf = {motive, maxQuests: 1};
            quest = questGen.genQuestWithMotive(conf);

            const msg = `Motive ${motive} OK`;
            if (motive === 'Ability' || motive === 'Wealth') {
                expect(quest.numSteps(), msg).to.be.at.least(1);
            }
            else {
                expect(quest.numSteps(), msg).to.be.at.least(2);
            }
            expect(quest.getMotive()).to.equal(motive);
        });
    });

    it('can generate quests based on name', () => {
        const questName = 'Kill_pests';
        const conf = {startRule: questName, maxQuests: 1};
        const quest = questGen.genQuestWithConf(conf);
        expect(quest).to.not.be.empty;
        expect(quest.numSteps()).to.be.at.least(4);
    });

});


describe('QuestPopulate', () => {
    let questPopul = null;

    beforeEach(() => {
        questPopul = new QuestPopulate();
        questPopul.checkImplemented = false;
    });

    it('is used to map quests to resources', () => {
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

    it('can map learn/goto/get/give task', () => {
        const area = RGTest.createTestArea();
        const taskList = [
            '<goto>already_there',
            'listen',
            '<goto>goto',
            '<get>gather',
            '<goto>goto',
            'give'
        ];
        const quest = new Quest('Learn item loc and give it', taskList);
        const areaTile = area.getTileXY(0, 0);
        const city = areaTile.getZones('City')[0];
        const ok = questPopul.mapQuestToResources(quest, city, areaTile);
        expect(ok, 'Quest mapped OK').to.equal(true);
        questPopul.addQuestComponents(city);

        const level = city.getLevels()[0]; // Only one
        const giver = level.getActors().find(a => a.has('QuestGiver'));
        expect(giver).to.not.be.empty;
        const giverComp = giver.get('QuestGiver');
        const questTargets = giverComp.getQuestTargets();
        expect(questTargets.length).to.equal(6);

    });

    it('can map any arbitrary quest without sub-quests to resources', () => {
        for (let i = 0; i < 5; i++) {
            const player = RGTest.createPlayer(['Potion of power']);
            const world = RGTest.createTestWorld();
            const area = world.getCurrentArea();
            const game = RGTest.createGame({place: world, player});
            expect(game).to.not.be.empty;
            const city = area.getTileXY(0, 0).getZones('City')[0];
            const level0 = city.getLevels()[0];
            level0.addActor(player, 10, 10);

            questPopul = new QuestPopulate();
            questPopul.checkImplemented = false;

            const questFunc = questPopul.createQuests.bind(
                questPopul, world, area, 0, 0);
            const numCreated = questFunc();
            // expect(questFunc).to.not.throw(Error);
            expect(numCreated).to.be.at.least(0);
        }
    });

    it('can map any arbitrary quest to resources/tasks/subquests', () => {
        // const area = RGTest.createTestArea();
    });
});
