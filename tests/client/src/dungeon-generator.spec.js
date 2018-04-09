
import { expect } from 'chai';

const RG = require('../../../client/src/battles');
RG.Random = require('../../../client/src/random');
RG.DungeonGenerator = require('../../../client/src/dungeon-generator');

describe('DungeonGenerator', () => {
    it('generates dungeon levels', () => {
        const gen = new RG.DungeonGenerator();
        const conf = {bigRooms: 1};
        const level = gen.create(80, 30, conf);

        level.debugPrintInASCII();
        expect(level).to.exist;

    });
});
