

var chai = require("chai");
var expect = chai.expect;
var RG = require("../battles.js");

var Actor = RG.Actor.Rogue;
var Level = RG.RogueLevel;

var updateSystems = function(systems) {
    for (var i = 0; i < systems.length; i++) {
        systems[i].update();
    }
};

describe('How dice are cast and what values they give', function() {
    it('Produces random values based on constructor arguments', function() {
        var die = new RG.Die(1, 10, 1);
        for (var i = 0; i < 100; i++) {
            var val = die.roll();
            expect(val >= 2).to.equal(true);
            expect(val <= 11).to.equal(true);
        }

        var factDie = RG.FACT.createDie("2d4 + 2");
        for (i = 0; i < 100; i++) {
            val = factDie.roll();
            expect(val >= 4).to.equal(true);
            expect(val <= 10).to.equal(true);
        }
    });

    it('Works also with string args', function() {
        var die = new RG.Die("1", "10", "1");
        for (var i = 0; i < 100; i++) {
            var val = die.roll();
            expect(val >= 2).to.equal(true);
            expect(val <= 11).to.equal(true);
        }

        var dieStr = die.toString();
        expect(dieStr).to.equal("1d10 + 1");

        var die2 = new RG.Die(1, 10, 1);
        expect(die2.equals(die)).to.equal(true);
        expect(die.equals(die2)).to.equal(true);


        var die3 = new RG.Die(0, 0, 0);
        for (var j = 0; j < 20; j++)
            expect(die3.roll()).to.equal(0);

        die3.copy(die);
        expect(die3.equals(die)).to.equal(true);
    });
});

var createSystems = function() {
    var mSystem = new RG.System.Missile("Missile", ["Missile"]);
    var dSystem = new RG.System.Damage("Damage", ["Damage"]);
    return [mSystem, dSystem];
};

var createMissile = function(obj) {
    var mEnt = new RG.Item.Missile("missile");
    var mComp = new RG.Component.Missile(obj.src);
    mComp.setDamage(obj.d);
    mEnt.add("Missile", mComp);
    mComp.setTargetXY(obj.x, obj.y);
    mComp.setRange(obj.r);
    return mComp;
};

describe('How missile is fired and hits a wall', function() {



    it('Starts from source and flies to target', function() {
        var systems = createSystems();

        var level = RG.FACT.createLevel("arena", 30, 30);
        // Archer to fire the missiles
        var srcEnt = new Actor("archer");

        level.addActor(srcEnt, 1, 1);

        var mEnt = new RG.Item.Missile("missile");
        var mComp = new RG.Component.Missile(srcEnt);
        mEnt.add("Missile", mComp);

        expect(mComp.getX()).to.equal(1);
        expect(mComp.getY()).to.equal(1);
        mComp.setTargetXY(1, 4);
        mComp.setRange(3);

        updateSystems(systems);
        expect(mComp.getX()).to.equal(1);
        expect(mComp.getY()).to.equal(4);
        expect(mComp.inTarget()).to.equal(true);
        expect(mComp.isFlying()).to.equal(false);

        // Now item should be lying around in the slot
        var targetCell = level.getMap().getCell(1, 4);
        expect(targetCell.hasProp("items")).to.equal(true);
    });

    it('Stops and hits a wall', function() {
        var systems = createSystems();

        var level = RG.FACT.createLevel("arena", 30, 30);
        // Archer to fire the missiles
        var srcEnt = new Actor("archer");
        level.addActor(srcEnt, 1, 1);

        var wall = new RG.Element.Base("wall");
        var map = level.getMap();
        var cell = map.getCell(1, 3);
        cell.setProp("elements", wall);

        var mEnt = new RG.Item.Missile("missile");
        var mComp = new RG.Component.Missile(srcEnt);
        mEnt.add("Missile", mComp);
        mComp.setTargetXY(1, 4);
        mComp.setRange(3);

        updateSystems(systems);
        expect(mComp.getX()).to.equal(1);
        expect(mComp.getY()).to.equal(2);
        expect(mComp.inTarget()).to.equal(false);
        expect(mComp.isFlying()).to.equal(false);

        var targetCell = level.getMap().getCell(1, 2);
        expect(targetCell.hasProp("items")).to.equal(true);

    });

    it('Stops and hits an entity (actor)', function() {
        var systems = createSystems();

        var level = RG.FACT.createLevel("arena", 30, 30);
        // Archer to fire the missiles
        var srcEnt = new Actor("archer");
        level.addActor(srcEnt, 1, 1);
        var targetEnt = new Actor("prey");
        var targetHP = targetEnt.get("Health").getHP();

        targetEnt.get("Combat").setDefense(0);
        level.addActor(targetEnt, 1, 6);

        var mEnt = new RG.Item.Missile("missile");
        var mComp = createMissile({src: srcEnt, x: 1, y: 6, r: 10, d: 5});
        mComp.setAttack(1);

        updateSystems(systems);
        expect(mComp.getX()).to.equal(1);
        expect(mComp.getY()).to.equal(6);
        expect(mComp.inTarget()).to.equal(true);
        expect(mComp.isFlying()).to.equal(false);

        var currHP = targetEnt.get("Health").getHP();
        expect(targetEnt.has("Damage")).to.equal(false);
        expect(currHP).to.equal(targetHP - 5);

        var targetCell = level.getMap().getCell(1, 6);
        expect(targetCell.hasProp("items")).to.equal(true);
        expect(targetCell.hasPropType("missile")).to.equal(true);

    });

    it('Stops after reaching maximum range', function() {
        var systems = createSystems();
        var level = RG.FACT.createLevel("arena", 30, 30);
        // Archer to fire the missiles
        var srcEnt = new Actor("archer");
        level.addActor(srcEnt, 1, 1);

        var mComp = createMissile({src: srcEnt, x: 1, y: 6, r: 4, d: 5});

        updateSystems(systems);
        expect(mComp.getX()).to.equal(1);
        expect(mComp.getY()).to.equal(5);
        expect(mComp.inTarget()).to.equal(false);
        expect(mComp.isFlying()).to.equal(false);

        var targetCell = level.getMap().getCell(1, 5);
        expect(targetCell.hasProp("items")).to.equal(true);
        expect(targetCell.hasPropType("missile")).to.equal(true);
    });

    it('Missile passes through ethereal beings', function() {
        var systems = createSystems();
        var level = RG.FACT.createLevel("arena", 30, 30);
        var srcEnt = new Actor("archer");
        level.addActor(srcEnt, 1, 1);

        var mComp = createMissile({src: srcEnt, x: 1, y: 6, r: 4, d: 5});

        // Create a spirit and normal actor
        // TODO


    });

});
