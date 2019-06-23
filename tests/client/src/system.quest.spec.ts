
import chai from 'chai';
import RG from '../../../client/src/rg';

import {BaseActor, SentientActor} from '../../../client/src/actor';
import * as Component from '../../../client/src/component';
import {EventPool} from '../../../client/src/eventpool';
import {System} from '../../../client/src/system';
import {Quest, QuestPopulate} from '../../../client/src/quest';
import {Entity} from '../../../client/src/entity';
import {ItemBase} from '../../../client/src/item';
import {Random} from '../../../client/src/random';

import {RGTest} from '../../roguetest';
import {chaiBattles} from '../../helpers/chai-battles';

const expect = chai.expect;
chai.use(chaiBattles);
const {addQuestEvent} = System.Quest;

describe('System.Quest', () => {

    let questPopul = null;
    let systems = null;
    let sysBaseAction = null;
    let sysQuest = null;
    let sysDamage = null;
    let sysDeath = null;
    let pool = null;
    let quester = null;
    let area = null;
    let city = null;
    let level = null;

    beforeEach(() => {
        const rng = RGTest.createRNG(1);
        pool = EventPool.getPool();
        questPopul = new QuestPopulate({rng});
        sysQuest = new System.Quest(['GiveQuest', 'QuestCompleted',
            'QuestTargetEvent'], pool);

        sysBaseAction = new System.BaseAction(['Pickup', 'Read', 'Give'], pool);
        sysDamage = new System.Damage(['Damage'], pool);
        sysDeath = new System.Death(['DeathEvent'], pool);
        systems = [];
        systems.push(sysBaseAction);
        systems.push(sysQuest);
        systems.push(sysDamage);
        systems.push(sysDeath);

        area = RGTest.createTestArea({rng});
        city = area.getTileXY(0, 0).getZones('City')[0];
        level = city.getLevels()[0];
        quester = new SentientActor('hero');
        level.addActor(quester, 1, 1);
    });

    // Note we don't create separate it() blocks for all tests because that
    // would mean creating the test Area for each test. This has several
    // levels, so creating it may take time
    it('Handles listen/report quests', () => {

        //---------------------
        // LISTEN-REPORT QUEST
        //---------------------
        const reportQuestTasks = ['<goto>already_there', '<report>listen',
            '<goto>already_there', 'report'];
        const reportQuest = new Quest('Report info to actor', reportQuestTasks);
        questPopul.mapQuestToResources(reportQuest, city, null);
        questPopul.addQuestComponents(city);

        const actors = level.getActors();

        let giver = actors.find(actor => actor.has('QuestGiver'));
        let giverComp = giver.get('QuestGiver');
        giverComp.setReward({type: 'item', name: 'Ruby glass mace'});

        const qTargets = actors.filter(a => a.has('QuestTarget'));
        expect(qTargets).to.have.length(2);

        const listenTarget = actors.find(a => a.has('QuestInfo'));
        expect(listenTarget).to.be.an.instanceof(BaseActor);
        const reportTarget = actors.find(a => a.has('QuestReport'));
        expect(reportTarget).to.be.an.instanceof(BaseActor);

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
        expect(killTarget).to.an.instanceof(Entity);

        giver = actors.find(actor => actor.has('QuestGiver'));
        giverComp = giver.get('QuestGiver');
        giverComp.setReward({type: 'spell', name: 'FrostBolt'});

        giveQuest(giver, quester);
        sysQuest.update();

        const dmg = new Component.Damage(200, RG.DMG.MELEE);
        dmg.setSource(quester);
        killTarget.add(dmg);
        sysDamage.update();
        sysDeath.update();
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
        expect(ok, 'Learn-Goto Quest mapped OK').to.equal(true);

        questPopul.addQuestComponents(city);

        const bookToRead = getQuestTarget('read', level.getItems());
        expect(bookToRead).to.be.an.instanceof(ItemBase);

        const mainGiver = actors.find(a => (
            a.has('QuestGiver') && !a.has('QuestTarget')));
        const subGiver = actors.find(a => (
            a.has('QuestGiver') && a.has('QuestTarget')));
        expect(mainGiver).to.be.an.instanceof(SentientActor);
        expect(subGiver).to.be.an.instanceof(SentientActor);

        giveQuest(mainGiver, quester);
        sysQuest.update();
        giveQuest(subGiver, quester);
        sysQuest.update();

        const questComps = quester.getList('Quest');
        const mainQuestComp = questComps[0];
        const subQuestComp = questComps[1];
        expect(questComps).to.have.length(2);

        const readComp = new Component.Read();
        readComp.setReadTarget(bookToRead);
        quester.add(readComp);
        RGTest.updateSystems(systems);
        expect(quester).to.not.have.component('Read');

        const dungeon = areaTile.getZones('Dungeon')[0];
        const dungLevel = dungeon.getLevels()[0];
        console.log(areaTile.getZones().map(z => (
            z.getName() + ',' + z.getLevels().map(l => (
                l.getID() + ': ' + l.has('QuestTarget')
            ))
        )));
        expect(dungLevel, dungLevel.getID() + ' has QuestTarget')
            .to.have.component('QuestTarget');

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
        expect(questGiver).to.be.an.instanceof(Entity);

        const actorToGive = getQuestTarget('give', actors);
        expect(actorToGive).to.be.an.instanceof(Entity);
        expect(quester).to.not.have.component('Quest');
        giveQuest(questGiver, quester);
        sysQuest.update();
        expect(quester).to.have.component('Quest');

        const questItem = getQuestTarget('get', level.getItems()) as ItemBase;
        expect(questItem).to.be.an.instanceof(Entity);

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

    it('handles escort-quest mapping', () => {
        //---------------------
        // ESCORT QUEST
        //---------------------
        const escortTasks = ['<learn>already_know_it',
            '<goto>goto', 'damage', 'escort',
            // Go to known place, kill someone, take their book and learn location
            '<goto>goto', '<kill>kill', '<steal>take', '<learn>read',
            , '<goto>explore', // This is the escort taget
            'report'
        ];
        const escortQuest = new Quest('Get stuff and give', escortTasks);

        const hierEscortTasks = [
            '<goto>goto', 'damage', 'escort',
            escortQuest, '<subquest>goto', 'report'];
        const hierQuest = new Quest('Escort and escort again', hierEscortTasks);
        console.log('Dumping steps now:', hierQuest.getSteps());

        const rng = RGTest.createRNG(1);
        questPopul = new QuestPopulate({rng});
        questPopul.setDebug(true);
        const ok = questPopul.mapQuestToResources(hierQuest, city, area.getTileXY(0, 0));
        expect(ok, 'Escort Quest mapped OK').to.equal(true);
        questPopul.addQuestComponents(city);

        const actors = level.getActors();
        const questGiver = actors.find(a => (
            a.has('QuestGiver')));
        expect(questGiver).to.be.an.instanceof(Entity);

        expect(quester).to.not.have.component('Quest');
        giveQuest(questGiver, quester);
        sysQuest.update();
        expect(quester).to.have.component('Quest');

        const dung = area.getTileXY(0, 0).getZones('Dungeon')[0];
        const dungLevel = dung.getLevels()[0];
        const escortActor = dungLevel.getActors().find(a => (
            a.has('QuestTarget') && a.has('QuestEscortTarget')
        ));
        expect(RG.isNullOrUndef([escortActor])).to.equal(false);
        const escComp = escortActor.get('QuestEscortTarget');
        const escortLevel = escComp.getEscortTo();
        expect(escortLevel.getID()).to.equal(level.getID());

        /*
        const actorToEscort = getQuestTarget('escort', actors);
        expect(actorToGive).to.be.an.instanceof(Entity);

        const questItem = getQuestTarget('get', level.getItems()) as ItemBase;
        expect(questItem).to.be.an.instanceof(Entity);

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
        */

    });
});

function getQuestTarget(type, entities): Entity {
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

function cleanupQuests(giver, quester?) {
    giver.remove('QuestGiver');
    if (quester) {quester.removeAll('Quest');}
}
