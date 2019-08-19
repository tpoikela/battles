
import { expect } from 'chai';
import {CastleGenerator} from '../../../client/src/generator';
import {Level} from '../../../client/src/level';
import {Path} from '../../../client/src/path';

describe('CastleGenerator', () => {

    let castleGen = null;

    beforeEach(() => {
        castleGen = new CastleGenerator();
    });

    it('can create castle levels with default config', () => {
        const conf = CastleGenerator.getOptions();
        conf.shouldRemoveMarkers = false;
        conf.maxDanger = 5;
        const level = castleGen.create(80, 50, conf);
        expect(level).to.be.an.instanceof(Level);

        const elements = level.getElements();
        expect(elements.length).to.be.above(0);

        const markers = elements.filter(e => e.getType() === 'marker');
        expect(markers.length).to.be.above(10);

        const extras = level.getExtras();
        const rooms = extras.room;
        const items = level.getItems();
        expect(castleGen.nItemsAdded).to.be.at.least(rooms.length);
        expect(items.length).to.be.at.least(rooms.length);
    });

    it('can create castle with central corridors', () => {
        for (let i = 0; i < 10; i++) {
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

    it('can create accessible castles with surroundings', () => {
        const cellsAround = {
            N: 'wallmount',
            S: 'grass',
            E: 'wallmount',
            W: 'wallmount',
            SE: 'grass',
            NE: 'grass',
            NW: 'water',
            SW: 'water'
        };
        const conf = CastleGenerator.getOptions();
        conf.cellsAround = cellsAround;
        for (let i = 0; i < 10; i++) {
            const level = castleGen.create(90, 60, conf);
            let path = Path.getPathFromEdgeToCell(level, 'door');
            if (path.length === 0) {
                CastleGenerator.carvePathFromEdge(level, 'door');
            }
            path = Path.getPathFromEdgeToCell(level, 'door');
            if (path.length === 0) {
                console.error('[SERIOUS ERROR]: Level was');
                level.debugPrintInASCII(); // Only if fails
            }
            expect(path.length).to.be.at.least(5);
        }
    });

});

