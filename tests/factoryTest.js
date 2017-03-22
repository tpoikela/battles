
var expect = require('chai').expect;

var RG = require('../client/src/battles');

var ItemRand = RG.Factory.ItemRandomizer;

describe('RG.Factory.ItemRandomizer', function() {
    it('Randomizes item properties for proc generation', function() {
        var itemRand = new ItemRand();
        var food = new RG.Item.Food('meat');
        var weightBefore = food.getWeight();
        itemRand.adjustItem(food);
        var weightAfter = food.getWeight();
        expect(weightBefore !== weightAfter).to.equal(true);
    });
});

var MockParser = function() {
    this.createRandomItem = function() {
        return new RG.Item.Food('testFood');
    };

};

describe('RG.Factory.Base', function() {
    it('Can create randomized towns', function() {
        var factory = new RG.Factory.Base();

        var conf = {
            parser: new MockParser(),
            func: function() {return 'dummy';}
        };

        var townLevel = factory.createLevel('town', 80, 80, conf);
        var actors = townLevel.getActors();
        var keeper = actors[0];

        expect(actors.length).to.equal(1);
        expect(keeper.getName()).to.equal('Shopkeeper');


    });
});

describe('ObjectShellParser', function() {
    it('It is used for parsing object shells', function() {
        var parser = new RG.ObjectShellParser();
        var noObj = parser.createActualObj('items', 'Void Item');
        expect(noObj).to.be.null;

        var invalidShell = {xxx: 'xxx', noname: 'noname'};
        expect(parser.validShellGiven(invalidShell)).to.be.false;

    });
});

describe('RG.FCCGame', function() {
    it('can be created', function() {
        var game = new RG.FCCGame();
        var conf = {
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
        game.createFCCGame(conf);

    });
});
