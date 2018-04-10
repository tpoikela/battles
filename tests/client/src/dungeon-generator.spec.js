
import { expect } from 'chai';

const RG = require('../../../client/src/battles');
RG.Random = require('../../../client/src/random');
RG.DungeonGenerator = require('../../../client/src/dungeon-generator');

describe('DungeonGenerator', function() {
    this.timeout(10000);
    it('generates dungeon levels', () => {
        RG.RAND.setSeed(new Date().getTime());
        const gen = new RG.DungeonGenerator();
        const conf = {
            nBigRooms: 0,
            rerunOnFailure: true
            // errorOnFailure: true
        };
        for (let i = 0; i < 20; i++) {
            const cols = RG.RAND.getUniformInt(80, 120);
            const rows = RG.RAND.getUniformInt(28, 56);
            const level = gen.create(cols, rows, conf);
            console.log('Level ' + i + ' created:');
            level.debugPrintInASCII();
            expect(level).to.exist;
        }

    });
});
