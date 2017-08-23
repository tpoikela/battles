
const RG = require('../../../client/src/battles');
const expect = require('chai').expect;

describe('Factory.Feature', () => {
    it('can create village levels', () => {
        const fact = new RG.Factory.Feature();
        const villageConf = {
            x: 80, y: 28,
            cityType: 'Village',
            groupType: 'village',
            quarterType: ''
        };

        const village = fact.createCityLevel(0, villageConf);
        expect(village).to.exist;
        expect(village.getActors()).to.have.length.above(5);
    });

    it('can create the capital level', () => {
        const fact = new RG.Factory.Feature();
        const capitalConf = {
            x: 100, y: 100,
            cityType: 'Capital',
            groupType: 'capital',
            quarterType: ''
        };
        const capital = fact.createCityLevel(0, capitalConf);
        expect(capital).to.exist;
        expect(capital.getActors()).to.have.length.above(5);
    });
});
