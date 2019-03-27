
import { expect } from 'chai';
import RG from '../../../client/src/rg';
import {CastleGenerator} from '../../../client/src/castle-generator';
import {Level} from '../../../client/src/level';

describe('CastleGenerator', () => {

    let castleGen = null;

    beforeEach(() => {
        castleGen = new CastleGenerator();
    });

    it('can create castle levels with default config', () => {
        const conf = CastleGenerator.getOptions();
        conf.maxDanger = 5;
        const level = castleGen.create(80, 50, conf);
        expect(level).to.be.an.instanceof(Level);

        const elements = level.getElements();
        expect(elements.length).to.be.above(0);

        const extras = level.getExtras();
        const rooms = extras.room;
        const items = level.getItems();
        expect(castleGen.nItemsAdded).to.be.at.least(rooms.length);
        expect(items.length).to.be.at.least(rooms.length);
    });

    it('can create castle with central corridors', () => {
        for (let i = 0; i < 1; i++) {
            const conf = CastleGenerator.getOptions();
            conf.preserveMarkers = true;
            conf.centralCorridors = true;
            conf.templates = 'residential';
            conf.maxDanger = 10;
            const level = castleGen.create(90, 60, conf);
            // level.debugPrintInASCII();
            expect(level).to.be.an.instanceof(Level);

            const storerooms = level.getExtras().storeroom;
            const levers = level.getElements().filter(e => e.getType() === 'lever');
            const leverDoors = level.getElements().filter(
                e => e.getType() === 'leverdoor');
            expect(levers.length, 'All levers created').to.equal(storerooms.length);
            expect(leverDoors.length, 'All levers created')
                .to.equal(storerooms.length);
        }
    });

});
