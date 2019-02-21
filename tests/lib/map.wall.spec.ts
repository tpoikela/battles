
const expect = require('chai').expect;
const MapWall = require('../../lib/map.wall');

describe('Map.Wall', () => {
    it('can be created', () => {
        const gen = new MapWall(80, 28, {});

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
