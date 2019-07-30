
import { expect } from 'chai';
import {ActorGen} from '../../../client/data/actor-gen';
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
    });
});
