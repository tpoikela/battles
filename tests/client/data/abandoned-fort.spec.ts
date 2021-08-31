
import {AbandonedFort} from '../../../client/data/abandoned-fort';

const expect = require('chai').expect;
const RG = require('../../../client/src/battles');

describe('Abandoned Fort', function() {
    this.timeout(5000);
    it('contains items and actors', () => {
        const fort = new AbandonedFort(400, 150);
        const level = fort.getLevel();

        expect(level.getActors().length).to.be.above(50);
        expect(level.getItems().length).to.be.above(10);

        const stairs = level.getStairs();
        expect(stairs).to.have.length(2);

        const elems = level.getElements();
        const doors = elems.filter(e => e.getType() === 'door');
        const floorRe = /floor/;
        doors.forEach(door => {
            const [x, y] = door.getXY();
            const cell = level.getMap().getCell(x, y);
            const baseElem = cell.getBaseElem();
            const msg = `Door@${x},${y} must be on floor`;
            expect(baseElem.getName(), msg).to.match(floorRe);
        });

    });
});
