
const expect = require('chai').expect;
const MapMiner = require('../../lib/map.miner');

describe('Map.Miner', function() {
    it('can be created', () => {
        const gen = new MapMiner(80, 28);

        const map = [];
        for (let i = 0; i < 80; i++) {
            map.push([]);
        }

        gen.create((x, y, val) => {
            expect(val).to.exist;
            expect(val).to.be.number;
            map[x][y] = val;
        });
    });

    it('has options to prevent cells from being dug', () => {
        const dontDig = {ulx: 1, uly: 20, lrx: 20, lry: 40};
        const opts = {dontDig};
        const gen = new MapMiner(80, 40, opts);

        gen.create((x, y, val) => {
            if (x >= dontDig.ulx && x <= dontDig.lrx &&
                y >= dontDig.uly && y <= dontDig.lry) {
                expect(val).to.equal(1);
            }
        });

    });
});
