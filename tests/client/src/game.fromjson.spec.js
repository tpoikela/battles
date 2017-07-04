
const expect = require('chai').expect;

const RG = require('../../../client/src/battles');
const Game = require('../../../client/src/game');
const RGTest = require('../../roguetest');

const FromJSON = Game.FromJSON;

describe('RG.Game.FromJSON', function() {
    this.timeout(4000);
    let fromJSON = null;

    beforeEach(() => {
        fromJSON = new FromJSON();
    });

    afterEach(() => {
        fromJSON = null;
    });

    it('Converts item JSON back to RG.Items', () => {
        const item1 = new RG.Item.Weapon('knife');
        item1.setValue(100);
        const json = item1.toJSON();
        const newItem = fromJSON.createItem(json);

        expect(newItem.getName()).to.equal(item1.getName());
        expect(newItem.getType()).to.equal(item1.getType());
        expect(newItem.getValue()).to.equal(100);
    });

    it('Converts level.map JSON back to RG.Map', () => {
        const level = RGTest.createLevel('arena', 20, 20);
        const json = level.toJSON();
        const newLevel = fromJSON.createLevel(json);
        const newMap = newLevel.getMap();
        for (let x = 0; x < 20; x++) {
            expect(newMap.getCell(x, 0).isPassable(),
                `Cell ${x},0 should have wall thus not passable`)
                .to.equal(false);
        }
    });

    it('Converts level JSON back to RG.Map.Level', () => {
        const level = RGTest.createLevel('arena', 20, 20);
        const json = level.toJSON();
        const newLevel = fromJSON.createLevel(json);
        expect(newLevel.getID()).to.equal(level.getID());
    });


    it('converts level and its objects into JSON and back to object', () => {
        const level = RGTest.createLevel('arena', 10, 10);
        const actor = new RG.Actor.Rogue('Urkh!');
        actor.setType('goblin');

        const goblinEntID = actor.getID();
        const item = new RG.Item.Weapon('sword');
        const swordID = item.getID();
        level.addActor(actor, 2, 2);
        level.addItem(item, 3, 3);

        const shopElem = new RG.Element.Shop();
        const shopItem = new RG.Item.Weapon('Sword for sale');
        shopItem.add('Unpaid', new RG.Component.Unpaid());
        level.addElement(shopElem, 4, 4);
        level.addItem(shopItem, 4, 4);

        const json = level.toJSON();
        const newLevel = fromJSON.createLevel(json);

        const actors = newLevel.getActors();
        const items = newLevel.getItems();
        const elements = newLevel.getElements();

        const newGoblin = actors[0];
        expect(actors).to.have.length(1);
        expect(newGoblin.getName()).to.equal('Urkh!');
        expect(newGoblin.getID()).to.equal(goblinEntID);
        expect(items).to.have.length(2);
        expect(items[0].getName()).to.equal('sword');
        expect(items[0].getID()).to.equal(swordID);

        expect(elements).to.have.length(1);
        expect(elements[0].getType()).to.equal('shop');

        expect(items[1].has('Unpaid'), 'Item is unpaid').to.be.true;
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

});
