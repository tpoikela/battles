
var chai = require("chai");
var expect = chai.expect;
var RG = require("../battles.js");

var Spirit = RG.Actor.Spirit;
var Actor = RG.Actor.Rogue;

describe('RG.Actor.Spirit', function() {
    it('Is an ethereal being, doesnt block passage', function() {
        var level = RG.FACT.createLevel("arena", 10, 10);
        var spirit = new Spirit("Wolf spirit");
        var actor = new Actor("Being");


        var spiritX = 2;
        var spiritY = 3;

        var map = level.getMap();
        expect(map.isPassable(spiritX, spiritY)).to.equal(true);
        level.addActor(spirit, spiritX, spiritY);
        level.addActor(actor, 3, 4);
        expect(map.isPassable(3, 4)).to.equal(false);

        expect(map.isPassable(spiritX, spiritY)).to.equal(true);

        var anotherBeing = new Actor("Being2");
        level.addActor(anotherBeing, spiritX, spiritY);
        expect(map.isPassable(spiritX, spiritY)).to.equal(false);

        var spiritGem = new RG.Item.SpiritGem("Lesser gem");
        var spiritCell = map.getCell(spiritX, spiritY);
        expect(spiritCell.getProp("actors").length).to.equal(2);

        expect(spiritGem.getStrength()).to.equal(0);
        spirit.get("Stats").setStrength(66);

        spiritGem.useItem({target: spiritCell});
        expect(spiritCell.getProp("actors").length).to.equal(1);
        expect(spiritGem.getStrength()).to.equal(66);

    });
});
