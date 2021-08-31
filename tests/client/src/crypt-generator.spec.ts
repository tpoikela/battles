
import { expect } from 'chai';

import {Random} from '../../../client/src/random';
import {CryptGenerator} from '../../../client/src/generator';
import {FactoryZone} from '../../../client/src/factory.zone';
// import {CellMap} from '../../../client/src/map';
// import {Dice} from '../../../client/src/dice';

const RNG = Random.getRNG();

describe('CryptGenerator', function() {
    this.timeout(10000);

    let cryptGen = null;

    beforeEach(() => {
        cryptGen = new CryptGenerator();
        cryptGen.factZone = new FactoryZone();
    });

    it('generates fully connected dungeon levels', () => {
        // RNG.setSeed(new Date().getTime());
        // RNG.setSeed(6);
        // RNG.setSeed(1624902773128);
        // Dice.RNG.setSeed(6);
        const conf: any = CryptGenerator.getOptions();
        conf.nLevel = 1;
        conf.sqrPerItem = 40;
        conf.sqrPerActor = 40;
        conf.nestProbability = 1.0;

        for (let i = 0; i < 1; i++) {
            const cols = RNG.getUniformInt(80, 120);
            const rows = RNG.getUniformInt(28, 56);
            // const rows = RNG.getUniformInt(28, 120);
            const level = cryptGen.create(cols, rows, conf);
            expect(level.getActors()).to.have.length.above(5);
            expect(level.getItems()).to.have.length.above(5);
            expect(level.getElements()).to.have.length.above(0);
            // level.debugPrintInASCII();
        }
    });

});
