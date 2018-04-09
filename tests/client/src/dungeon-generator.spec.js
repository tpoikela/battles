
import { expect } from 'chai';

const RG = require('../../../client/src/battles');
RG.Random = require('../../../client/src/random');
RG.DungeonGenerator = require('../../../client/src/dungeon-generator');

describe('DungeonGenerator', () => {
    it('generates dungeon levels', () => {
        RG.RAND.setSeed(new Date().getTime());
        const gen = new RG.DungeonGenerator();
        const conf = {
            nBigRooms: 0,
            errorOnFailure: true
        };
        for (let i = 0; i < 1; i++) {
            const level = gen.create(100, 50, conf);
            level.debugPrintInASCII();
            expect(level).to.exist;
        }

    });
});
