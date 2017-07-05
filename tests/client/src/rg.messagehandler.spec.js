
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');

const MsgHandler = RG.MessageHandler;

describe('RG.MessageHandler', () => {
    it('Receives messages via notify function', () => {
        const handler = new MsgHandler();
        expect(handler.hasNew()).to.equal(false);
        handler.notify(RG.EVT_MSG, {msg: 'Test'});
        expect(handler.hasNew()).to.equal(true);
        expect(handler.getMessages()).to.have.length(1);
    });

    it('adds multiplier after repeated message', () => {
        const handler = new MsgHandler();
        expect(handler.getMessages()).to.have.length(0);
        handler.notify(RG.EVT_MSG, {msg: 'Test'});
        handler.notify(RG.EVT_MSG, {msg: 'Test'});
        expect(handler.getMessages()).to.have.length(1);
        expect(handler.getMessages()[0].msg).to.equal('Test');
        expect(handler.getMessages()[0].count).to.equal(2);
    });
});
