
const expect = require('chai').expect;

const MapMountain = require('../../lib/map.mountain');

describe('Map.Mountain', () => {
    it('can be created', () => {
        const gen = new MapMountain(80, 28, {});

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
});
