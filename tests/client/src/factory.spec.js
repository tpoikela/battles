
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
        expect(keeper.getName()).to.equal('shopkeeper');


    });
});


describe('RG.Factory.Game', function() {
    it('can create new games', function() {
        const gameFactory = new RG.Factory.Game();
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
            playerName: 'Player Hero'
        };
        const game = gameFactory.createNewGame(conf);

        expect(game).to.exist;
        expect(game.getPlayer().getName()).to.equal('Player Hero');
    });
});
