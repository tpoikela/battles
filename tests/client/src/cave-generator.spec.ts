
import { expect } from 'chai';
import {CaveGenerator} from '../../../client/src/generator';
import {Level} from '../../../client/src/level';
import {Placer} from '../../../client/src/placer';

describe('CaveGenerator', function() {
    this.timeout(20000);
    it('can create Cave-like levels', () => {
        const caveGen = new CaveGenerator();
        const level = caveGen.create(80, 50, {dungeonType: 'Cave'});
        expect(level).to.be.an.instanceof(Level);
    });

    it('can generate simple cave levels', () => {
        for (let i = 0; i < 1; i++) {
            // console.log('\n===== Generating CAVE now =====');
            const caveGen = new CaveGenerator();
            const conf = {dungeonType: 'Cave', isCollapsed: false,
                maxDanger: 5};
            const level = caveGen.create(120, 75, conf);
            expect(level).to.be.an.instanceof(Level);

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
            // level.debugPrintInASCII();
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
        }
    });


    it('it can generate collapsed cave level', () => {
        const caveGen = new CaveGenerator();
        const conf = {
            dungeonType: 'Lair', isCollapsed: true, maxDanger: 3
        };
        const level = caveGen.create(100, 50, conf);
        expect(level).to.be.an.instanceof(Level);
        // level.debugPrintInASCII();
    });

    it('can have embedded nests inside it', () => {
        const caveGen = new CaveGenerator();
        const conf = {
            dungeonType: 'Lair', isCollapsed: false, maxDanger: 3
        };
        const level = caveGen.create(100, 50, conf);
        // level.debugPrintInASCII();

        const elems = level.getElements();
        elems.forEach(elem => {
            console.log(elem);
        });
    });
});
