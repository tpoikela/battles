
import { expect } from 'chai';
import {BBox} from '../../../client/src/bbox';

describe('BBox', () => {
    it('x- and y-dimensions', () => {
        const bbox = new BBox(0, 0, 3, 5);
        expect(bbox.getSizeX()).to.equal(4);
        expect(bbox.getSizeY()).to.equal(6);
    });

    it('has an area', () => {
        const bbox = new BBox(0, 0, 1, 1);
        expect(bbox.getArea()).to.equal(4);

        expect(bbox.getCoord()).to.have.length(4);
    });

    it('has function to check coords inside', () => {
        const bbox = new BBox(0, 0, 9, 9);
        expect(bbox.hasXY(10, 10)).to.equal(false);
        expect(bbox.hasXY(9, 9)).to.equal(true);
        expect(bbox.hasXY(0, 10)).to.equal(false);
        expect(bbox.hasXY(10, 0)).to.equal(false);
        expect(bbox.hasXY(0, 0)).to.equal(true);
        expect(bbox.hasXY(-1, -1)).to.equal(false);
    });

    it('has functions to check for overlaps', () => {
        const b1 = new BBox(2, 3, 11, 11);
        const b2 = new BBox(6, 6, 11, 11);
        const b3 = new BBox(6, 6, 13, 13);
        expect(b1.overlaps(b2)).to.equal(true);
        expect(b1.overlaps(b3)).to.equal(true);


        const b4 = new BBox(0, 0, 5, 5);
        expect(b4.overlaps(b3)).to.equal(false);
        expect(b3.overlaps(b3)).to.equal(true);
        expect(b3.overlaps(b4)).to.equal(false);
    });
});
