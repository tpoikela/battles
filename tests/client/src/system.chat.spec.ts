
import chai from 'chai';
import RG from '../../../client/src/rg';
import {SentientActor } from '../../../client/src/actor';
import * as Item from '../../../client/src/item';
import {RGUnitTests} from '../../rg.unit-tests';
import {chaiBattles} from '../../helpers/chai-battles';
import * as Component from '../../../client/src/component';
import * as World from '../../../client/src/world';
import {RGTest} from '../../roguetest';
import {SystemChat} from '../../../client/src/system/system.chat';
import {Keys} from '../../../client/src/keymap';

import {BrainPlayer} from '../../../client/src/brain/brain.player';
const updateSystems = RGTest.updateSystems;

const expect = chai.expect;
chai.use(chaiBattles);

const SELECT_0 = Keys.selectIndexToCode(0);

describe('System.Chat', () => {

    let chatSys = null;
    let chatter = null;

    beforeEach(() => {
        chatSys = new SystemChat(['Chat']);
        chatter = new SentientActor('chatter');
        chatter.setIsPlayer(true);
    });

    it('handles chat actions between player and NPC', () => {
        const coins = new Item.GoldCoin();
        coins.setCount(1000);
        chatter.getInvEq().addItem(coins);

        const trainer = new SentientActor('trainer');
        RGUnitTests.wrapIntoLevel([chatter, trainer]);

        trainer.get('Stats').setAccuracy(20);

        const accBefore = chatter.get('Stats').getAccuracy();

        RGUnitTests.moveEntityTo(chatter, 1, 1);
        RGUnitTests.moveEntityTo(trainer, 2, 2);
        const chatComp = new Component.Chat();
        const args = {dir: [1, 1]};
        chatComp.setArgs(args);
        chatter.add(chatComp);

        const trainComp = new Component.Trainer();
        trainer.add(trainComp);

        updateSystems([chatSys]);

        const brain = chatter.getBrain() as BrainPlayer;
        expect(brain.isMenuShown()).to.equal(true);
        expect(chatter).not.to.have.component('Chat');

        const actionCb = brain.decideNextAction({code: SELECT_0});
        expect(brain.isMenuShown()).to.equal(false);

        actionCb();

        expect(chatter).to.have.accuracy(accBefore + 1);
    });

    it('can handle multi-chat per actor', () => {

        const wizTrainer = new SentientActor('wizTrainer');
        wizTrainer.add(new Component.Trainer());
        wizTrainer.add(new Component.QuestGiver());
        RGUnitTests.wrapIntoLevel([chatter, wizTrainer]);

        moveAndChat(chatter, wizTrainer);
        updateSystems([chatSys]);

        const brain = chatter.getBrain() as BrainPlayer;
        expect(brain.isMenuShown()).to.equal(true);
        let opts = brain.getMenu();

        let actionCb = brain.decideNextAction({code: SELECT_0});
        expect(brain.isMenuShown()).to.equal(true);
        opts = brain.getMenu();
        expect(Object.keys(opts)).to.have.length(RG.STATS.length + 1 + 1);
        actionCb = brain.decideNextAction({code: SELECT_0});

    });

    it('can handle various Lore objects in chats', () => {
        const knower = new SentientActor('know-it-all');
        const level = RGUnitTests.wrapIntoLevel([chatter, knower]);
        const zone = new World.City('Test city');
        const subZone = new World.CityQuarter('Test quarter');
        subZone.addLevel(level);
        zone.addSubZone(subZone);
        // const mainLore = {mainQuest: ['Just a message']};
        const mainLoreComp = new Component.Lore();
        mainLoreComp.addTopic('mainQuest', ['Just a message']);
        zone.add(mainLoreComp);

        moveAndChat(chatter, knower);
        const sideLoreComp = new Component.Lore();
        // const sideLore = {sideQuest: ['Another side quest msg']};
        sideLoreComp.addTopic('sideQuest', ['Another side quest msg']);
        // sideLoreComp.updateTopics(sideLore);
        zone.add(sideLoreComp);

        const revealComp = new Component.Lore();
        revealComp.addEntry({
            topic: 'places', msg: 'Where are the caves?',
            revealNames: ['Hidden caves of unit testing']
        });
        chatter.getLevel().add(revealComp);
        // zone.add(revealComp);

        updateSystems([chatSys]);

        const brain = chatter.getBrain() as BrainPlayer;
        expect(brain.isMenuShown()).to.equal(true);
        const opts = brain.getMenu();
        const optLen = Object.keys(opts).length;
        for (let i = 0; i < optLen; i++) {
            chatToDir(chatter, [1, 1]);
            updateSystems([chatSys]);
            let actionCb = brain.decideNextAction({code: Keys.selectIndexToCode(i)});
            // TODO missing expect()
        }
    });


});

function moveAndChat(chatter, target): void {
    RGUnitTests.moveEntityTo(chatter, 1, 1);
    RGUnitTests.moveEntityTo(target, 2, 2);
    chatToDir(chatter, [1, 1]);
}

function chatToDir(chatter, dir): void {
    const chatComp = new Component.Chat();
    const args = {dir};
    chatComp.setArgs(args);
    chatter.add(chatComp);
}
