
import Capital from '../../../client/data/capital';

const expect = require('chai').expect;

const RG = require('../../../client/src/battles');
const Game = require('../../../client/src/game');
const RGTest = require('../../roguetest');

const FromJSON = Game.FromJSON;

RG.Factory = require('../../../client/src/factory');
RG.Factory.Battle = require('../../../client/src/factory.battle');

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
        const s1 = new RG.Element.Stairs('stairsDown', level1, level2);
        const s2 = new RG.Element.Stairs('stairsUp', level2, level1);
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
        mountain.connectSubZones('f1', 'f2', 0, 0);

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
        wizard.get('Health').setHP(33);
        wizard.get('Stats').setMagic(22);
        const json = wizard.toJSON();
        expect(json).to.have.property('spellbook');
        expect(json.spellbook.spells).to.have.length(1);

        const restWizard = fromJSON.createActor(json);
        fromJSON.restoreEntityData(restWizard, json);

        expect(restWizard._spellbook, 'Spellbook exists').to.exist;
        const restSpell = restWizard._spellbook.getSpells()[0];
        expect(restSpell.getPower()).to.equal(11);
        expect(restSpell.getRange()).to.equal(7);

        const damageDie = restSpell.getDice('damage');
        expect(damageDie.toJSON()).to.deep.equal([1, 2, 3]);
        expect(restWizard.get('Health').getHP())
            .to.equal(wizard.get('Health').getHP());
        expect(restWizard.get('Stats').getMagic())
            .to.equal(wizard.get('Stats').getMagic());

        const compsToCheck = ['Health', 'Stats', 'Combat', 'Experience'];
        compsToCheck.forEach(cName => {
            const msg = `Only 1 component ${cName}`;
            const hList = wizard.getList(cName);
            const newhList = restWizard.getList(cName);
            expect(newhList.length, msg).to.equal(hList.length);
        });
    });


    it('can serialize/de-serialize Capital', () => {
        const capitalLevel = new Capital(200, 400).getLevel();
        const allActors = capitalLevel.getActors();
        const shopKeepers = allActors.filter(ent =>
            (/shopkeeper/).test(ent.getName()));

        expect(shopKeepers.length).to.equal(9);

        const nActorsBefore = allActors.length;
        const json = capitalLevel.toJSON();

        const newLevel = fromJSON.restoreLevel(json);
        const nActorsAfter = newLevel.getActors().length;
        expect(nActorsAfter).to.equal(nActorsBefore);

        const game = new RG.Game.Main();
        game.addActiveLevel(newLevel);
        for (let i = 0; i < 50; i++) {
            game.simulateGame();
        }
    });

    it('can serialize/de-serialize game after fighting', () => {
        const game = new RG.Game.Main();
        const level = RG.FACT.createLevel('arena', 80, 40);
        const parser = RG.ObjectShell.getParser();

        const actors = [];

        // Create some demons and fighters
        for (let i = 0; i < 50; i++) {
            const demon = parser.createActor('Winter demon');
            const fighter = parser.createActor('fighter');
            actors.push(demon);
            actors.push(fighter);
        }

        // Create a spirit gem for hero
        const gem = RGTest.createBoundGem();

        // Create hero with a spirit gem
        const hero = parser.createActor('fighter');
        hero.setName('hero');
        hero.get('Health').setHP(200);
        hero.getInvEq().addItem(gem);
        hero.getInvEq().equipItem(gem);
        actors.push(hero);

        RG.Factory.addPropsToFreeCells(level, actors, RG.TYPE_ACTOR);
        game.addActiveLevel(level);
        game.addLevel(level);
        for (let i = 0; i < 500; i++) {
            game.simulateGame();
        }

        const json = game.toJSON();
        const newGame = fromJSON.createGame(json);

        for (let i = 0; i < 500; i++) {
            newGame.simulateGame();
        }

        const map = newGame.getLevels()[0].getMap();
        const newHero = map.findObj(obj =>
            obj.getName && obj.getName() === 'hero')[0];
        const invHero = newHero.getInvEq().getInventory();
        const eqHero = newHero.getInvEq().getEquipment();
        expect(invHero.getItems()).to.have.length(0);
        expect(eqHero.getItems()).to.have.length(1);
    });

    it('serializes/de-serializes player with complex stats/objects', () => {
        const factGame = new RG.Factory.Game();
        const game = new RG.Game.Main();
        const level = RGTest.createLevel('arena', 10, 10);
        const player = new RG.Actor.Rogue('MyPlayer');
        player.setType('player');
        player.setIsPlayer(true);
        game.addLevel(level);
        game.addPlayer(player);
        const invEq = player.getInvEq();

        // Add complex objects here
        const gem = RGTest.createBoundGem();
        invEq.addItem(gem);
        invEq.equipItem(gem);

        const gameConf = {
            playerClass: 'Cryomancer'
        };
        expect(player.getBook()).to.be.empty;
        factGame.addActorClass(gameConf, player);
        expect(player.getBook()).to.not.be.empty;

        const json = game.toJSON();
        const newGame = fromJSON.createGame(json);
        const newPlayer = newGame.getPlayer();
        expect(newPlayer.getName()).to.equal('MyPlayer');

        const newInvEq = newPlayer.getInvEq();
        const invItems = newInvEq.getInventory().getItems();
        const eqItems = newInvEq.getEquipment().getItems();
        expect(invItems).to.have.length(2);
        expect(eqItems).to.have.length(3);

        const spellbook = newPlayer.getBook();
        expect(spellbook).to.not.be.empty;
        expect(newPlayer.has('ActorClass')).to.be.true;
    });

    it('can serialize/de-serialize pick-axe', () => {
        const parser = RG.ObjectShell.getParser();
        const pickaxe = parser.createItem('Pick-axe');
        expect(typeof pickaxe.useItem).to.equal('function');
        const json = pickaxe.toJSON();

        const restPickaxe = fromJSON.createItem(json);
        expect(typeof restPickaxe.useItem).to.equal('function');

        const oldComps = pickaxe.getComponents();
        const newComps = restPickaxe.getComponents();
        const oldCompNames = Object.keys(oldComps);
        const newCompNames = Object.keys(newComps);

        expect(newCompNames.length).to.equal(oldCompNames.length);
    });

    it('can serialize/de-serialize actor with skills', () => {
        const actor = new RG.Actor.Rogue('skilled one');
        const skills = new RG.Component.Skills();
        actor.add(skills);
        expect(actor.has('Skills'), 'Has skills').to.equal(true);
        skills.addSkill('Melee');
        skills.addSkill('Archery');
        skills.setLevel('Archery', 10);

        const json = actor.toJSON();

        const newActor = fromJSON.createActor(json);
        fromJSON.restoreEntityData();

        expect(newActor.has('Skills'), 'Has skills').to.equal(true);
        expect(newActor.get('Skills').getLevel('Archery'),
            'Has 10 level archery').to.equal(10);
    });

    it('can serialize/de-serialize battles', () => {
        const parentLevel = RG.FACT.createLevel('arena', 80, 30);
        const battle = new RG.Factory.Battle().createBattle(parentLevel);
        const armies = battle.getArmies();
        const game = new RG.Game.Main();
        game.addBattle(battle);

        let actors = [];
        armies.forEach(army => {
            actors = actors.concat(army.getActors());
        });

        // const newGame = fromJSON.createGame(game.toJSON());
        const battleLevel = battle.getLevel();
        const connsBefore = battleLevel.getConnections();
        expect(connsBefore.length).to.be.above(50);
        expect(actors.length).to.equal(battleLevel.getActors().length);
        const newLevel = fromJSON.restoreLevel(battleLevel.toJSON());

        const connsAfter = newLevel.getConnections();
        expect(connsAfter.length).to.be.above(50);
        expect(connsAfter.length).to.equal(connsBefore.length);

        const army = armies[0];
        const armyJSON = army.toJSON();
        const newArmy = fromJSON.restoreArmy(armyJSON);
        expect(newArmy.getName()).to.equal(army.getName());

        const json = battle.toJSON();
        const newBattle = fromJSON.restoreBattle(json);

        const nArmies = battle.getArmies().length;
        const nArmiesNew = newBattle.getArmies().length;
        expect(nArmiesNew).to.equal(nArmies);
    });

    it('can serialize/de-serialize items with complex components', () => {
        const magicSword = new RG.Item.Weapon('Magic sword');
        const addOnHit = new RG.Component.AddOnHit();
        const poisonComp = new RG.Component.Poison();
        poisonComp.setDurationDie('1d6');
        poisonComp.setDamageDie('1d8 + 4');
        addOnHit.setComp(poisonComp);
        magicSword.add(addOnHit);

        const json = magicSword.toJSON();

        const newSword = fromJSON.createItem(json);
        expect(newSword.getID()).to.equal(magicSword.getID());

        const newJSON = newSword.toJSON();
        expect(newJSON).to.deep.equal(json);
    });

    it('can restore elements with entity refs', () => {
        const level = RG.FACT.createLevel('arena', 10, 10);
        const lever = new RG.Element.Lever();
        level.addElement(lever, 2, 1);
        for (let i = 0; i < 3; i++) {
            const leverDoor = new RG.Element.LeverDoor();
            lever.addTarget(leverDoor);
            level.addElement(leverDoor, 3 + i, 1);
        }
        expect(lever.getTargets()).to.have.length(3);

        const json = level.toJSON();

        const newLevel = fromJSON.restoreLevel(json);
        fromJSON.restoreEntityData();

        const elems = newLevel.getElements();
        expect(elems.length).to.equal(4);

        const newLever = elems.find(elem => elem.getType() === 'lever');
        expect(newLever.getTargets()).to.have.length(3);

    });

});
