
import { expect } from 'chai';
import RG from '../../../client/src/rg';
import {ItemRandomizer as ItemRand} from '../../../client/src/factory.items';
import {FactoryBase} from '../../../client/src/factory';
import {FactoryGame} from '../../../client/src/factory.game';
import {FactoryLevel} from '../../../client/src/factory.level';
// import {FactoryWorld} from '../../../client/src/factory.world';
import * as Item from '../../../client/src/item';
import {SentientActor} from '../../../client/src/actor';

describe('ItemRandomizer', () => {
    it('Randomizes item properties for proc generation', () => {
        const itemRand = new ItemRand();
        const food = new Item.Food('meat');
        const weightBefore = food.getWeight();
        itemRand.adjustItem(food);

        const weightAfter = food.getWeight();
        expect(weightBefore !== weightAfter).to.equal(true);
    });

    /* it('can add Stats components to items', () => {

    });*/
});

const MockParser = function() {
    this.createRandomItem = () => new Item.Food('testFood');
    this.createActor = name => new SentientActor(name);
};

describe('FactoryBase', () => {
    it('Can create randomized towns', () => {
        const factory = new FactoryBase();
        const conf = {
            parser: new MockParser(),
            func: () => 'dummy',
            nShops: 2,
            shopFunc: [
                item => (item.getType() === 'potion'),
                item => (item.getType() === 'food')
            ]
        };

        const townLevel = factory.createLevel('town', 80, 40, conf);
        const actors = townLevel.getActors();
        const keeper = actors[0];
        expect(keeper.getName()).to.match(/shopkeeper/);

        const keepers = actors.filter(a => (/shopkeeper/).test(a.getName()));
        expect(keepers).to.have.length(2);
        if (actors.length > 2) {
            expect(actors[2].getName()).to.equal('trainer');
        }

        const shopElems = townLevel.getElements().filter(elem => (
            elem.getType() === 'shop'
        ));

        expect(shopElems.length).to.be.above(2);
        shopElems.forEach(elem => {
            const [x, y] = elem.getXY();
            const baseElem = townLevel.getMap().getBaseElemXY(x, y);
            expect(baseElem.getType()).not.to.equal('wall');
        });
    });
});

describe('FactoryGame', () => {

    let conf = null;

    beforeEach(() => {
        conf = {
            cols: 40,
            rows: 30,
            nLevels: 2,
            playerLevel: 'Medium',
            sqrPerActor: 40,
            sqrPerItem: 100,
            playMode: 'Arena',
            loadedPlayer: null,
            loadedLevel: null,
            playerName: 'Player Hero',
            playerRace: 'Zork'
        };
    });

    it('can create new games', () => {
        const gameFactory = new FactoryGame();
        const game = gameFactory.createNewGame(conf);
        expect(game).to.exist;
        expect(game.getPlayer().getName()).to.equal('Player Hero');
    });

    it('can create new games with preset levels', () => {
        const factLevel = new FactoryLevel();
        const temple = factLevel.createLevel('arena', 40, 40).toJSON();
        const gameFactory = new FactoryGame();
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
                    maxX: 2,
                    maxY: 2,
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

        const levels = game.getLevels();
        expect(levels).to.have.length(4 + 2);

        const presetLevel = game.getLevels().find(level => (
            level.getID() === temple.id
        ));
        expect(presetLevel).to.exist;
    });

});
