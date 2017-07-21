
const RG = require('../client/src/battles');
const Creator = require('../client/src/world.creator');

const conf = {
    areaSize: 'Medium',
    name: 'The North',
    worldSize: 'Small'
};

const creator = new Creator();
const worldConf = creator.createWorldConf(conf);
const worldFact = new RG.Factory.World();
const world = worldFact.createWorld(worldConf);

console.log('nLevels: ' + world.getLevels().length);
console.log('Entities: ' + RG.Entity.prototype.idCount);
console.log('Elements created: ' + RG.elementsCreated);

console.log('World name: ' + world.getName());
