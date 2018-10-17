
const chai = require('chai');

const RG = require('../../../client/src/rg');
const Actor = require('../../../client/src/actor');
const Component = require('../../../client/src/component');
const EventPool = require('../../../client/src/eventpool');
const System = require('../../../client/src/system');
const Quests = require('../../../client/src/quest-gen');

const {Quest, QuestPopulate} = Quests;

const RGTest = require('../../roguetest');
const chaiBattles = require('../../helpers/chai-battles.js');

const expect = chai.expect;
chai.use(chaiBattles);
const {addQuestEvent} = System.Quest;

describe('System.Quest', () => {

    let questPopul = null;
    let systems = null;
    let sysBaseAction = null;
    let sysQuest = null;
    let sysDamage = null;
    let pool = null;

    beforeEach(() => {
        pool = new EventPool();
        questPopul = new QuestPopulate();
        sysQuest = new System.Quest(['GiveQuest', 'QuestCompleted',
            'QuestTargetEvent'], pool);

        sysBaseAction = new System.BaseAction(['Pickup', 'Read', 'Give'], pool);
        sysDamage = new System.Damage(['Damage'], pool);
        systems = [];
        systems.push(sysBaseAction);
        systems.push(sysQuest);
        systems.push(sysDamage);
    });

    it('Handles listen/report quests', () => {
        const area = RGTest.createTestArea();
        const city = area.getTileXY(0, 0).getZones('City')[0];
        const level = city.getLevels()[0];
        console.log('There N actors', level.getActors().length);

        //---------------------
        // LISTEN-REPORT QUEST
        //---------------------
		const reportQuestTasks = ['<goto>already_there', 'listen',
			'<goto>already_there', 'report'];
		const reportQuest = new Quest('Report info to actor', reportQuestTasks);
		questPopul.mapQuestToResources(reportQuest, city, null);
		questPopul.addQuestComponents(city);

        const quester = new Actor.Rogue('hero');
        level.addActor(quester, 1, 1);
		const actors = level.getActors();

		let giver = actors.find(actor => actor.has('QuestGiver'));
		let giverComp = giver.get('QuestGiver');
		giverComp.setReward({type: 'item', name: 'Ruby glass mace'});

        const qTargets = actors.filter(a => a.has('QuestTarget'));
        expect(qTargets).to.have.length(2);

        const listenTarget = actors.find(a => a.has('QuestInfo'));
        expect(listenTarget).to.not.be.empty;
        const reportTarget = actors.find(a => a.has('QuestReport'));
        expect(reportTarget).to.not.be.empty;

        giveQuest(giver, quester);
        expect(giverComp.getHasGivenQuest()).to.equal(false);
        sysQuest.update();
        expect(giverComp.getHasGivenQuest()).to.equal(true);

        expect(quester).to.have.component('Quest');
        expect(quester).to.not.have.component('QuestInfo');

        let qTarget = listenTarget.get('QuestTarget');
        const listenArgs = {src: listenTarget,
            info: listenTarget.get('QuestInfo')};
        addQuestEvent(quester, qTarget, 'listen', listenArgs);
        sysQuest.update();
        expect(quester).to.have.component('QuestInfo');

        qTarget = reportTarget.get('QuestTarget');
        const reportArgs = {info: quester.get('QuestInfo')};
        addQuestEvent(quester, qTarget, 'report', reportArgs);
        sysQuest.update();

        const questComp = quester.get('Quest');
        expect(questComp.isCompleted()).to.equal(true);

        let questCompleted = new Component.QuestCompleted();
        questCompleted.setGiver(giver);
        quester.add(questCompleted);

        expect(giverComp.getHasGivenReward()).to.equal(false);
        sysQuest.update();
        expect(giverComp.getHasGivenReward()).to.equal(true);

        cleanupQuests(giver);
        //---------------------
        // KILL QUEST
        //---------------------
        const killQuestTasks = [
            '<goto>already_there', '<kill>kill'
        ];
		const killQuest = new Quest('Kill an actor', killQuestTasks);
        questPopul = new QuestPopulate();
		questPopul.mapQuestToResources(killQuest, city, null);
		questPopul.addQuestComponents(city);

        const killTarget = getQuestTarget('kill', actors);
        expect(killTarget).to.not.be.empty;

		giver = actors.find(actor => actor.has('QuestGiver'));
		giverComp = giver.get('QuestGiver');
		giverComp.setReward({type: 'spell', name: 'FrostBolt'});

        giveQuest(giver, quester);
        sysQuest.update();

        const dmg = new Component.Damage(200, RG.DMG.MELEE);
        dmg.setSource(quester);
        killTarget.add(dmg);
        sysDamage.update();
        sysQuest.update();

        const newQuest = quester.getList('Quest')[1];
        expect(newQuest.isCompleted()).to.equal(true);

        questCompleted = new Component.QuestCompleted();
        questCompleted.setGiver(giver);
        quester.add(questCompleted);
        expect(giverComp.getHasGivenReward()).to.equal(false);
        sysQuest.update();
        expect(giverComp.getHasGivenReward()).to.equal(true);

        cleanupQuests(giver, quester);

        //---------------------------
        // LEARN-GOTO with sub-quest
        //---------------------------
        const subQuestTasks = ['<learn>read', '<goto>goto'];
        const subQuest = new Quest('Learn goto location', subQuestTasks);
        const questTasks = ['<goto>already_there', subQuest,
            'report'];
        const title = 'Learn where to goto by reading and report';
        const mainQuest = new Quest(title, questTasks);

        const areaTile = area.getTileXY(0, 0);
        questPopul = new QuestPopulate();
		let ok = questPopul.mapQuestToResources(mainQuest, city, areaTile);
        expect(ok, 'Quest mapped OK').to.equal(true);

		questPopul.addQuestComponents(city);

        const bookToRead = getQuestTarget('read', level.getItems());
        expect(bookToRead).to.not.be.empty;

        const mainGiver = actors.find(a => (
            a.has('QuestGiver') && !a.has('QuestTarget')));
        const subGiver = actors.find(a => (
            a.has('QuestGiver') && a.has('QuestTarget')));
        expect(mainGiver).to.not.be.empty;
        expect(subGiver).to.not.be.empty;

        giveQuest(mainGiver, quester);
        sysQuest.update();
        giveQuest(subGiver, quester);
        sysQuest.update();

        const questComps = quester.getList('Quest');
        const mainQuestComp = questComps[0];
        const subQuestComp = questComps[1];
        expect(questComps).to.have.length(2);
        // console.log(questComps[0].toString());
        console.log('subQuest is', subQuestComp.toString());

        const readComp = new Component.Read();
        readComp.setReadTarget(bookToRead);
        quester.add(readComp);
        RGTest.updateSystems(systems);
        expect(quester).to.not.have.component('Read');

        const dungeon = areaTile.getZones('Dungeon')[0];
        const dungLevel = dungeon.getLevels()[0];
        expect(dungLevel).to.have.component('QuestTarget');

        const qEvent = new Component.QuestTargetEvent();
        qEvent.setEventType('goto');
        qEvent.setTargetComp(dungLevel.get('QuestTarget'));
        quester.add(qEvent);
        sysQuest.update();
        console.log('targets', JSON.stringify(subQuestComp.getQuestTargets()));

        expect(subQuestComp.isCompleted()).to.equal(true);

        const reportActor = actors.find(a => (a.has('QuestReport') &&
            a.get('QuestTarget').getQuestID() === questComps[0].getQuestID()
        ));
        qTarget = reportActor.get('QuestTarget');
        addQuestEvent(quester, qTarget, 'report');
        sysQuest.update();

        const mainTargets = mainQuestComp.getQuestTargets();
        console.log('main targets', JSON.stringify(mainTargets));
        expect(mainQuestComp.isCompleted()).to.equal(true);

        cleanupQuests(mainGiver, quester);
        cleanupQuests(subGiver);

        //---------------------------
        // GET-GATHER quest
        //---------------------------
        const getGiveTasks = ['<get>gather', 'give'];
        const getGiveQuest = new Quest('Get stuff and give', getGiveTasks);
        console.log(getGiveQuest.getSteps());
        questPopul = new QuestPopulate();
        questPopul.setDebug(true);
		ok = questPopul.mapQuestToResources(getGiveQuest, city, null);
        expect(ok, 'Get-Give Quest mapped OK').to.equal(true);
		questPopul.addQuestComponents(city);

        const questGiver = actors.find(a => (
            a.has('QuestGiver')));
        expect(questGiver).to.not.be.empty;

        const actorToGive = getQuestTarget('give', actors);
        expect(actorToGive).to.not.be.empty;
        expect(quester).to.not.have.component('Quest');
        giveQuest(questGiver, quester);
        sysQuest.update();
        expect(quester).to.have.component('Quest');

        const questItem = getQuestTarget('get', level.getItems());
        expect(questItem).to.not.be.empty;

        const [x, y] = questItem.getXY();
        level.moveActorTo(quester, x, y);
        const pickupItem = new Component.Pickup();
        quester.add(pickupItem);
        RGTest.updateSystems(systems);

        const giveComp = new Component.Give();
        giveComp.setItem(questItem);
        giveComp.setGiveTarget(actorToGive);
        quester.add(giveComp);
        RGTest.updateSystems(systems);

        const currQuest = quester.get('Quest');
        console.log('Get-Give:', JSON.stringify(currQuest.getQuestTargets()));
        console.log('currQuest:', JSON.stringify(currQuest));
        expect(currQuest.isCompleted()).to.equal(true);

    });
});

function getQuestTarget(type, entities) {
    return entities.find(entity => (
        entity.has('QuestTarget') &&
        entity.get('QuestTarget').getTargetType() === type
    ));
}

function giveQuest(giver, quester) {
    const questChatObj = giver.get('QuestGiver').chatObj;
    questChatObj.setTarget(quester);
    questChatObj.questCallback();
}

function cleanupQuests(giver, quester) {
    giver.remove('QuestGiver');
    if (quester) {quester.removeAll('Quest');}
}
