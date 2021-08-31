
import { expect } from 'chai';
import {ActorGen, shellProps} from '../../../client/data/actor-gen';
import {ObjectShell} from '../../../client/src/objectshellparser';
import {Constraints} from '../../../client/src/constraints';

describe('ActorGen', () => {

    let fact = null;
    let parser = null;

    beforeEach(() => {
        parser = new ObjectShell.Parser();
        fact = new Constraints();
    });

    it('can generate shells for new actor types', () => {
        const actors = ActorGen.genActors(50);
        parser.parseShellData({actors});
        const races = ActorGen.getRaces();

        const cc = [
            {op: 'lt', prop: 'danger', value: 10},
            {op: 'eq', prop: 'type', value: races}
        ];
        const cFunc = fact.getConstraints(cc);
        const filtered = actors.filter(cFunc);
        expect(filtered.length).to.be.above(0);

        const sh0 = filtered[0];
        expect(sh0).to.have.property('race');
    });

    it('has function to generate more specific actor shells', () => {
        const sh0 = ActorGen.genShell({rank: 'queen'});
        expect(sh0.rank).to.equal('queen');
        expect(sh0).to.have.property('roles');

        const sh1 = ActorGen.genShell({roles: ['assassin'], rank: 'queen'});
        expect(sh1.roles).to.deep.equal(['assassin']);

        const sh2 = ActorGen.genShell({roles: ['assassin', 'archer']});
        expect(sh2.roles).to.deep.equal(['assassin', 'archer']);
        expect(sh2.name).to.match(/\w+ assassin archer/);

        const sh3 = ActorGen.genShell({race: 'orc'});
        expect(sh3.race).to.equal('orc');
    });

    it('adds the danger value of shells together', function() {
        const actorConstr = {race: 'elf'};
        const hist = {};
        let dangerSum = 0;
        for (let i = 0; i < 1000; i++) {
            const shell = ActorGen.genShell(actorConstr);
            if (!hist[shell.danger]) {
                hist[shell.danger] = 0;
            }
            hist[shell.danger] += 1;
            dangerSum += shell.danger;
        }
        if (0) {
            console.log('hist danger:', hist);
            console.log('ActorGen tests, average danger:', dangerSum/1000);
        }
    });


});
