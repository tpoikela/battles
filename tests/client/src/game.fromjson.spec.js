
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
        const level = RGTest.createLevel('arena', 100, 100);
        const actor = new RG.Actor.Rogue('Urkh!');
        actor.setType('goblin');
        const item = new RG.Item.Weapon('sword');
        level.addActor(actor, 2, 2);
        level.addItem(item, 3, 3);
        const json = level.toJSON();
        console.log(JSON.stringify(json));
        const newLevel = fromJSON.createLevel(json);

        const actors = newLevel.getActors();
        const items = newLevel.getItems();
        expect(actors).to.have.length(1);
        expect(actors[0].getName()).to.equal('Urkh!');
        expect(items).to.have.length(1);
        expect(items[0].getName()).to.equal('sword');
    });
});
