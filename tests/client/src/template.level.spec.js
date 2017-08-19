
const RG = require('../../../client/src/battles');
const expect = require('chai').expect;
const TemplLevel = require('../../../client/src/template.level');

describe('Template.Level', () => {
    it('creates a 2-d map of the level', () => {
        const level = new TemplLevel(10, 10);

        RG.RAND.setSeed(new Date().getTime());

        level.setGenParams([1, 2, 3, 4]);
        level.create();
        expect(Array.isArray(level.map)).to.be.true;

        console.log(JSON.stringify(level.map));
        RG.printMap(level.map);

    });
});
