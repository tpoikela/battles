
import {Capital} from '../../../client/data/capital';
import chai from 'chai';

import RG from '../../../client/src/rg';
import {Placer} from '../../../client/src/placer';
import {GameMain} from '../../../client/src/game';
import {QuestData} from '../../../client/src/quest';
import {RGTest} from '../../roguetest';
import {FromJSON} from '../../../client/src/game.fromjson';

import {chaiBattles} from '../../helpers/chai-battles';
import {FactoryLevel} from '../../../client/src/factory.level';
import {FactoryBattle} from '../../../client/src/factory.battle';
import * as Item from '../../../client/src/item';
import * as Component from '../../../client/src/component';
import * as Element from '../../../client/src/element';
import {OWMap} from '../../../client/src/overworld.map';
import {FactoryWorld} from '../../../client/src/factory.world';
import {FactoryGame} from '../../../client/src/factory.game';
import {SentientActor} from '../../../client/src/actor';
import {RGUnitTests} from '../../rg.unit-tests';
import {GameObject} from '../../../client/src/game-object';
import {ObjectShell} from '../../../client/src/objectshellparser';
import * as World from '../../../client/src/world';

const expect = chai.expect;
chai.use(chaiBattles);

const Stairs = Element.ElementStairs;

describe('Game.FromJSON', function() {
    this.timeout(4000);
    let fromJSON = null;
    let factLevel = null;

    beforeEach(() => {
        fromJSON = new FromJSON();
        factLevel = new FactoryLevel();
    });

    afterEach(() => {
        fromJSON = null;
        factLevel = null;
    });

    it('Converts item JSON back to Items', () => {
        const item1 = new Item.Weapon('knife');
        item1.setValue(100);
        const json = item1.toJSON();
        const newItem = fromJSON.createItem(json);

        expect(newItem.getName()).to.equal(item1.getName());
        expect(newItem.getType()).to.equal(item1.getType());
        expect(newItem.getValue()).to.equal(100);
    });

    it('Converts Ammo to JSON and back', () => {
        const arrow = new Item.Ammo('Steel arrow');
        const json = arrow.toJSON();
        const newArrow = fromJSON.createItem(json);
        expect(arrow.equals(newArrow)).to.equal(true);
    });

    it('converts a Door element to JSON and back', () => {
        const door = new Element.ElementDoor(true);
        door.setMsg({onEnter: 'There is an open door here'});
        const json = door.toJSON();
        const newDoor = fromJSON.createElement({obj: json});
        expect(door.getMsg('onEnter')).to.not.be.empty;
        expect(newDoor.getMsg('onEnter')).to.not.be.empty;
        expect(door.getMsg('onEnter')).to.equal(newDoor.getMsg('onEnter'));
        expect(door.isOpen()).to.equal(newDoor.isOpen());
        expect(newDoor.getType()).to.equal('door');
    });

    it('Converts level.map JSON back to CellMap', () => {
        const level = factLevel.createLevel('arena', 20, 20);
        const json = level.toJSON();
        const newLevel = fromJSON.restoreLevel(json);
        const newMap = newLevel.getMap();
        for (let x = 0; x < 20; x++) {
            expect(newMap.getCell(x, 0).isPassable(),
                `Cell ${x},0 should have wall thus not passable`)
                .to.equal(false);
        }
    });

    it('can be serialized with objects', () => {
        const level1 = factLevel.createLevel('arena', 20, 20);
        const level2 = factLevel.createLevel('arena', 20, 20);
        const stairs = new Stairs('stairsDown', level1, level2);
        const stairs2 = new Stairs('stairsUp', level2, level1);

        expect(level1.addStairs(stairs, 2, 2)).to.be.true;
        expect(level2.addStairs(stairs2, 3, 4)).to.be.true;
        stairs.connect(stairs2);

        const json = level1.toJSON();
        const fromJSON = new FromJSON();
        const newLevel = fromJSON.restoreLevel(json);

        expect(newLevel.getID()).to.equal(level1.getID());
        expect(newLevel.getStairs()).to.have.length(1);
    });


    it('Converts level JSON back to Level', () => {
        const level = factLevel.createLevel('arena', 20, 20);
        const json = level.toJSON();
        const newLevel = fromJSON.restoreLevel(json);
        expect(newLevel.getID()).to.equal(level.getID());
    });

    it('converts overworld JSON back to OverWorld.Map', () => {
        const conf = {};
        const ow = OWMap.createOverWorld(conf);
        const json = ow.toJSON();
        const newOw = fromJSON.restoreOverWorld(json);
        expect(newOw).to.exist;

        expect(newOw.getMap()).to.deep.equal(ow.getMap());
    });


    it('converts level and its objects into JSON and back to object', () => {
        const level = factLevel.createLevel('arena', 10, 10);
        const actor = new SentientActor('Urkh!');
        actor.setType('goblin');
        actor.setFOVRange(21);

        const goblinEntID = actor.getID();
        const item = new Item.Weapon('sword');
        const swordID = item.getID();
        level.addActor(actor, 2, 4);
        level.addItem(item, 3, 3);

        const shopElem = new Element.ElementShop();
        const shopItem = new Item.Weapon('Sword for sale');
        shopItem.add(new Component.Unpaid());
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

        expect(newGoblin.getXY()).to.deep.equal([2, 4]);

        expect(elements).to.have.length(1);
        expect(elements[0].getType()).to.equal('shop');

        expect(items[1].has('Unpaid'), 'Item is unpaid').to.be.true;
    });

    it('connects levels after restoring game from JSON', () => {
        const game = new GameMain();
        const level1 = factLevel.createLevel('arena', 10, 10);
        const level2 = factLevel.createLevel('arena', 10, 10);
        const s1 = new Element.ElementStairs('stairsDown', level1, level2);
        const s2 = new Element.ElementStairs('stairsUp', level2, level1);
        s1.connect(s2);
        level1.addStairs(s1, 1, 1);
        level2.addStairs(s2, 2, 2);
        game.addLevel(level1);
        game.addLevel(level2);

        const prevID = GameObject.ID;
        const json = game.toJSON();
        let newGame = new GameMain();
        newGame = fromJSON.createGame(newGame, json);
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

        const newID = GameObject.ID;
        expect(newID, 'GameObject ID is restored').to.equal(prevID);

    });

    it('converts full game into JSON and back to object', () => {
        const game = new GameMain();
        const level = factLevel.createLevel('arena', 10, 10);
        const player = new SentientActor('MyPlayer');
        player.setType('player');
        player.setIsPlayer(true);
        game.addLevel(level);
        game.addPlayer(player);
        const json = game.toJSON();
        let newGame = new GameMain();
        newGame = fromJSON.createGame(newGame, json);
        const newPlayer = newGame.getPlayer();
        expect(newPlayer.getName()).to.equal('MyPlayer');
    });

    it('converts a mountain to JSON and back to object', () => {
        const mountain = new World.Mountain('Mount doom');
        const f1 = new World.MountainFace('f1');
        const f2 = new World.MountainFace('f2');

        const goblin = new SentientActor('Small goblin');
        goblin.get('Stats').setAgility(17);
        goblin.setType('goblin');

        const l1 = factLevel.createLevel('mountain', 50, 100);
        l1.addActor(goblin, 1, 3);
        f1.addLevel(l1);
        const l2 = factLevel.createLevel('mountain', 50, 100);
        f2.addLevel(l2);
        mountain.addFace(f1);
        mountain.addFace(f2);
        mountain.connectSubZones('f1', 'f2', 0, 0);

        const loreComp = new Component.Lore();
        loreComp.addTopic('mainQuest', 'A test topic');
        mountain.add(loreComp);

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

        const factWorld = new FactoryWorld();
        factWorld.setId2Level(id2level);
        const newMountain = factWorld.createMountain(json);
        factWorld.fromJSON = new FromJSON();
        factWorld.addZoneComps(newMountain, json);
        expect(newMountain.getLevels()).to.have.length(2);
        expect(newMountain).to.have.component('Lore');
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
        const capitalLevel = new Capital(140, 220).getLevel();
        const allActors = capitalLevel.getActors();
        const shopKeepers = allActors.filter(ent =>
            (/shopkeeper/).test(ent.getName()));

        expect(shopKeepers.length).to.equal(6);

        const nActorsBefore = allActors.length;
        const json = capitalLevel.toJSON();

        const newLevel = fromJSON.restoreLevel(json);
        fromJSON.restoreEntityData();
        const nActorsAfter = newLevel.getActors().length;
        expect(nActorsAfter).to.equal(nActorsBefore);

        const game = new GameMain();
        game.addLevel(newLevel);
        game.addActiveLevel(newLevel);
        for (let i = 0; i < 50; i++) {
            game.simulateGame(1);
        }
    });

    it('can serialize/de-serialize a level with comps attached', () => {
        const game = new GameMain();
        const level = factLevel.createLevel('arena', 80, 40);
        const qTarget = new Component.QuestTarget();
        qTarget.setTargetType('location');
        qTarget.setTarget(level);
        level.add(qTarget);
        game.addLevel(level);

        const json = game.toJSON();
        let newGame = new GameMain();
        newGame = fromJSON.createGame(newGame, json);

        const newLevel = newGame.getLevels()[0];
        expect(newLevel).to.have.component('QuestTarget');
    });

    it('can serialize/de-serialize game after fighting', () => {
        const game = new GameMain();
        const level = factLevel.createLevel('arena', 80, 40);
        const parser = ObjectShell.getParser();

        const actors = [];

        // Create some demons and fighters
        for (let i = 0; i < 50; i++) {
            const demon = parser.createActor('winter demon');
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

        Placer.addPropsToFreeCells(level, actors, RG.TYPE_ACTOR);
        game.addActiveLevel(level);
        game.addLevel(level);
        for (let i = 0; i < 500; i++) {
            game.simulateGame();
        }

        const json = game.toJSON();
        let newGame = new GameMain();
        newGame = fromJSON.createGame(newGame, json);

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
        const factGame = new FactoryGame();
        const game = new GameMain();
        const level = factLevel.createLevel('arena', 10, 10);
        const player = new SentientActor('MyPlayer');
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
        expect(typeof player.getBook()).to.equal('undefined');
        factGame.addActorClass(gameConf, player);
        expect(player.getBook()).to.not.be.empty;

        let json = game.toJSON();
        let newGame = new GameMain();
        newGame = fromJSON.createGame(newGame, json);
        let newPlayer = newGame.getPlayer();
        expect(newPlayer.getName()).to.equal('MyPlayer');

        const newInvEq = newPlayer.getInvEq();
        const invItems = newInvEq.getInventory().getItems();
        const eqItems = newInvEq.getEquipment().getItems();
        expect(invItems).to.have.length(2);
        expect(eqItems).to.have.length(3);

        const spellbook = newPlayer.getBook();
        expect(spellbook).to.not.be.empty;
        expect(newPlayer.has('ActorClass')).to.equal(true);

        const parser = ObjectShell.getParser();
        const rune = parser.createItem('rune of venom');
        newPlayer.getInvEq().addItem(rune);
        rune.useItem({target: newPlayer.getCell()});
        newGame.simulate(1);
        expect(newPlayer).to.have.component('Poison');

        const newGem = newPlayer.getInvEq().getEquipment().getItem(RG.EQUIP.SPIRITGEM);
        expect(newGem.getSpirit().getBrain()).not.to.equal(undefined);

        json = newGame.toJSON();
        newGame = new GameMain();
        newGame = new FromJSON().createGame(newGame, json);
        newPlayer = newGame.getPlayer();
    });

    it('can serialize/de-serialize pick-axe', () => {
        const parser = ObjectShell.getParser();
        const pickaxe = parser.createItem('Pick-axe');
        expect(typeof pickaxe.useItem).to.equal('function');

        pickaxe.removeAll('OnAddCb');
        pickaxe.removeAll('OnRemoveCb');
        const json = pickaxe.toJSON();

        const restPickaxe = fromJSON.createItem(json);
        expect(typeof restPickaxe.useItem).to.equal('function');

        restPickaxe.removeAll('OnAddCb');
        restPickaxe.removeAll('OnRemoveCb');
        const oldComps = pickaxe.getComponents();
        const newComps = restPickaxe.getComponents();
        const oldCompNames = Object.keys(oldComps);
        const newCompNames = Object.keys(newComps);

        expect(newCompNames.length).to.equal(oldCompNames.length);
    });

    it('can serialize/de-serialize actor with skills', () => {
        const actor = new SentientActor('skilled one');
        const skills = new Component.Skills();
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
        const parentLevel = factLevel.createLevel('arena', 80, 30);
        const battle = new FactoryBattle().createBattle(parentLevel);
        const armies = battle.getArmies();
        const game = new GameMain();
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
        const magicSword = new Item.Weapon('Magic sword');
        const addOnHit = new Component.AddOnHit();
        const poisonComp = new Component.Poison();
        //rm poisonComp.setDurationDie('1d6');
        poisonComp.setDamageDie('1d8 + 4');
        addOnHit.setComp(poisonComp);
        magicSword.add(addOnHit);

        const json = magicSword.toJSON();

        const newSword = fromJSON.createItem(json);
        fromJSON.addCompsToEntity(newSword, json.components);
        expect(newSword.getID()).to.equal(magicSword.getID());

        const newJSON = newSword.toJSON();
        expect(newJSON).to.deep.equal(json);
    });

    it('can restore elements with entity refs', () => {
        const level = factLevel.createLevel('arena', 10, 10);
        const lever = new Element.ElementLever();
        level.addElement(lever, 2, 1);
        for (let i = 0; i < 3; i++) {
            const leverDoor = new Element.ElementLeverDoor();
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


    it('can convert Quest components to JSON and back', () => {
        const quester = new SentientActor('quester');
        const giver = new SentientActor('giver');
        const killTarget = new SentientActor('killTarget');
        const level = RGUnitTests.wrapIntoLevel([quester, giver, killTarget]);

        const questData = new QuestData();
        questData.addTarget('location', level);
        questData.addTarget('kill', killTarget);
        expect(questData.getPathTypes()).to.deep.equal(['location', 'kill']);

        const targetComp = new Component.QuestTarget();
        targetComp.setTarget(killTarget);
        targetComp.setTargetType('kill');
        killTarget.add(targetComp);

        const giverComp = new Component.QuestGiver(questData);
        giver.add(giverComp);
        giverComp.addTarget('kill', killTarget);

        const questTargets = giverComp.getQuestTargets();
        const questComp = new Component.Quest();
        questComp.setGiver(giver);
        questComp.addTarget(questTargets[0]);
        quester.add(questComp);

        const game = new GameMain();
        game.addLevel(level);
        const json = game.toJSON();

        let newGame = new GameMain();
        newGame = fromJSON.createGame(newGame, json);

        const restLevel = newGame.getLevels()[0];
        const actors = restLevel.getActors();

        const newQuester = actors.find(act => (
            act.getID() === quester.getID()));
        expect(newQuester).to.have.component('Quest');

        const newQuestComp = newQuester.get('Quest');
        const targets = newQuestComp.getQuestTargets();
        const newFirstTarget = targets[0];
        expect(newFirstTarget.id).to.equal(killTarget.getID());
        expect(newFirstTarget.name).to.equal(killTarget.getName());

        const newGiver = actors.find(act => (
            act.getID() === giver.getID()));
        expect(newGiver).to.have.component('QuestGiver');

        const newGiverComp = newGiver.get('QuestGiver');
        expect(newGiverComp.getQuestID()).to.equal(giverComp.getQuestID());

        const firstKill = newQuestComp.first('kill');
        const refData = {
            id: killTarget.getID(), name: killTarget.getName(),
            targetType: 'kill', subQuestID: -1,
            isCompleted: false,
        };
        expect(firstKill).to.deep.equal(refData);
        /*
        const newQuestData = newGiverComp.getQuestData();
        expect(newQuestData.path).to.have.length(2);

        expect(newQuestData.path).to.have.length(2);
        const pathTypes = newQuestData.getPathTypes();
        expect(pathTypes).to.deep.equal(['location', 'kill']);

        const pathTargets = newQuestData.getPathTargets();
        expect(pathTargets).to.deep.equal([restLevel, newKillTarget]);
        */
    });
});
