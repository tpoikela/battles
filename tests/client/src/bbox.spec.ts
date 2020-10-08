
import { expect } from 'chai';
import {BBox} from '../../../client/src/bbox';
import {TCoord} from '../../../client/src/interfaces';

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

    it('has functions to get the border', () => {
        const bbox = new BBox(5, 5, 7, 8);
        const eastBorder = bbox.getBorderXY('E');
        const westBorder = bbox.getBorderXY('W');
        const northBorder = bbox.getBorderXY('N');
        const southBorder = bbox.getBorderXY('S');
        eastBorder.forEach((xy: TCoord, i: number) => {
            expect(xy[0]).to.equal(7);
            expect(westBorder[i][0]).to.equal(5);
            expect(eastBorder[i][1], 'E/W x matches').to.equal(westBorder[i][1]);
        });
        northBorder.forEach((xy: TCoord, i: number) => {
            expect(xy[1]).to.equal(5);
            expect(southBorder[i][1]).to.equal(8);
            expect(northBorder[i][0], 'S/N x matches').to.equal(southBorder[i][0]);
        });

    });

    it('has functions to match the sides', function() {
        const bbox1 = new BBox(0, 1, 3, 4);
        const bbox2 = new BBox(3, 1, 6, 4);

        const sides = bbox1.getSides();

        expect(sides[0], 'Top side').to.deep.equal([[0, 1], [3, 1]]);
        expect(sides[1], 'Left side').to.deep.equal([[0, 1], [0, 4]]);
        expect(sides[2], 'Right side').to.deep.equal([[3, 1], [3, 4]]);
        expect(sides[3], 'Bottom side').to.deep.equal([[0, 4], [3, 4]]);

        const [n, match] = bbox1.getMatchingSide(bbox2);
        console.log('MMM', match);
        expect(match, 'Matching side').to.deep.equal([[3, 1], [3, 4]]);

        const bbox3 = bbox1.combine(bbox2);
        const bbox4 = bbox2.combine(bbox1);

        expect([bbox3.ulx, bbox3.uly]).to.deep.equal([0, 1]);
        expect([bbox3.lrx, bbox3.lry]).to.deep.equal([6, 4]);

        // Check that 3 & 4 match
        expect(bbox3.getCoord()).to.deep.equal(bbox4.getCoord());
    });

});
