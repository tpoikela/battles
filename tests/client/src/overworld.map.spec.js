
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');

describe('RG.OverWorld', () => {
    it('can be created', () => {
        const ow = new RG.OverWorld.Map();
        expect(ow).to.exist;

    });
});
