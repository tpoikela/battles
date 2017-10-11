
import Capital from '../../../client/data/capital';

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

    it('Converts Ammo to JSON and back', () => {
        const arrow = new RG.Item.Ammo('Steel arrow');
        const json = arrow.toJSON();
        console.log(json);
        const newArrow = fromJSON.createItem(json);
        expect(arrow.equals(newArrow)).to.equal(true);
    });

    it('Converts level.map JSON back to RG.Map', () => {
        const level = RGTest.createLevel('arena', 20, 20);
        const json = level.toJSON();
        const newLevel = fromJSON.restoreLevel(json);
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
        const newLevel = fromJSON.restoreLevel(json);
        expect(newLevel.getID()).to.equal(level.getID());
    });

    it('converts overworld JSON back to RG.OverWorld.Map', () => {
        const conf = {};
        const ow = RG.OW.createOverWorld(conf);
        const json = ow.toJSON();
        const newOw = fromJSON.restoreOverWorld(json);
        expect(newOw).to.exist;

        expect(newOw.getMap()).to.deep.equal(ow.getMap());
    });


    it('converts level and its objects into JSON and back to object', () => {
        const level = RGTest.createLevel('arena', 10, 10);
        const actor = new RG.Actor.Rogue('Urkh!');
        actor.setType('goblin');
        actor.setFOVRange(21);

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
        const newLevel = fromJSON.restoreLevel(json);
        fromJSON.restoreEntityData();

        const actors = newLevel.getActors();
        const items = newLevel.getItems();
        const elements = newLevel.getElements();

        const newGoblin = actors[0];
        expect(actors).to.have.length(1);
        expect(newGoblin.getName()).to.equal('Urkh!');
        expect(newGoblin.getID()).to.equal(goblinEntID);
        expect(newGoblin.getFOVRange()).to.equal(21);
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

    it('converts a mountain to JSON and back to object', () => {
        const mountain = new RG.World.Mountain('Mount doom');
        const f1 = new RG.World.MountainFace('f1');
        const f2 = new RG.World.MountainFace('f2');

        const goblin = new RG.Actor.Rogue('Small goblin');
        goblin.get('Stats').setAgility(17);
        goblin.setType('goblin');

        const l1 = RG.FACT.createLevel('mountain', 50, 100);
        l1.addActor(goblin, 1, 3);
        f1.addLevel(l1);
        const l2 = RG.FACT.createLevel('mountain', 50, 100);
        f2.addLevel(l2);
        mountain.addFace(f1);
        mountain.addFace(f2);
        mountain.connectFaces('f1', 'f2', 0, 0);

        const jsonL1 = l1.toJSON();
        const jsonL2 = l2.toJSON();
        const json = mountain.toJSON();

        const newL1 = fromJSON.restoreLevel(jsonL1);
        fromJSON.restoreEntityData();
        const actorsL1 = newL1.getActors();
        expect(actorsL1).to.have.length(1);

        const newGoblin = actorsL1[0];
        expect(newGoblin.get('Stats').getAgility()).to.equal(17);

        const newL2 = fromJSON.restoreLevel(jsonL2);
        const id2level = {};
        id2level[newL1.getID()] = newL1;
        id2level[newL2.getID()] = newL2;

        const factWorld = new RG.Factory.World();
        factWorld.setId2Level(id2level);
        const newMountain = factWorld.createMountain(json);
        expect(newMountain.getLevels()).to.have.length(2);
    });

    it('can serialize/de-serialize spellcaster actors', () => {
        const wizard = RGTest.getMeAWizard();
        const json = wizard.toJSON();
        expect(json).to.have.property('spellbook');
        expect(json.spellbook.spells).to.have.length(1);

        const restWizard = fromJSON.createActor(json);
        fromJSON.restoreEntityData(restWizard, json);

        expect(restWizard._spellbook, 'Spellbook exists').to.exist;
        const restSpell = restWizard._spellbook.getSpells()[0];
        expect(restSpell.getPower()).to.equal(11);
        expect(restSpell.getRange()).to.equal(7);

        const damageDie = restSpell.getDice()[0];
        expect(damageDie.toJSON()).to.deep.equal([1, 2, 3]);
    });

    it('can serialize/de-serialize Capital', () => {
        const capitalLevel = new Capital(200, 400).getLevel();
        const nActorsBefore = capitalLevel.getActors().length;
        const json = capitalLevel.toJSON();

        const newLevel = fromJSON.restoreLevel(json);
        const nActorsAfter = newLevel.getActors().length;
        expect(nActorsAfter).to.equal(nActorsBefore);
    });

});
