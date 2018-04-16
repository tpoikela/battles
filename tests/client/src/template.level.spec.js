
const RG = require('../../../client/src/battles');
const expect = require('chai').expect;
const TemplLevel = require('../../../client/src/template.level');

const Crypt = require('../../../client/data/tiles.crypt');
const Castle = require('../../../client/data/tiles.castle');
const Basic = require('../../../client/data/tiles.basic');

const tileDirTest = `
dir:UDLR
name:TEST
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
name:TEST
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
name:TEST
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
name:TEST
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

        RG.RAND.setSeed(new Date().getTime());

        level.setGenParams([1, 2, 1, 1]);
        level.setRoomCount(30);
        level.use(Crypt);
        level.create();
        expect(Array.isArray(level.map)).to.be.true;
        // RG.printMap(level.map);
    });

    it('can create 2-d castles', () => {
        const level = new TemplLevel(12, 6);
        // level.allExitsMustMatch = false;

        RG.RAND.setSeed(new Date().getTime());

        level.setFiller(Castle.tiles.fillerWall);
        level.setTemplates(Castle.Models.full);
        level.use(Castle);

        level.setGenParams([1, 1, 1, 1]);
        level.create();

        expect(level.map).to.have.length(7 * 12);
        expect(level.map[0]).to.have.length(7 * 6);

        RG.printMap(level.map);
    });

    it('can create 2-d castles with outer wall only', () => {
        const level = new TemplLevel(12, 6);
        RG.RAND.setSeed(new Date().getTime());

        level.use(Castle);
        level.setFiller(Castle.tiles.fillerFloor);
        level.setTemplates(Castle.Models.outerWall);

        level.setGenParams([1, 1, 1, 1]);
        level.create();

        expect(level.map).to.have.length(7 * 12);
        expect(level.map[0]).to.have.length(7 * 6);

        // RG.printMap(level.map);
    });

    it('can have custom starting room function specified', () => {
        const level = new TemplLevel(12, 6);
        RG.RAND.setSeed(new Date().getTime());

        const Castle2Gates = Object.assign({}, Castle);
        Castle2Gates.startRoomFunc = Castle.startFuncTwoGates;

        level.use(Castle2Gates);
        level.setFiller(Castle.tiles.fillerWall);
        level.setTemplates(Castle.Models.full);

        level.setGenParams([2, 2, 2, 2]);
        level.create();

        expect(level.map).to.have.length(9 * 12);
        expect(level.map[0]).to.have.length(9 * 6);

        // RG.printMap(level.map);
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

        RG.printMap(level.map);
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

        // RG.printMap(level.map);
    });

    it('can create levels from rotated/transformed tiles', () => {
        const level = new TemplLevel(12, 7);
        level.setFiller(Crypt.tiles.filler);
        const templates = Basic.templates;
        level.setTemplates(templates);
        level.create();
        // RG.printMap(level.map);
    });

    it('can create Crypts with rotated tiles', () => {
        const level = new TemplLevel(12, 7);
        level.setFiller(Crypt.tiles.filler);
        const templates = Crypt.templates.all;
        level.setTemplates(templates);
        level.create();
        // RG.printMap(level.map);
    });

    it('can create Castles with rotated tiles', () => {
        const level = new TemplLevel(12, 7);
        // level.use(Castle);
        level.setFiller(Crypt.tiles.filler);
        const templates = Castle.templates.all;
        level.setTemplates(templates);

        level.create();
        RG.printMap(level.map);
    });

});
