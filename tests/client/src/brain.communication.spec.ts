
import RG from '../../../client/src/rg';
import { expect } from 'chai';
import {Memory} from '../../../client/src/brain.memory';
import * as Brain from '../../../client/src/brain';
import * as Component from '../../../client/src/component';
import {FactoryActor} from '../../../client/src/factory.actors';
import {FactoryLevel} from '../../../client/src/factory.level';
import {SystemCommunication} from '../../../client/src/system/system.communication';

const BrainSentient = Brain.BrainSentient;

/* Updates given systems in given order.*/
const updateSystems = systems => {
    for (let i = 0; i < systems.length; i++) {
        systems[i].update();
    }
};

describe('How AI brain memory performs basic functions', () => {
    const factActor = new FactoryActor();
    const hunter = factActor.createActor('hunter');
    const brain = new BrainSentient(hunter);
    hunter.setBrain(brain);

    const animal = factActor.createActor('animal');
    const beast = factActor.createActor('beast');

    it('Keeps track of enemies', () => {
        const memory = new Memory();

        expect(memory.isEnemy(animal)).to.equal(false);
        memory.addEnemy(animal);
        expect(memory.isEnemy(animal)).to.equal(true);

        expect(memory.isEnemy(beast)).to.equal(false);
        beast.setType('beast');
        memory.addEnemyType('beast');
        expect(memory.isEnemy(beast)).to.equal(true);
    });

    it('Keeps track of communications', () => {
        const memory = new Memory();

        expect(memory.hasCommunicatedWith(animal)).to.equal(false);
        memory.addCommunicationWith(animal);
        expect(memory.hasCommunicatedWith(animal)).to.equal(true);
    });
});


describe('How actors communicate with each other', () => {

    it('Passes info between actors via comm components', () => {
        const factLevel = new FactoryLevel();
        const factActor = new FactoryActor();
        const level = factLevel.createLevel('arena', 10, 10);
        const comSys = new SystemCommunication(['Communication']);
        const systems = [comSys];

        const hunter1 = factActor.createActor('hunter1');
        level.addActor(hunter1, 1, 1);
        const hunter2 = factActor.createActor('hunter2');
        level.addActor(hunter2, 2, 2);

        const brain1 = new BrainSentient(hunter1);
        hunter1.setBrain(brain1);

        const brain2 = new BrainSentient(hunter2);
        hunter2.setBrain(brain2);

        const animal = factActor.createActor('animal');

        hunter1.addEnemy(animal);
        const mem1 = brain1.getMemory();

        const comComp = new Component.Communication();
        comComp.addMsg({src: hunter1, type: 'Enemies',
            enemies: mem1.getEnemies()});
        expect(comSys.entities.hasOwnProperty(hunter2.getID())).to.equal(false);
        hunter2.add(comComp);
        expect(comSys.entities.hasOwnProperty(hunter2.getID())).to.equal(true);

        const mem2 = brain2.getMemory();
        expect(mem2.isEnemy(animal)).to.equal(false);

        updateSystems(systems);

        expect(mem2.isEnemy(animal)).to.equal(true);
    });
});

