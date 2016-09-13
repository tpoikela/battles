/**
 * Unit tests for checking that a full game works. It's tedious to repeat very
 * long sequence with GUI, but this module makes sure that basics are working.
 */

var chai = require("chai");
var expect = chai.expect;
var RG = require("../battles.js");

var RGTest = require("./roguetest.js");

var checkXY = RGTest.checkActorXY;

var Game = require("../src/game.js");
var Actor = RG.Actor.Rogue;
var Fact = RG.FACT;

var RGObjects = require("../data/battles_objects.js");
RG.Effects = require("../data/effects.js");

var LocalStorage = require('node-localstorage').LocalStorage,
localStorage = new LocalStorage('./battles_local_storage');

// Takes turns instead of real-player
var SurrogatePlayer = function() {

};

var game = new Game.Main();

var globalParser = new RG.ObjectShellParser();
globalParser.parseShellData(RG.Effects);
globalParser.parseShellData(RGObjects);

function checkMap(map, cols, rows) {
    for (var x = 0; x < cols; x++) {
        for (var y = 0; y < rows; y++) {
            //console.log("x :: " + x);
            expect(typeof map.getCell(x,y)).not.to.equal("undefined");
        }
    }
}

function getNewLevel(cols, rows) {
    return RG.FACT.createLevel("arena", cols, rows);
}

/** Returns a level with initialized with given actors.*/
function getLevelWithNActors(cols, rows, nactors) {
    var level = getNewLevel(cols, rows);
    var actors = [];
    for (var i = 0; i < nactors; i++) {
        var actor = new Actor(false);
        actors.push(actor);
        level.addActorToFreeCell(actor);
    }
    return [level, actors];
}

describe('How game should proceed', function() {



    it('Initializes the game and adds player', function() {
        var movSystem = new RG.System.Movement("Movement", ["Movement"]);
        var cols = 50;
        var rows = 30;
        var level = getNewLevel(cols, rows);

        var actor = new Actor("Player"); // player
        actor.setIsPlayer(true);
        actor.setFOVRange(5);
        game.addLevel(level);
        expect(game.addPlayer(actor)).to.equal(true);

        expect(game.shownLevel()).to.equal(level);
        expect(actor.getLevel()).to.equal(level);

        var newMap = level.getMap();
        checkMap(newMap, cols, rows);

        var movComp = new RG.Component.Movement(12, 13, level);
        actor.add("Movement", movComp);
        movSystem.update();
        expect(actor.getX()).to.equal(12);
        expect(actor.getY()).to.equal(13);

        var explCells = level.exploreCells(actor);
        expect(explCells.length).to.equal(11*11);

        //expect(level.moveActorTo(actor, 11, 13)).to.equal(true);

    });
});

/** For listening actor killed events.*/
var KillListener = function(actor) {

    var _actor = actor;

    this.isAlive = actor.get("Health").isAlive();

    this.notify = function(evtName, obj) {
        if (evtName === RG.EVT_ACTOR_KILLED) {
            if (obj.actor === _actor) {
                this.isAlive = false;
            }
        }
    };
    RG.POOL.listenEvent(RG.EVT_ACTOR_KILLED, this);
};

describe('How combat should evolve', function() {


    it('Deals damage from attacker to defender', function() {
        var comSystem = new RG.System.Attack("Attack", ["Attack"]);
        var dmgSystem = new RG.System.Damage("Damage", ["Damage"]);

        var cols = 50;
        var rows = 30;
        var level = getNewLevel(cols, rows);

        var attacker = new Actor("Attacker");
        expect(attacker.get("Health").isAlive()).to.equal(true);
        var defender = new Actor("Defender");
        expect(defender.get("Health").isAlive()).to.equal(true);
        attacker.get("Combat").setAttack(10);
        attacker.get("Combat").setDamage("1d4");
        defender.get("Health").setHP(1);
        defender.get("Combat").setDefense(0);
        defender.get("Combat").setProtection(0);
        defender.get("Stats").setAgility(0);

        level.addActor(attacker, 1, 1);
        level.addActor(defender, 2, 2);

        var attackComp = new RG.Component.Attack(defender);
        attacker.add("Attack", attackComp);
        comSystem.update();
        expect(defender.has("Damage")).to.equal(true);
        dmgSystem.update();
        expect(attacker.has("Attack")).to.equal(false);
        expect(defender.has("Damage")).to.equal(false);

        expect(defender.get("Health").isAlive()).to.equal(false);

        var def2 = new Actor("defender2");
        level.addActor(def2, 2, 2);

        var attComp2 = new RG.Component.Attack(def2);
        attacker.add("Attack", attComp2);

        def2.get("Health").setHP(20);
        def2.get("Combat").setDefense(0);
        def2.get("Stats").setAgility(0);
        expect(def2.get("Health").isAlive()).to.equal(true);

        comSystem.update();
        expect(def2.has("Damage")).to.equal(true);
        dmgSystem.update();
        expect(def2.has("Damage")).to.equal(false);

        expect(def2.get("Health").getHP() < 20).to.equal(true);

        expect(def2.get("Health").isAlive()).to.equal(true);

        attacker.add("Attack", attComp2);
        comSystem.update();
        dmgSystem.update();

        expect(def2.get("Health").isAlive()).to.equal(true);

        var killListen = new KillListener(def2);
        while (killListen.isAlive) {
            attacker.add("Attack", attComp2);
            comSystem.update();
            dmgSystem.update();
        }
        expect(def2.get("Health").isAlive()).to.equal(false);

    });
});

