
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
                difficulty: 'Easy', size: 'Large', items: 'Abundant',
                climate: 'cold', monsters: 'Sparse', elevation: 'High',
                excavation: 'Medium', population: 'Low'
            }
        );

        expect(conf2).to.have.property('playerStart');
        expect(conf2).to.have.property('area');

    });
});
