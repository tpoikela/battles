
import { expect } from 'chai';

import RG from '../../../client/src/rg';
import * as ROT from '../../../lib/rot-js';
import {Chat} from '../../../client/src/chat';
import {SentientActor} from '../../../client/src/actor';

const {KEYS} = ROT;

describe('ChatBase', () => {

    it('Contains a list of chat options/actions', () => {
        const chat = new Chat.ChatBase();
        chat.add({name: 'Say Hello', option: () => 'Hello'});
        const selObject = chat.getSelectionObject();
        expect(selObject).to.not.be.empty;

        const optFunc = selObject.select(KEYS.VK_0);
        expect(optFunc).to.be.a('function');
    });

    it('can contain nested chat objects inside with menus', () => {
        const chat = new Chat.ChatBase();
        const chatTrainer = new Chat.Trainer();
        const trained = new SentientActor('trainer');
        chatTrainer.setTarget(trained);
        chat.add({name: 'Can I train with you?', option: chatTrainer});

        const selObject = chat.getSelectionObject();
        const trainObj = selObject.select(KEYS.VK_0);
        expect(trainObj).to.not.be.empty;

        const statsObj = trainObj.getMenu();
        const keys = Object.keys(statsObj);
        //console.log(statsObj);
        // console.log(keys);
        expect(keys).to.have.length(RG.STATS.length + 2);
        keys.forEach((key: string) => {
            expect(key).to.match(/[a-zA-Z0-9]|pre|post/);
        });

        const cbFunc = trainObj.select(KEYS.VK_1);
        expect(cbFunc).to.be.a('function');

    });

});
