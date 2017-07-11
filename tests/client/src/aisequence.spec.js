
const expect = require('chai').expect;
const BTree = require('../../../client/src/aisequence');

describe('BTree', () => {
    it('Has Selector nodes', () => {
        const actor = {};

        const setActorName = (actor) => {
            return () => {
                actor.isNameSet = true;
            };
        };

        const behavTree = new BTree.SequencerNode(
            [setActorName]
        );

        const setFunc = BTree.execBehavTree(behavTree, actor);
        expect(setFunc).to.be.function;
        expect(actor.isNameSet).to.be.empty;

        /*
        setFunc();
        expect(actor.isNameSet).to.be.true;
        */
    });

});
