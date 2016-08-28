

var chai = require("chai");
var expect = chai.expect;
var RG = require("../battles.js");

var Actor = RG.RogueActor;
var Level = RG.RogueLevel;

var updateSystems = function(systems) {
    for (var i = 0; i < systems.length; i++) {
        systems[i].update();
    }
};

describe('How dice are cast and what values they give', function() {
    it('description', function() {
        var die = new RG.Die(1, 10, 1);
        for (var i = 0; i < 100; i++) {
            var val = die.roll();
            expect(val >= 1).to.equal(true);
            expect(val <= 11).to.equal(true);
        }

        var factDie = RG.FACT.createDie("2d4 + 2");
        for (i = 0; i < 100; i++) {
            val = factDie.roll();
            expect(val >= 4).to.equal(true);
            expect(val <= 10).to.equal(true);
        }
    });
});

describe('How missile is fired and hits a wall', function() {


    var mSystem = new RG.MissileSystem("Missile", ["Missile"]);
    var dSystem = new RG.DamageSystem("Damage", ["Damage"]);

    var systems = [mSystem, dSystem];

    it('Starts from source and flies to target', function() {
        var level = RG.FACT.createLevel("arena", 30, 30);
        // Archer to fire the missiles
        var srcEnt = new Actor("archer");

        level.addActor(srcEnt, 1, 1);

        var mEnt = new RG.RogueItemMissile("missile");
        var mComp = new RG.MissileComponent(srcEnt);
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
        var level = RG.FACT.createLevel("arena", 30, 30);
        // Archer to fire the missiles
        var srcEnt = new Actor("archer");
        level.addActor(srcEnt, 1, 1);

        var wall = new RG.RogueElement("wall");
        var map = level.getMap();
        var cell = map.getCell(1, 3);
        cell.setProp("elements", wall);

        var mEnt = new RG.RogueItemMissile("missile");
        var mComp = new RG.MissileComponent(srcEnt);
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
        var level = RG.FACT.createLevel("arena", 30, 30);
        // Archer to fire the missiles
        var srcEnt = new Actor("archer");
        level.addActor(srcEnt, 1, 1);
        var targetEnt = new Actor("prey");
        var targetHP = targetEnt.get("Health").getHP();

        targetEnt.get("Combat").setDefense(0);
        level.addActor(targetEnt, 1, 6);

        var mEnt = new RG.RogueItemMissile("missile");
        var mComp = new RG.MissileComponent(srcEnt);
        mComp.setAttack(1);
        mComp.setDamage(5);
        mEnt.add("Missile", mComp);
        mComp.setTargetXY(1, 6);
        mComp.setRange(10);

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
        var level = RG.FACT.createLevel("arena", 30, 30);
        // Archer to fire the missiles
        var srcEnt = new Actor("archer");
        level.addActor(srcEnt, 1, 1);

        var mEnt = new RG.RogueItemMissile("missile");
        var mComp = new RG.MissileComponent(srcEnt);
        mComp.setDamage(5);
        mEnt.add("Missile", mComp);
        mComp.setTargetXY(1, 6);
        mComp.setRange(4);

        updateSystems(systems);
        expect(mComp.getX()).to.equal(1);
        expect(mComp.getY()).to.equal(5);
        expect(mComp.inTarget()).to.equal(false);
        expect(mComp.isFlying()).to.equal(false);

        var targetCell = level.getMap().getCell(1, 5);
        expect(targetCell.hasProp("items")).to.equal(true);
        expect(targetCell.hasPropType("missile")).to.equal(true);
    });
});
