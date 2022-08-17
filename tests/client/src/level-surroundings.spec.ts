
import chai from 'chai';

import {LevelSurroundings} from '../../../client/src/level-surroundings';
import {RGUnitTests} from '../../rg.unit-tests';
import {Level} from '../../../client/src/level';

const expect = chai.expect;

describe('LevelSurroundings', () => {

    it('surrounds the given level with wallmount based on surrounding cells', () => {
        let level: Level = RGUnitTests.wrapIntoLevel([], 40, 40);
        const surround = new LevelSurroundings();
        const conf = {
            cellsAround: {
                S: 'wallmount', N: 'wallmount',
                W: 'wallmount', E: 'wallmount',
            }
        };

        level = surround.surround(level, conf);
        const levelMap = level.getMap();
        /* Expect at least 20 Cells with baseElem wallmount*/
        const wallmountCells = levelMap.getCells(c =>
            c.getBaseElem().getType() === 'wallmount');
        expect(wallmountCells.length).to.be.above(20);

    });

    it('surrounds the given level with tree, swamp, water based on surrounding cells', () => {
        let level = RGUnitTests.wrapIntoLevel([], 40, 40);
        const surround = new LevelSurroundings();
        const conf = {
            cellsAround: {
                S: 'tree', N: 'tree',
                W: 'swamp', E: 'swamp',
                NW: 'water', NE: 'water',
                SW: 'water', SE: 'water',
            }
        };
        level = surround.surround(level, conf);
        /* Expect at least 20 cells with trees. */
        const treeCells = level.getMap().getCells(c => c.getBaseElem().getType() === 'tree');
        expect(treeCells.length).to.be.above(20);
        /* Expect at least 20 cells with swamp. */
        const swampCells = level.getMap().getCells(c => c.getBaseElem().getType() === 'swamp');
        expect(swampCells.length).to.be.above(20);
        /* Expect at least 20 cells with water. */
        const waterCells = level.getMap().getCells(c => c.getBaseElem().getType() === 'water');
        expect(waterCells.length).to.be.above(20);

    });

    it('leaves a gap on the corner correctly', () => {
        let level = RGUnitTests.wrapIntoLevel([], 40, 40);
        const surround = new LevelSurroundings();
        const conf = {
            cellsAround: {
                S: 'wallmount', N: 'wallmount',
                W: 'wallmount', E: 'wallmount',
                SE: 'floor', NE: 'floor',
                SW: 'floor', NW: 'floor',
            }
        };

        level = surround.surround(level, conf);
        /* Expect some free cells with x=0 on in levelMap. */
        const freeCells = level.getMap().getCells(c => c.getBaseElem().getType() === 'floor');
        expect(freeCells.length).to.be.above(2);
        const freeCellsX0 = freeCells.filter(c => c.getX() === 0);
        expect(freeCellsX0.length).to.be.above(2);

        /* Expect some free cells with x=39 on in levelMap. */
        const freeCellsX39 = freeCells.filter(c => c.getX() === 39);
        expect(freeCellsX39.length).to.be.above(2);

        /* Expect some free cells with y=0 on in levelMap. */
        const freeCellsY0 = freeCells.filter(c => c.getY() === 0);
        expect(freeCellsY0.length).to.be.above(2);
        /* Expect some free cells with y=39 on in levelMap. */
        const freeCellsY39 = freeCells.filter(c => c.getY() === 39);
        expect(freeCellsY39.length).to.be.above(2);

    });
});
