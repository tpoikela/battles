
import { expect } from 'chai';
import {CaveGenerator} from '../../../client/src/generator';
import {Level} from '../../../client/src/level';
import {Placer} from '../../../client/src/placer';
import {Geometry} from '../../../client/src/geometry';
import {Path} from '../../../client/src/path';
import {Cell} from '../../../client/src/map.cell';

describe('CaveGenerator', function() {
    this.timeout(20000);
    it('can create Cave-like levels', () => {
        const caveGen = new CaveGenerator();
        const level = caveGen.create(80, 50, {dungeonType: 'Cave'});
        expect(level).to.be.an.instanceof(Level);
    });

    it('can generate simple cave levels', () => {
        for (let i = 0; i < 1; i++) {
            const caveGen = new CaveGenerator();
            const conf = {dungeonType: 'Cave', isCollapsed: false,
                maxDanger: 5};
            const level = caveGen.create(120, 75, conf);
            expect(level.getMap().cols).to.equal(120);
            expect(level.getMap().rows).to.equal(75);

            const extras = level.getExtras();
            const {startPoint, endPoint} = extras;
            expect(startPoint).to.be.an('array');
            expect(endPoint).to.be.an('array');
            expect(startPoint).not.to.deep.equal(endPoint);
            const bbox = Placer.findCellArea(level.getMap(), 14, 14, (cell) => !cell.isFree());
            if (bbox.length > 0 && bbox[0].getArea() > 1) {
                // console.log(bbox);
                expect(bbox[0].getArea()).to.equal(14 * 14);
            }

            const levelMap = level.getMap();
            /* Expect Geometry.floodfill to return all free cells in levelMap */
            const randFreeCell = level.getFreeRandCell();
            const floodfillCells = Geometry.floodfill(levelMap, randFreeCell,
                (cell) => ( !cell.hasBaseElemWithComp('Impassable') ||
                    cell.hasDoor()), true);

            const freeCells = levelMap.getCells().filter(cell => (
                cell.hasBaseElemWithComp('Impassable') === false));
            if (floodfillCells.length !== freeCells.length) {
                compareCells(freeCells, floodfillCells);
            }
            expect(floodfillCells.length).to.equal(freeCells.length);
        }
    });

    it('can create Lair-like levels', () => {
        for (let i = 0; i < 1; i++) {
            const caveGen = new CaveGenerator();
            const level = caveGen.create(100, 50,
                {dungeonType: 'Lair', isCollapsed: true});
            expect(level).to.be.an.instanceof(Level);

            const extras = level.getExtras();
            expect(extras).to.have.property('startPoint');
            expect(extras).to.have.property('endPoint');

            /* Expect path to exist between startPoint and endPoint */
            const levelMap = level.getMap();
            const [x0, y0] = extras.startPoint;
            const [x1, y1] = extras.endPoint;
            const path = Path.getShortestPassablePathWithDoors(levelMap, x0, y0, x1, y1);
            expect(path).to.have.length.greaterThan(0);
        }
    });

    it('can create Cavern-like levels', () => {
        for (let i = 0; i < 1; i++) {
            const caveGen = new CaveGenerator();
            const level = caveGen.create(150, 80,
                {dungeonType: 'Cavern', isCollapsed: false, maxDanger: 2});
            expect(level).to.be.an.instanceof(Level);

            const extras = level.getExtras();
            expect(extras).to.have.property('startPoint');
            expect(extras).to.have.property('endPoint');

            /* Expect path to exist between startPoint and endPoint */
            const levelMap = level.getMap();
            const [x0, y0] = extras.startPoint;
            const [x1, y1] = extras.endPoint;
            const path = Path.getShortestPassablePathWithDoors(levelMap, x0, y0, x1, y1);
            expect(path).to.have.length.greaterThan(0);

        }
    });


    it('it can generate collapsed cave level', () => {
        const caveGen = new CaveGenerator();
        const conf = {
            dungeonType: 'Lair', isCollapsed: true, maxDanger: 3
        };
        const level = caveGen.create(100, 50, conf);
        expect(level).to.be.an.instanceof(Level);
        level.debugPrintInASCII();


        /* Expect that all non-Impassable cells are accessible from any free
         * cells. Check using Geometry.floodfill. */
        const levelMap = level.getMap();
        const freeCells = levelMap.getCells().filter(cell => (
            cell.hasBaseElemWithComp('Impassable') === false ||
                cell.hasDoor()));
        const randFreeCell = level.getFreeRandCell();
        const floodfillCells = Geometry.floodfill(levelMap, randFreeCell,
            (cell) => ( !cell.hasBaseElemWithComp('Impassable') ||
                cell.hasDoor()), true);
        if (floodfillCells.length !== freeCells.length) {
            compareCells(freeCells, floodfillCells);
        }

        const diff = Math.abs(floodfillCells.length - freeCells.length);
        expect(diff).to.be.lessThan(5);
    });

    it('can have embedded nests inside it', () => {
        const caveGen = new CaveGenerator();
        const conf = {
            dungeonType: 'Lair', isCollapsed: false, maxDanger: 3
        };
        const level = caveGen.create(100, 50, conf);

        /* Expect there is a path between two random free cells. */
        const levelMap = level.getMap();
        const freeCells = levelMap.getCells().filter(cell => (
            cell.hasBaseElemWithComp('Impassable') === false));
        const randFreeCell = level.getFreeRandCell();
        const randFreeCell2 = level.getFreeRandCell();
        const path = Path.getShortestPassablePathWithDoors(levelMap,
            randFreeCell.getX(), randFreeCell.getY(),
            randFreeCell2.getX(), randFreeCell2.getY());
        const msg2 = `Path between ${randFreeCell.getXY()} and ${randFreeCell2.getXY()}`;
        expect(path, msg2).to.have.length.greaterThan(0);

        while (CaveGenerator.embedNest(level, {}));
        level.debugPrintInASCII();

        /* Get list of items in Level. Expect there to be a path from one item
         * to another. */
        const items = level.getItems();
        expect(items).to.have.length.greaterThan(1);

        const item0 = items[0];
        const item1 = items[1];
        const [x0, y0] = item0.getXY();
        const [x1, y1] = item1.getXY();
        const itemPath = Path.getShortestPassablePathWithDoors(levelMap, x0, y0, x1, y1);
        const msg = `Path from ${x0},${y0} to ${x1},${y1} should exist`;
        //TODO expect(itemPath).to.have.length.greaterThan(0, msg);

    });
});

/* Compare two lists of Cells, and print out the missing x,y coordinates. */
function compareCells(list1: Cell[], list2: Cell[]) {
    const missing = list1.filter(cell => (
        list2.findIndex(cell2 => (cell2.getX() === cell.getX() &&
            cell2.getY() === cell.getY())) === -1));
    if (missing.length > 0) {
        console.log('Missing:');
        missing.forEach(cell => console.log(cell.getXY()));
    }
}
