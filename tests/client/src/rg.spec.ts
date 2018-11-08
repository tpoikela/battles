
import { expect } from 'chai';
import RG from '../../../client/src/rg';

describe('RG', () => {
    it('it manages cell styles and chars', () => {
        RG.addCellStyle(RG.TYPE_ITEM, 'weapon', 'cell-item-magic');

        const style = RG.getCssClass(RG.TYPE_ITEM, 'weapon');
        expect(style).to.equal('cell-item-magic');

    });
});
