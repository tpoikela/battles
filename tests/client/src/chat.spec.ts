
import { expect } from 'chai';

const RG = require('../../../client/src/battles');
const Chat = require('../../../client/src/chat');
const ROT = require('../../../lib/rot');

describe('ChatBase', () => {

    it('Contains a list of chat options/actions', () => {
        const chat = new Chat.ChatBase();
        chat.add({name: 'Say Hello', option: () => 'Hello'});
        const selObject = chat.getSelectionObject();
        expect(selObject).to.not.be.empty;

        const optFunc = selObject.select(ROT.VK_0);
        expect(optFunc).to.be.a.function;
    });

    it('can contain nested chat objects inside with menus', () => {
        const chat = new Chat.ChatBase();
        const chatTrainer = new Chat.Trainer();
        const trained = new RG.Actor.Rogue('trainer');
        chatTrainer.setTarget(trained);
        chat.add({name: 'Can I train with you?', option: chatTrainer});

        const selObject = chat.getSelectionObject();
        const trainObj = selObject.select(ROT.VK_0);
        expect(trainObj).to.not.be.empty;

        const statsObj = trainObj.getMenu();
        const keys = Object.keys(statsObj);
        expect(keys).to.have.length(6);

        const cbFunc = trainObj.select(ROT.VK_1);
        expect(cbFunc).to.be.a.function;

    });

});
