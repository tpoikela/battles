
const expect = require('chai').expect;
// const RG = require('../../../client/src/battles');

const Creator = require('../../../client/src/world.creator');

describe('World.Creator', () => {
    it('can create a configuration to build the game world', () => {
        // Of course creator which creates the configuration needs to have its
        // own configuration. Maybe there will be World.Creator.ConfCreator?
        const creator = new Creator();

        const worldConf = creator.createWorldConf({name: 'Westeros'});
        expect(worldConf.name).to.equal('Westeros');

        const conf2 = creator.createWorldConf(
            {name: 'Northern Lands',
                difficulty: 'Easy', areaSize: 'Medium', worldSize: 'Medium',
                items: 'Abundant',
                climate: 'cold', monsters: 'Sparse', elevation: 'High',
                excavation: 'Medium', population: 'Low'
            }
        );

        expect(conf2.nAreas).to.equal(2);
        expect(conf2).to.have.property('playerStart');
        expect(conf2).to.have.property('area');

        const areas = conf2.area;
        expect(areas[0].dungeon).to.have.length.above(0);
    });

    it('adds cities to the created configuration', () => {
        const creator = new Creator();
        const conf = creator.createWorldConf({name: 'My World'});
        const area0 = conf.area[0];
        expect(area0.nCities).to.be.above(0);

        const city0 = area0.city[0];
        expect(city0.quarter).to.have.length.above(0);
    });

    it('adds mountains to the created configuration', () => {
        const creator = new Creator();
        const conf = creator.createWorldConf({name: 'My World'});
        const area0 = conf.area[0];
        expect(area0.nMountains).to.be.above(0);
    });
});
