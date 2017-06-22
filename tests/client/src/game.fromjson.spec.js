
const expect = require('chai').expect;

const RG = require('../../../client/src/battles');
const Game = require('../../../client/src/game');
const RGTest = require('../../roguetest');

const FromJSON = Game.FromJSON;

describe('RG.Game.FromJSON', () => {
    let fromJSON = null;

    beforeEach(() => {
        fromJSON = new FromJSON();
    });

    afterEach(() => {
        fromJSON = null;
    });

    it('Converts item JSON back to RG.Items', () => {
        const item1 = new RG.Item.Weapon('knife');
        const json = item1.toJSON();
        const newItem = fromJSON.createItem(json);

        expect(newItem.getName()).to.equal(item1.getName());
        expect(newItem.getType()).to.equal(item1.getType());
    });

    it('Converts level JSON back to RG.Map.Level', () => {
        const level = RGTest.createLevel('arena', 20, 20);
        const json = level.toJSON();
        const newLevel = fromJSON.createLevel(json);
        expect(newLevel.getID()).to.equal(level.getID());
    });

    it('Converts level.map JSON back to RG.Map', () => {
        const level = RGTest.createLevel('arena', 20, 20);
        const json = level.toJSON();
        const newLevel = fromJSON.createLevel(json);
        const newMap = newLevel.getMap();
        for (let x = 0; x < 20; x++) {
            expect(newMap.getCell(x, 0).isPassable(),
                `Cell ${x},0 should have wall thus not passable`,
            ).to.equal(false);
        }
    });

    it('converts level and its objects into JSON and back to object', () => {
        const level = RGTest.createLevel('arena', 10, 10);
        const actor = new RG.Actor.Rogue('Urkh!');
        actor.setType('goblin');
        const item = new RG.Item.Weapon('sword');
        level.addActor(actor, 2, 2);
        level.addItem(item, 3, 3);
        const json = level.toJSON();
        const newLevel = fromJSON.createLevel(json);

        const actors = newLevel.getActors();
        const items = newLevel.getItems();
        expect(actors).to.have.length(1);
        expect(actors[0].getName()).to.equal('Urkh!');
        expect(items).to.have.length(1);
        expect(items[0].getName()).to.equal('sword');
    });

    it('connects levels after restoring game from JSON', () => {
        const game = new RG.Game.Main();
        const level1 = RGTest.createLevel('arena', 10, 10);
        const level2 = RGTest.createLevel('arena', 10, 10);
        const s1 = new RG.Element.Stairs(true, level1, level2);
        const s2 = new RG.Element.Stairs(false, level2, level1);
        s1.connect(s2);
        level1.addStairs(s1, 1, 1);
        level2.addStairs(s2, 2, 2);
        game.addLevel(level1);
        game.addLevel(level2);

        const json = game.toJSON();
        const newGame = fromJSON.createGame(json);
        const newLevels = newGame.getLevels();
        expect(newLevels).to.have.length(2);

        const newS1 = newLevels[0].getStairs()[0];
        const newS2 = newLevels[1].getStairs()[0];
        const id1 = newLevels[0].getID();
        const id2 = newLevels[1].getID();

        expect(newS1.getTargetLevel(), 'Target level must be set').to.exist;
        expect(newS2.getTargetLevel(), 'Target level must be set').to.exist;

        expect(newS1.getTargetLevel().getID()).to.equal(id2);
        expect(newS2.getTargetLevel().getID()).to.equal(id1);

    });


    it('converts full game into JSON and back to object', () => {
        const game = new RG.Game.Main();
        const level = RGTest.createLevel('arena', 10, 10);
        const player = new RG.Actor.Rogue('MyPlayer');
        player.setType('player');
        player.setIsPlayer(true);
        game.addLevel(level);
        game.addPlayer(player);
        const json = game.toJSON();
        const newGame = fromJSON.createGame(json);
        const newPlayer = newGame.getPlayer();
        expect(newPlayer.getName()).to.equal('MyPlayer');
    });

    /* TODO Decide on places serialization and add this test.
    it('converts a game containing world into JSON and back', () => {
        const fact = new RG.Factory.World();
        const game = new RG.Game.Main();
        const conf = {name: 'Ice Kingdom', nAreas: 1,
            area: [{ name: 'Area51', maxX: 1, maxY: 1}]
        };
        const world = fact.createWorld(conf);
        const player = new RG.Actor.Rogue('MyPlayer');
        player.setType('player');
        player.setIsPlayer(true);
        game.addPlace(world);
        game.addPlayer(player, {place: 'Ice Kingdom'});
        const json = game.toJSON();
        const newGame = fromJSON.createGame(json);
        expect(Object.keys(newGame.getPlaces())).to.have.length(1);
    });
    */


});
