
import { expect } from 'chai';

const RG = require('../../../client/src/battles');
RG.Random = require('../../../client/src/random');
RG.DungeonGenerator = require('../../../client/src/dungeon-generator');

const RNG = RG.Random.getRNG();

describe('DungeonGenerator', function() {
    this.timeout(10000);

    it('generates dungeon levels', () => {
        RNG.setSeed(new Date().getTime());
        const gen = new RG.DungeonGenerator();
        const conf = {
            nBigRooms: 0,
            rerunOnFailure: true
            // errorOnFailure: true
        };
        for (let i = 0; i < 2; i++) {
            const cols = RNG.getUniformInt(80, 120);
            const rows = RNG.getUniformInt(28, 56);
            const level = gen.create(cols, rows, conf);
            // level.debugPrintInASCII();
            expect(level).to.exist;
        }
    });


    it('generates dungeon levels with actors/items', () => {
        RNG.setSeed(new Date().getTime());
        const gen = new RG.DungeonGenerator();
        const cols = RNG.getUniformInt(80, 120);
        const rows = RNG.getUniformInt(28, 56);
        const conf = {};
        const level = gen.create(cols, rows, conf);

        const actors = level.getActors();
        const items = level.getItems();

        expect(actors.length).to.be.above(5);
        expect(items.length).to.be.above(5);
        // level.debugPrintInASCII();

    });

});
