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

// Takes turns instead of real-player
var SurrogatePlayer = function() {

};

var game = new Game();

function checkMap(map, cols, rows) {
    for (var x = 0; x < cols; x++) {
        for (var y = 0; y < rows; y++) {
            //console.log("x :: " + x);
            expect(typeof map.getCell(x,y)).not.to.equal("undefined");
        }
    }
}

function getNewLevel(cols, rows) {
    var level = new RG.Map.Level(cols, rows);
    var mapGen = new RG.Map.Generator();
    mapGen.setGen("arena", cols, rows);
    var map = mapGen.getMap();
    level.setMap(map);
    return level;

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


    var movSystem = new RG.System.Movement("Movement", ["Movement"]);

    it('Initializes the game and adds player', function() {
        var cols = 50;
        var rows = 30;
        var level = getNewLevel(cols, rows);

        //checkMap(map, cols, rows);

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

    var comSystem = new RG.System.Attack("Attack", ["Attack"]);
    var dmgSystem = new RG.System.Damage("Damage", ["Damage"]);

    it('Deals damage from attacker to defender', function() {
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
    player.setIsPlayer(true);

    it('Brain should find player cell', function() {
        expect(level.addActor(player, 2, 2)).to.equal(true);
        expect(level.addActor(mons1, 3, 5)).to.equal(true);

        var map = level.getMap();
        expect(map.isPassable(2,3)).to.equal(true);

        var brain = new RG.Brain.Rogue(mons1);
        var seenCells = level.getMap().getVisibleCells(mons1);
        expect(seenCells.length).to.not.equal(0);
        var playerCell = brain.findEnemyCell(seenCells);
        expect(playerCell.hasProp("actors")).to.equal(true);

        var pathCells = brain.getShortestPathTo(playerCell);
        expect(pathCells).to.be.a('array');
        expect(pathCells.length).to.not.equal(0);
    });

    var movSystem = new RG.System.Movement("Movement", ["Movement"]);

    it('Moves towards player when seen.', function() {
        expect(level.addActor(player, 2, 2)).to.equal(true);
        expect(level.addActor(mons1, 2, 4)).to.equal(true);
        var action = mons1.nextAction();
        action.doAction();
        movSystem.update();
        checkXY(mons1, 2, 3);
    });

});

var ItemDestroyer = function() {

    this.notify = function(evtName, obj) {
        if (evtName === RG.EVT_DESTROY_ITEM) {
            var item = obj.item;
            var owner = item.getOwner().getOwner();
            owner.getInvEq().removeItem(item);
        }
    };
    RG.POOL.listenEvent(RG.EVT_DESTROY_ITEM, this);
};

describe('How one-shot items are removed after their use', function() {
    it('Player uses a potion and it is destroyed after this.', function() {
        var potion = new RG.Item.Potion("potion");
        var player = new Actor("Player");
        var invEq = player.getInvEq();
        var itemDestroy = new ItemDestroyer();
        invEq.addItem(potion);

        // Do some damage
        var hp = player.get("Health").getHP();
        player.get("Health").setHP(hp - 5);
        var currHP = player.get("Health").getHP();

        expect(invEq.hasItem(potion)).to.equal(true);
        expect(player.getInvEq().useItem(potion, {target: player})).to.equal(true);
        expect(player.get("Health").getHP() != currHP).to.equal(true);
        expect(invEq.hasItem(potion)).to.equal(false);

    });
});
