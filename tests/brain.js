
var chai = require("chai");
var expect = chai.expect;

var RG = require("../battles");
var ROT = require("../lib/rot.js");

var RGTest = require("./roguetest.js");

var Brain = RG.Brain;

describe('Brain.Player', function() {

    var level = RG.FACT.createLevel("arena", 10, 10);
    var player = new RG.Actor.Rogue("Player");

    var demon = new RG.Actor.Rogue("Demon");
    demon.setType("demon");
    demon.setBrain(new RG.Brain.Demon(demon));
    demon.addEnemy(player);

    player.setIsPlayer(true);
    level.addActor(player, 1, 1);
    level.addActor(demon, 1, 2);

    it('Accepts key commands', function() {
        var brain = new Brain.Player(player);

        brain.decideNextAction({code: ROT.VK_R});
        expect(player.get("Stats").getSpeed()).to.equal(150);
        expect(brain.isRunModeEnabled()).to.equal(true);
        expect(brain.energy).to.equal(RG.energy.RUN);
        brain.decideNextAction({code: ROT.VK_S});
        expect(brain.isRunModeEnabled()).to.equal(false);
        expect(brain.energy).to.equal(RG.energy.REST);

        brain.decideNextAction({code: ROT.VK_C});
        expect(brain.energy).to.equal(RG.energy.MOVE);

        brain.decideNextAction({code: ROT.VK_X});
        expect(brain.energy).to.equal(RG.energy.ATTACK);

    });

    it('Has cmds for more complex things', function() {
        var brain = new Brain.Player(player);
        brain.decideNextAction({code: ROT.VK_S});
        expect(brain.energy).to.equal(RG.energy.REST);

        brain.decideNextAction({cmd: "missile"});
        expect(brain.energy).to.equal(RG.energy.MISSILE);

        brain.decideNextAction({cmd: "use", item: {}});
        expect(brain.energy).to.equal(0);

    });
});

describe('Basic functions of Rogue Brain', function() {
    it('description', function() {
        var brain = new Brain.Rogue();
    });
});
