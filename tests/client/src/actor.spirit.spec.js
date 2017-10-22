
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');

const Spirit = RG.Actor.Spirit;
const Actor = RG.Actor.Rogue;

describe('RG.Actor.Spirit', () => {
    it('Is an ethereal being, doesnt block passage', () => {
        const level = RG.FACT.createLevel('arena', 10, 10);
        const spirit = new Spirit('Wolf spirit');
        const actor = new Actor('Being');

        const spiritX = 2;
        const spiritY = 3;

        const map = level.getMap();
        expect(map.isPassable(spiritX, spiritY)).to.equal(true);
        level.addActor(spirit, spiritX, spiritY);
        level.addActor(actor, 3, 4);
        expect(map.isPassable(3, 4)).to.equal(false);

        expect(map.isPassable(spiritX, spiritY)).to.equal(true);

        const anotherBeing = new Actor('Being2');
        level.addActor(anotherBeing, spiritX, spiritY);
        expect(map.isPassable(spiritX, spiritY)).to.equal(false);

        const spiritGem = new RG.Item.SpiritGem('Lesser gem');
        const spiritCell = map.getCell(spiritX, spiritY);
        expect(spiritCell.getProp('actors').length).to.equal(2);

        expect(spiritGem.getStrength()).to.equal(0);
        spirit.get('Stats').setStrength(66);

        actor.getInvEq().addItem(spiritGem);
        spiritGem.useItem({target: spiritCell});
        expect(spiritGem.has('SpiritBind')).to.equal(true);
    });
});
