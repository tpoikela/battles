
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');

const ItemRand = RG.Factory.ItemRandomizer;

describe('RG.Factory.ItemRandomizer', function() {
    it('Randomizes item properties for proc generation', function() {
        const itemRand = new ItemRand();
        const food = new RG.Item.Food('meat');
        const weightBefore = food.getWeight();
        itemRand.adjustItem(food);

        const weightAfter = food.getWeight();
        expect(weightBefore !== weightAfter).to.equal(true);
    });
});

const MockParser = function() {
    this.createRandomItem = function() {
        return new RG.Item.Food('testFood');
    };

};

describe('RG.Factory.Base', function() {
    it('Can create randomized towns', function() {
        const factory = new RG.Factory.Base();
        const conf = {
            parser: new MockParser(),
            func: function() {return 'dummy';}
        };

        const townLevel = factory.createLevel('town', 80, 80, conf);
        const actors = townLevel.getActors();
        const keeper = actors[0];

        expect(actors.length).to.equal(1);
        expect(keeper.getName()).to.equal('Shopkeeper');


    });
});

describe('ObjectShellParser', function() {
    it('It is used for parsing object shells', function() {
        const parser = new RG.ObjectShellParser();
        const noObj = parser.createActualObj('items', 'Void Item');
        expect(noObj).to.be.null;

        const invalidShell = {xxx: 'xxx', noname: 'noname'};
        expect(parser.validShellGiven(invalidShell)).to.be.false;

    });
});

describe('RG.FCCGame', function() {
    it('can be created', function() {
        const game = new RG.FCCGame();
        const conf = {
            cols: 40,
            rows: 30,
            levels: 2,
            playerLevel: 'Medium',
            sqrPerMonster: 40,
            sqrPerItem: 100,
            debugMode: false,
            loadedPlayer: null,
            loadedLevel: null,
            playerName: 'Player'
        };
        game.createNewGame(conf);

    });
});
