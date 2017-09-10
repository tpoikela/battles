
import {expect} from 'chai';

const RG = require('../../../client/src/battles');

RG.Element = require('../../../client/src/element');

describe('Elements', () => {
    it('must have a defined type', () => {
        Object.values(RG.ELEM).forEach(elem => {
            expect(elem.getType(), JSON.stringify(elem)).not.to.be.empty;

            expect(elem.isPassable).to.exist;
        });
    });
});
