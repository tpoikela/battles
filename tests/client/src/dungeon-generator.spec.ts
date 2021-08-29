
import { expect } from 'chai';

import {Random} from '../../../client/src/random';
import {DungeonGenerator} from '../../../client/src/generator';
// import {CellMap} from '../../../client/src/map';
import {Dice} from '../../../client/src/dice';

const RNG = Random.getRNG();

describe('DungeonGenerator', function() {
    this.timeout(10000);

    it('generates fully connected dungeon levels', () => {
        // RNG.setSeed(new Date().getTime());
        // RNG.setSeed(6);
        // RNG.setSeed(1624902773128);
        // Dice.RNG.setSeed(6);
        const dungGen = new DungeonGenerator();
        // dungGen._debug = true;
        const conf = {
            nBigRooms: 0,
            // rerunOnFailure: true
            errorOnFailure: true,
            maxRarity: 1
        };
        for (let i = 0; i < 10; i++) {
            const cols = RNG.getUniformInt(80, 120);
            const rows = RNG.getUniformInt(28, 56);
            // const rows = RNG.getUniformInt(28, 120);
            const level = dungGen.create(cols, rows, conf);
            // level.debugPrintInASCII();
            expect(level.getActors()).to.have.length.above(5);
            expect(level.getItems()).to.have.length.above(5);
            expect(level.getElements()).to.have.length.above(0);
        }
    });


    it('generates dungeon levels with actors/items', () => {
        RNG.setSeed(new Date().getTime());
        const dungGen = new DungeonGenerator();
        const cols = RNG.getUniformInt(80, 120);
        const rows = RNG.getUniformInt(28, 56);
        const conf = {maxRarity: 1};
        const level = dungGen.create(cols, rows, conf);

        const actors = level.getActors();
        const items = level.getItems();

        expect(actors.length).to.be.above(5);
        expect(items.length).to.be.above(5);
        // level.debugPrintInASCII();
        //
        // const newMap = CellMap.multiplyMap(level.getMap(), 2, 2);
        // newMap.debugPrintInASCII();
    });

    it('generates dungeon levels with nests', () => {
        const dungGen = new DungeonGenerator();
        const cols = RNG.getUniformInt(80, 120);
        const rows = RNG.getUniformInt(28, 56);
        const conf = {
            nBigRooms: 0,
            maxRarity: 1,
        };
        const level = dungGen.create(cols, rows, conf);
        // level.debugPrintInASCII();
    });

});