describe('How AI brain works', function() {
    var cols = 30;
    var rows = 20;
    var level = getNewLevel(cols, rows);
    var mons1 = new Actor("Monster");
    var player = new Actor("Player");
    player.setType("player");
    player.setIsPlayer(true);

    it('Brain should find player cell', function() {
        expect(level.addActor(player, 2, 2)).to.equal(true);
        expect(level.addActor(mons1, 3, 5)).to.equal(true);

        var map = level.getMap();
        expect(map.isPassable(2,3)).to.equal(true);

        var brain = mons1.getBrain();
        var seenCells = level.getMap().getVisibleCells(mons1);
        expect(seenCells.length).to.not.equal(0);
        var playerCell = brain.findEnemyCell(seenCells);
        expect(playerCell.hasProp("actors")).to.equal(true);

        var pathCells = brain.getShortestPathTo(playerCell);
        expect(pathCells).to.be.an('array');
        expect(pathCells.length).to.not.equal(0);
    });


    it('Moves towards player when seen.', function() {
        var movSystem = new RG.System.Movement("Movement", ["Movement"]);
        expect(level.addActor(player, 2, 2)).to.equal(true);
        expect(level.addActor(mons1, 2, 4)).to.equal(true);
        var action = mons1.nextAction();
        action.doAction();
        movSystem.update();
        checkXY(mons1, 2, 3);
    });

});

