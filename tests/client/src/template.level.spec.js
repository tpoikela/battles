
/* eslint quote-props: 0 */
const RG = require('../../../client/src/battles');
const expect = require('chai').expect;
const TemplLevel = require('../../../client/src/template.level');

const Crypt = require('../../../client/data/tiles.crypt');
const Castle = require('../../../client/data/tiles.castle');
const Basic = require('../../../client/data/tiles.basic').Basic;
const Basic5x5 = require('../../../client/data/tiles.basic').Basic5x5;
const {Houses5x5} = require('../../../client/data/tiles.houses');

const RNG = RG.Random.getRNG();

const tileDirTest = `
dir:UDLR
name:TEST_udlr
X=.
Y=.

#X...X#
Y......
.......
.......
.......
Y......
#.....#`;

const tileDirTestNSEW = `
dir: NSEW
name:TEST_nsew
X=#
Y=#

#X#.#X#
Y.....#
#.....#
.......
#.....#
Y.....#
###.###`;

const tileDirTestAdapter1 = `
dir: NSLR
name:TEST_nslr
X=#
Y=.

#X#.#X#
Y......
.......
.......
.......
Y......
###.###`;

const tileDirTestAdapter2 = `
dir: UDEW
name:TEST_udew
X=.
Y=#

#X...X#
Y.....#
#.....#
.......
#.....#
Y.....#
#.....#`;


