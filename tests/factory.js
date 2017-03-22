
var chai = require('chai');
var expect = chai.expect;

var RG = require('../battles.js');

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

    this.createRandomItem = function(obj) {
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
