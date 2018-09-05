
const RG = require('../../../client/src/battles');
const expect = require('chai').expect;

describe('Factory.Zone', () => {
    it('can create village levels', () => {
        const fact = new RG.Factory.Zone();
        const villageConf = {
            x: 80, y: 28,
            cityType: 'Village',
            groupType: 'village',
            quarterType: '',
            maxDanger: 5
        };

        const village = fact.createCityLevel(0, villageConf);
        expect(village).to.exist;

        const actors = village.getActors();
        expect(actors).to.have.length.above(5);
    });

    it('can create the capital level', () => {
        const fact = new RG.Factory.Zone();
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
        const fact = new RG.Factory.Zone();
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
            food: false,
            gold: false
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

    it('can create villages/town with items inside houses', () => {
        const fact = new RG.Factory.Zone();
        const townConf = {
            x: 80, y: 28,
            cityType: 'Village',
            groupType: 'village',
            quarterType: '',
            maxDanger: 5,
            itemsPerLevel: 40
        };
        const townLevel = fact.createCityLevel(0, townConf);

        const items = townLevel.getItems();
        expect(items.length).to.be.at.least(townConf.itemsPerLevel);

        const elems = townLevel.getElements();
        expect(elems.length).to.be.above(5);
    });

    it('can create dungeon levels with special features', () => {
        const fact = new RG.Factory.Zone();
        const conf = {
            dungeonType: 'digger',
            x: 100, y: 100, nLevel: 5, sqrPerActor: 10000,
            sqrPerItem: 40, maxValue: 500, maxDanger: 5
        };
        const level = fact.createDungeonLevel(conf);
        expect(level).to.exist;

        const actors = level.getActors();
        expect(actors.length).to.be.above(3);
    });

});