describe('Game.Save how saving works', function() {

    // TODO add to RGTest
    var setupPlayer = function(name) {
        var level = RG.FACT.createLevel("arena", 10, 10);
        level.setLevelNumber(3);
        var player = new RG.Actor.Rogue(name);
        player.setType("player");
        player.setIsPlayer(true);
        level.addActor(player, 3, 3);
        return player;
    }

    it('Saves/restores player properly', function() {
        var gameSave = new RG.Game.Save();
        gameSave.setStorage(localStorage);
        var player = setupPlayer("Player1");

        player.get("Experience").setExpLevel(5);
        gameSave.savePlayer(player);

        var rest = gameSave.restorePlayer("Player1");
        expect(rest.getName()).to.equal(player.getName());
        expect(rest.get("Experience").getExpLevel()).to.equal(5);

        var playersAsObj = gameSave.getPlayersAsObj();
        expect(playersAsObj.hasOwnProperty("Player1")).to.equal(true);

        var die = rest.get("Combat").getDamageDie();
        expect(die !== null).to.equal(true);
        expect(typeof die !== "undefined").to.equal(true);
        expect(gameSave.getDungeonLevel()).to.equal(3);

        var playerList = gameSave.getPlayersAsList();
        var playerObj = playerList[0];
        expect(playerObj.hasOwnProperty("name")).to.equal(true);
        expect(playerObj.hasOwnProperty("expLevel")).to.equal(true);
        expect(playerObj.hasOwnProperty("dungeonLevel")).to.equal(true);

    });

    it('Saves/restores inventory properly', function() {
        var gameSave = new RG.Game.Save();
        gameSave.setStorage(localStorage);
        var player = setupPlayer("Player1");
        var invEq = player.getInvEq();

        // Test first with simple food
        var food = new RG.Item.Food("Habanero");
        invEq.addItem(food);

        gameSave.savePlayer(player);
        var rest = gameSave.restorePlayer("Player1");
        var invItems = rest.getInvEq().getInventory().getItems();
        expect(invItems.length).to.equal(1);
        expect(invItems[0].equals(food)).to.equal(true);

        // Create a new weapon
        var weapon = new RG.Item.Weapon("Sword");
        weapon.setAttack(10);
        weapon.setDamage("3d3+5");
        weapon.count = 2;

        // Add it, save player and then restore
        invEq.addItem(weapon);
        gameSave.savePlayer(player);
        rest = gameSave.restorePlayer("Player1");
        invItems = rest.getInvEq().getInventory().getItems();
        expect(invItems.length).to.equal(2);

        var sword = invItems[1];
        expect(sword.equals(weapon)).to.equal(true);
        expect(sword.count).to.equal(2);

        var armour = new RG.Item.Armour("Plate mail");
        armour.setDefense(11);
        invEq.addItem(armour);
        gameSave.savePlayer(player);
        rest = gameSave.restorePlayer("Player1");
        invItems = rest.getInvEq().getInventory().getItems();
        expect(invItems.length).to.equal(3);

        var plateMail = invItems[2];
        expect(armour.equals(plateMail)).to.equal(true);

    });

    it('Saves/restores and equips equipment correctly', function() {
        var gameSave = new RG.Game.Save();
        gameSave.setStorage(localStorage);
        var player = setupPlayer("HeroPlayer");
        var invEq = player.getInvEq();

        var weapon = new RG.Item.Weapon("Sword");
        weapon.setDefense(15);
        weapon.setAttack(1);
        weapon.setWeight(2.5);

        invEq.addItem(weapon);
        expect(invEq.equipItem(weapon)).to.equal(true);

        // Empty spirit gem
        var emptygem = new RG.Item.SpiritGem("Wolf gem");
        invEq.addItem(emptygem);

        var gemWithSpirit = new RG.Item.SpiritGem("Used gem");
        var spirit = new RG.Actor.Spirit("Wolf spirit");
        spirit.get("Stats").setStrength(11);
        gemWithSpirit.setSpirit(spirit);
        invEq.addItem(gemWithSpirit);

        gameSave.savePlayer(player);
        var rest = gameSave.restorePlayer("HeroPlayer");
        var restWeapon = rest.getWeapon();
        expect(restWeapon.equals(weapon)).to.equal(true);

        var inv = rest.getInvEq().getInventory();
        var emptyGemRest = inv.getItems()[0];
        expect(emptyGemRest.equals(emptygem)).to.equal(true);

        var gemWithSpirit = inv.getItems()[1];
        var spiritRest = gemWithSpirit.getSpirit();
        var statsRest = spiritRest.get("Stats");
        var statsOrig = spirit.get("Stats");
        expect(statsRest.getStrength()).to.equal(statsOrig.getStrength());




    });

});

describe('How poison item is used, and experience propagates', function() {
    it('Kills an actor after some time', function() {

        var game = new RG.Game.Main();
        var level = RG.FACT.createLevel("arena", 20, 20);
        var assassin = new Actor("assassin");
        var poison = globalParser.createActualObj("items", "Potion of frost poison");
        assassin.getInvEq().addItem(poison);

        var victim = new Actor("victim");
        victim.get("Health").setHP(5);

        level.addActor(assassin, 3, 5);
        level.addActor(victim, 6, 6);
        poison.useItem({target: level.getMap().getCell(6, 6)});

        var startExp = assassin.get("Experience").getExp();

        var count = 0;
        while (victim.get("Health").isAlive() && count < 100) {
            game.simulateGame();
            ++count;
        }
        var endExp = assassin.get("Experience").getExp();
        expect(endExp > startExp, "Exp. points given from poison").to.equal(true);

        var curePoison = globalParser.createActualObj("items", "Potion of cure poison");
        var frostPoison = globalParser.createActualObj("items", "Potion of frost poison");
        assassin.getInvEq().addItem(frostPoison);
        var curedVictim = new Actor("Cured victim");

        level.addActor(curedVictim, 4, 4);
        expect(frostPoison.useItem({target: level.getMap().getCell(4, 4)})).to.equal(true);
        expect(curedVictim.has("Poison")).to.equal(true);
        curedVictim.getInvEq().addItem(curePoison);
        game.simulateGame();
        expect(curePoison.useItem({target: level.getMap().getCell(4, 4)})).to.equal(true);
        expect(curedVictim.has("Poison")).to.equal(false);
        expect(curedVictim.get("Health").isAlive()).to.equal(true);


    });
});

