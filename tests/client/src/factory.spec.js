
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');

const ItemRand = RG.Factory.ItemRandomizer;
const temple = require('../../../client/data/temple.json');

describe('RG.Factory.ItemRandomizer', () => {
    it('Randomizes item properties for proc generation', () => {
        const itemRand = new ItemRand();
        const food = new RG.Item.Food('meat');
        const weightBefore = food.getWeight();
        itemRand.adjustItem(food);

        const weightAfter = food.getWeight();
        expect(weightBefore !== weightAfter).to.equal(true);
    });
});

const MockParser = function() {
    this.createRandomItem = () => new RG.Item.Food('testFood');
    this.createActor = () => new RG.Actor.Rogue('shopkeeper');
};

describe('RG.Factory.Base', () => {
    it('Can create randomized towns', () => {
        const factory = new RG.Factory.Base();
        const conf = {
            parser: new MockParser(),
            func: function() {return 'dummy';},
            nShops: 2,
            shopFunc: [
                item => (item.getType() === 'potion'),
                item => (item.getType() === 'food')
            ]
        };

        const townLevel = factory.createLevel('town', 80, 80, conf);
        const actors = townLevel.getActors();
        const keeper = actors[0];

        expect(actors.length).to.equal(2);
        expect(keeper.getName()).to.equal('shopkeeper');


    });
});

describe('RG.Factory.Game', () => {

    let conf = null;

    beforeEach(() => {
        conf = {
            cols: 40,
            rows: 30,
            levels: 2,
            playerLevel: 'Medium',
            sqrPerActor: 40,
            sqrPerItem: 100,
            playMode: 'Dungeon',
            loadedPlayer: null,
            loadedLevel: null,
            playerName: 'Player Hero'
        };
    });


    it('can create new games', () => {
        const gameFactory = new RG.Factory.Game();
        const game = gameFactory.createNewGame(conf);
        expect(game).to.exist;
        expect(game.getPlayer().getName()).to.equal('Player Hero');
    });

    it('can create new games with preset levels', () => {
        const gameFactory = new RG.Factory.Game();
        temple.id = RG.LEVEL_ID_ADD + 1000000;
        const worldConf = {
            name: 'PresetLevelWorld',
            presetLevels: {
                'Beast dungeon.Animals': [{nLevel: 0, level: temple}]
            },
            nAreas: 1,
            area: [
                {
                    name: 'Ravendark',
                    maxX: 1,
                    maxY: 1,
                    cols: 70, rows: 30,
                    nDungeons: 1,
                    dungeon: [
                        { x: 0, y: 0, name: 'Beast dungeon', nBranches: 1,
                            branch: [
                                {name: 'Animals', nLevels: 2, entranceLevel: 0}
                            ]
                        }
                    ]
                }
            ]
        };
        conf.world = worldConf;
        conf.playMode = 'World';
        const game = gameFactory.createNewGame(conf);
        expect(game).to.exist;
        expect(game.getLevels()).to.have.length(3);

        const presetLevel = game.getLevels().find(level => (
            level.getID() === temple.id
        ));
        expect(presetLevel).to.exist;
    });

});