describe('Template.Level', () => {
    it('creates a 2-d map of the level', () => {
        const level = new TemplLevel(10, 7);

        RNG.setSeed(new Date().getTime());

        level.setGenParams([1, 2, 1, 1]);
        level.setRoomCount(30);
        level.use(Crypt);
        level.create();
        expect(Array.isArray(level.map)).to.be.true;
        // RG.printMap(level.map);
    });

    it('can create 2-d castles', () => {
        const level = new TemplLevel(12, 6);

        RNG.setSeed(new Date().getTime());

        level.setFiller(Castle.tiles.fillerWall);
        level.setTemplates(Castle.Models.full);
        level.use(Castle);

        level.setGenParams([1, 1, 1, 1]);
        level.create();

        expect(level.map).to.have.length(7 * 12);
        expect(level.map[0]).to.have.length(7 * 6);

    });

    it('can create 2-d castles with outer wall only', () => {
        const level = new TemplLevel(12, 6);
        RNG.setSeed(new Date().getTime());

        level.use(Castle);
        level.setFiller(Castle.tiles.fillerFloor);
        level.setTemplates(Castle.Models.outerWall);

        level.setGenParams([1, 1, 1, 1]);
        level.create();

        expect(level.map).to.have.length(7 * 12);
        expect(level.map[0]).to.have.length(7 * 6);

    });

    it('can have custom starting room function specified', () => {
        const level = new TemplLevel(12, 6);
        RNG.setSeed(new Date().getTime());

        const Castle2Gates = Object.assign({}, Castle);
        Castle2Gates.startRoomFunc = Castle.startFuncTwoGates;

        level.use(Castle2Gates);
        level.setFiller(Castle.tiles.fillerWall);
        level.setTemplates(Castle.Models.full);

        level.setGenParams([2, 2, 2, 2]);
        level.create();

        expect(level.map).to.have.length(9 * 12);
        expect(level.map[0]).to.have.length(9 * 6);

    });

    it('can also remove templates after creation', () => {
        const level = new TemplLevel(7, 7);
        level.use(Castle);
        level.setFiller(Castle.tiles.fillerFloor);
        level.setTemplates(Castle.Models.outerWall);

        let templ = level.findTemplate({name: 'corner_nw'});
        expect(templ.getProp('name')).to.equal('corner_nw');

        level.removeTemplate({name: 'corner_nw'});
        templ = level.findTemplate({name: 'corner_nw'});
        expect(templ).to.be.null;

    });

    it('can have arbitrary directions specified', () => {
        const level = new TemplLevel(11, 7);
        const templates = [tileDirTest, tileDirTest, tileDirTest];
        level.setFiller(Crypt.tiles.filler);
        const exitMap = {
            U: 'D', D: 'U', L: 'R', R: 'L'
        };
        const nsew2DirRemap = {
            N: 'U', S: 'D', E: 'R', W: 'L'
        };
        level.setTemplates(templates);
        level.setExitMap(exitMap, nsew2DirRemap);
        level.create();

        expect(level.map).to.have.length(7 * 11);
        expect(level.map[0]).to.have.length(7 * 7);

    });

    it('can have mixed NSEW and arbitraty directions specified', () => {
        const level = new TemplLevel(8, 9);
        const templates = [tileDirTest, tileDirTestNSEW, tileDirTestAdapter1,
            tileDirTestAdapter2];
        level.setFiller(Crypt.tiles.filler);
        const exitMap = {
            N: 'S', S: 'N', E: 'W', W: 'E',
            U: 'D', D: 'U', L: 'R', R: 'L'
        };
        const nsew2DirRemap = {
            N: 'U', S: 'D', E: 'R', W: 'L'
        };
        level.setTemplates(templates);
        level.setExitMap(exitMap, nsew2DirRemap);
        level.create();

        expect(level.map).to.have.length(7 * 8);
        expect(level.map[0]).to.have.length(7 * 9);

    });

    it('can create levels from rotated/transformed tiles', () => {
        const level = new TemplLevel(12, 7);
        level.setFiller(Crypt.tiles.filler);
        const templates = Basic.templates;
        level.setTemplates(templates);
        level.create();
    });

    it('can create Crypts with rotated tiles', () => {
        const level = new TemplLevel(12, 7);
        level.setFiller(Crypt.tiles.filler);
        const templates = Crypt.templates.all;
        level.setTemplates(templates);
        level.create();
    });

    it('can create Castles with rotated tiles', () => {
        const level = new TemplLevel(12, 7);
        level.setFiller(Castle.tiles.fillerWall);
        const templates = Castle.templates.all;
        level.setTemplates(templates);
        level.use(Castle);

        level.create();
    });

    it('can create levels with 5x5 tiles', () => {
        RNG.setSeed(new Date().getTime());
        const level = new TemplLevel(25, 9);
        level.tryToMatchAllExits = false;

        level.use(Basic5x5);
        level.weights = {
            'room_term1': 10,
            corridor: 10
        };
        level.setGenParams([1, 1, 1, 1]);
        level.roomCount = -1;
        level.setFiller(Basic5x5.tiles.filler);
        const templates = Basic5x5.templates;
        // console.log(JSON.stringify(Basic5x5.templates, null, 2));
        level.setTemplates(templates);
        level.setExitMap(Basic5x5.remap.exits, Basic5x5.remap.nsew2Dir);
        level.create();

        expect(level.map).to.exist;
    });

    it('can creates houses from tiles of 5x5 and 6 genParams', () => {
        RNG.setSeed(new Date().getTime());
        const maxX = 10;
        const maxY = 10;
        const filtered = Houses5x5.templates.start2xN.filter(templ => (
            /2xN_A/.test(templ.getProp('name'))
        ));
        console.log(filtered);

        for (let x = 1; x <= maxX; x++) {
            for (let y = 1; y <= maxY; y++) {
                console.log(`TILE ${x} X ${y}:`);
                // const level = new TemplLevel(x, y);
                const level = new TemplLevel(2, 2);
                level.setFiller(Houses5x5.tiles.filler);
                level.setTemplates(Houses5x5.templates.all);

                const x0 = RNG.getUniformInt(1, 2);
                const x2 = RNG.getUniformInt(1, 2);
                const y0 = RNG.getUniformInt(1, 2);
                const y2 = RNG.getUniformInt(1, 2);

                level.setGenParams({x: [x0, 1, x2], y: [y0, 1, y2]});
                level.roomCount = -1;
                level.setStartRoomFunc(Houses5x5.startRoomFunc);
                level.create();

                expect(level.map).to.not.be.empty;
                RG.printMap(level.map);

                console.log(' '.repeat(5));
                const placedData = level.getPlacedData();
                Object.keys(placedData).forEach(key => {
                    const name = placedData[key].name;
                    if (name !== 'FILLER' && name !== 'BLOCKER') {
                        console.log(`\t${key}: ${name}`);
                    }
                });

                verifyCorners(level.map);
                console.log('='.repeat(50));
            }
        }
    });

});

function verifyCorners(map) {
    RG.forEach2D(map, (i, j, val) => {
        if (i === 0) {
            expect(val, `${i},${j} OK`).to.not.equal(':');
        }
        else if (i === map.length - 1) {
            expect(val, `${i},${j} OK`).to.not.equal(':');
        }
        if (j === 0) {
            expect(val, `${i},${j} OK`).to.not.equal(':');
        }
        else if (j === map[0].length) {
            expect(val, `${i},${j} OK`).to.not.equal(':');
        }
    });
}
