
import { expect } from 'chai';
import RG from '../../../client/src/rg';
import {CastleGenerator} from '../../../client/src/castle-generator';
import {Level} from '../../../client/src/level';
import {Random} from '../../../client/src/random';
import {Path} from '../../../client/src/path';

describe('CastleGenerator', () => {

    let castleGen = null;
    let RNG = null;

    beforeEach(() => {
        castleGen = new CastleGenerator();
        RNG = new Random();
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
            const conns = level.getMap().getCells(c => (
                (c.getX() === 0 || c.getY() === 0) &&
                    !c.getBaseElem().has('Impassable')
            ));
            const doors = level.getElements().filter(c => (
                c.getType() === 'door'));
            const randConn = RNG.arrayGetRand(conns);
            const randDoor = RNG.arrayGetRand(doors);
            const map = level.getMap();
            const passCb = (x, y) => (
                map.hasXY(x, y)
                    && !/wall/.test(map.getCell(x, y).getBaseElem().getType())
            );
            const [x0, y0] = randConn.getXY();
            const [x1, y1] = randDoor.getXY();
            const path = Path.getShortestPath(x0, y0, x1, y1, passCb);
            if (path.length === 0) {
                console.log('Cells were', x0, y0, '->', x1, y1);
                level.debugPrintInASCII();
            }
            // TODO fix failing test
            // expect(path.length).to.be.at.least(5);
        }
    });

});
