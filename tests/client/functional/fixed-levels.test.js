
import AbandonedFort from '../../../client/data/abandoned-fort';

const expect = require('chai').expect;
const RG = require('../../../client/src/battles');

describe('Abandoned Fort', () => {
    it('contains items and actors', () => {
        const fort = new AbandonedFort(500, 200);
        const level = fort.getLevel();

        expect(level.getActors().length).to.be.above(50);
        expect(level.getItems().length).to.be.above(10);

        const stairs = level.getStairs();
        expect(stairs).to.have.length(2);

    });
});
