
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

    it('can add actors/items to the level', () => {
        const fact = new RG.Factory.Feature();
        const level = RG.FACT.createLevel('arena', 20, 20, {});

        const conf = {
            item: item => (
                /Permaice/.test(item.name)
            ),
            actor: actor => actor.type === 'undead',
            sqrPerActor: 20,
            sqrPerItem: 20,
            nLevel: 0,
            maxValue: 1000,
            food: () => false,
            gold: () => false
        };

        fact.addItemsAndActors(level, conf);

        const actors = level.getActors();
        const items = level.getItems();

        items.forEach(item => {
            expect(item.getName()).to.match(/Permaice/);
        });

        actors.forEach(actor => {
            expect(actor.getType()).to.equal('undead');
        });
    });
});
