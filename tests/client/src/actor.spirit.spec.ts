
import RG from '../../../client/src/rg';
import { expect } from 'chai';
import * as Actor from '../../../client/src/actor';
import * as Item from '../../../client/src/item';
import * as Component from '../../../client/src/component';
import {FactoryLevel} from '../../../client/src/factory.level';

const Spirit = Actor.SentientActor;

describe('RG.Actor.Spirit', () => {

    it('Is an ethereal being, doesnt block passage', () => {
        const levelFact = new FactoryLevel();
        const level = levelFact.createLevel('arena', 10, 10);
        const spirit = new Spirit('Wolf spirit');
        spirit.add(new Component.Ethereal());
        const actor = new Actor.SentientActor('Being');

        const spiritX = 2;
        const spiritY = 3;

        const map = level.getMap();
        expect(map.isPassable(spiritX, spiritY, 0, 0)).to.equal(true);
        level.addActor(spirit, spiritX, spiritY);
        level.addActor(actor, 3, 4);
        expect(map.isPassable(3, 4, 2, 3)).to.equal(false);

        expect(map.isPassable(spiritX, spiritY, 0, 0)).to.equal(true);

        const anotherBeing = new Actor.SentientActor('Being2');
        level.addActor(anotherBeing, spiritX, spiritY);
        expect(map.isPassable(spiritX, spiritY, 0, 0)).to.equal(false);

        const spiritGem = new Item.SpiritGem('Lesser gem');
        const spiritCell = map.getCell(spiritX, spiritY);
        expect(spiritCell.getProp('actors').length).to.equal(2);

        expect(spiritGem.getStrength()).to.equal(0);
        spirit.get('Stats').setStrength(66);

        actor.getInvEq().addItem(spiritGem);
        spiritGem.useItem({target: spiritCell});
        expect(spiritGem.has('SpiritBind')).to.equal(true);
    });
});
