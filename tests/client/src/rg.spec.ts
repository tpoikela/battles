
import { expect } from 'chai';
import RG from '../../../client/src/rg';
import {SentientActor} from '../../../client/src/actor';
import {Inventory} from '../../../client/src/inv';
import * as Item from '../../../client/src/item';

describe('RG', () => {
    it('it manages cell styles and chars', () => {
        RG.addCellStyle(RG.TYPE_ITEM, 'weapon', 'cell-item-magic');

        const style = RG.getCssClass(RG.TYPE_ITEM, 'weapon');
        expect(style).to.equal('cell-item-magic');

    });

    it('has functions for combat range/damage', () => {
        const archer = new SentientActor('archer');

        let rr = RG.getMeleeAttackRange(archer);
        expect(rr).to.equal(1);

        const potion = new Item.Potion('potion');
        Inventory.equipAnyItem(archer, potion);
        rr = RG.getMeleeAttackRange(archer);
        expect(rr).to.equal(1);

        const meleeInfo = RG.getMeleeAttackInfo(archer);
        expect(meleeInfo).to.match(/D: \d+/);
    });

    it('has functions for getting textual direction', () => {
        let dir = RG.getTextualDir([10, 10], [0, 0]);
        expect(dir).to.equal('southeast');

        dir = RG.getTextualDir([10, 0], [0, 0]);
        expect(dir).to.match(/east$/);
        dir = RG.getTextualDir([0, 10], [0, 0]);
        expect(dir).to.match(/south$/);
    });
});
