
import { expect } from 'chai';
import RG from '../../../client/src/rg';
import {Disposition} from '../../../client/src/disposition';

describe('Disposition', () => {
    it('it generates dispos table for rivals', () => {
        const rivals = ['goblin', 'avian', 'human'];
        const dispos = new Disposition(rivals);
        dispos.randomize();
        const table = dispos.getTable();

        console.log(JSON.stringify(table));

        const keys = Object.keys(table);
        expect(keys.length).to.equal(3);

        expect(table.goblin.avian).to.equal(table.avian.goblin);
    });
});
