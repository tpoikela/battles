
const expect = require('chai').expect;
const BTree = require('../../../client/src/aisequence');

describe('BTree', () => {
    it('should return function sequence', () => {
        const actor = {};
        const setActorName = (actor) => {
            return () => {
                actor.isNameSet = true;
            };
        };

        const behavTree = new BTree.SequencerNode(
            [setActorName]
        );

        const funcs = BTree.startBehavTree(behavTree, actor);
        expect(funcs).to.have.length(1);
        expect(funcs[0]).to.be.function;
        expect(actor.isNameSet).to.be.empty;

        const setFunc = funcs[0];
        setFunc();
        expect(actor.isNameSet).to.be.true;
    });

    it('should have selections', () => {
        const actor = {
            hp: 15
        };

        const condFunc = (actor) => (actor.hp >= 10);
        const ifTrueFunc = (actor) => () => {actor.hp *= 2;};
        const ifFalseFunc = (actor) => {actor.hp /= 2;};

        const behavTree = new BTree.SelectorNode(
            condFunc, ifTrueFunc, ifFalseFunc
        );

        expect(actor.hp).to.equal(15);
        const funcs = BTree.startBehavTree(behavTree, actor);
        expect(funcs).to.have.length(1);
        funcs[0]();
        expect(actor.hp).to.equal(2 * 15);
    });

});
