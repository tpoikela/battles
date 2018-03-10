
const expect = require('chai').expect;
const BTree = require('../../../client/src/aisequence');

const MockActor = function() {
    this.getName = () => 'name';
};

describe('BTree', () => {
    it('should return function sequence', () => {
        const actor = {
            getName: () => 'actor name'
        };
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
            hp: 15,
            getName: () => 'actor name'
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

    it('can have nested sequences', () => {
        const actor = new MockActor();
        let count = 0;
        const incrCount = () => () => {count++;};
        const countGreaterThan = num => () => count > num;
        const multiplyCount = num => () => {
            count *= num;
        };

        const seq1 = new BTree.SequencerNode(
            [incrCount, incrCount]
        );
        const seq2 = new BTree.SequencerNode(
            [
                incrCount,
                new BTree.SelectorNode(
                    countGreaterThan.bind(null, 1),
                    multiplyCount.bind(null, 2),
                    multiplyCount.bind(null, 4),
                )
            ]
        );

        let funcs = BTree.startBehavTree(seq1, actor);
        expect(funcs.length).to.be.equal(2);

        const mainSeq = new BTree.SequencerNode(
            [seq1, seq2]
        );

        funcs = BTree.startBehavTree(mainSeq, actor);
        expect(funcs.length).to.be.above(2);

        funcs.forEach(func => {
            func();
        });
        let exp = 0 + 1 + 1 + 1;
        exp = exp > 1 ? exp * 2 : exp * 4;
        expect(count).to.be.equal(exp);

    });

});
