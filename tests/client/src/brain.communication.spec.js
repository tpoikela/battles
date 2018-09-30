
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');
const Memory = require('../../../client/src/brain.memory');

const Brain = RG.Brain.Rogue;

RG.Game = require('../../../client/src/game');

/* Updates given systems in given order.*/
const updateSystems = systems => {
    for (let i = 0; i < systems.length; i++) {
        systems[i].update();
    }
};

describe('How AI brain memory performs basic functions', () => {
    const hunter = RG.FACT.createActor('hunter');
    const brain = new Brain(hunter);
    hunter.setBrain(brain);

    const animal = RG.FACT.createActor('animal');
    const beast = RG.FACT.createActor('beast');

    it('Keeps track of enemies', () => {
        const memory = new Memory(brain);

        expect(memory.isEnemy(animal)).to.equal(false);
        memory.addEnemy(animal);
        expect(memory.isEnemy(animal)).to.equal(true);

        expect(memory.isEnemy(beast)).to.equal(false);
        beast.setType('beast');
        memory.addEnemyType('beast');
        expect(memory.isEnemy(beast)).to.equal(true);
    });

    it('Keeps track of communications', () => {
        const memory = new Memory(brain);

        expect(memory.hasCommunicatedWith(animal)).to.equal(false);
        memory.addCommunicationWith(animal);
        expect(memory.hasCommunicatedWith(animal)).to.equal(true);
    });
});


describe('How actors communicate with each other', () => {

    it('Passes info between actors via comm components', () => {
        const level = RG.FACT.createLevel('arena', 10, 10);
        const comSys = new RG.System.Communication(['Communication']);
        const systems = [comSys];

        const hunter1 = RG.FACT.createActor('hunter1');
        level.addActor(hunter1, 1, 1);
        const hunter2 = RG.FACT.createActor('hunter2');
        level.addActor(hunter2, 2, 2);

        const brain1 = new Brain(hunter1);
        hunter1.setBrain(brain1);

        const brain2 = new Brain(hunter2);
        hunter2.setBrain(brain2);

        const animal = RG.FACT.createActor('animal');

        hunter1.addEnemy(animal);
        const mem1 = brain1.getMemory();

        const comComp = new RG.Component.Communication();
        comComp.addMsg({src: hunter1, type: 'Enemies',
            enemies: mem1.getEnemies()});
        expect(comSys.entities.hasOwnProperty(hunter2.getID())).to.equal(false);
        hunter2.add('Communication', comComp);
        expect(comSys.entities.hasOwnProperty(hunter2.getID())).to.equal(true);

        const mem2 = brain2.getMemory();
        expect(mem2.isEnemy(animal)).to.equal(false);

        updateSystems(systems);

        expect(mem2.isEnemy(animal)).to.equal(true);
    });
});

