
/* Unit tests for Lore text generation */

import chai from 'chai';

import {Lore, format, prep} from '../../../client/data/lore';

const expect = chai.expect;

describe('Lore data', () => {
    it('has function to prepare strings for format', () => {
        const simple = prep`start ${'name'} end`;
        const text = format(simple, {name: '|aaa|'});
        expect(text).to.equal('start |aaa| end');

        const text2 = format(simple, {name: '|aaa|', namePre: 'ccc'});
        expect(text2).to.equal('start ccc|aaa| end');

        const text3 = format(simple, {name: '|aaa|', namePre: 'ccc', namePost: 'eee'});
        expect(text3).to.equal('start ccc|aaa|eee end');
    });
});

