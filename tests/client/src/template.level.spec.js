
const RG = require('../../../client/src/battles');
const expect = require('chai').expect;
const TemplLevel = require('../../../client/src/template.level');

const Crypt = require('../../../client/data/tiles.crypt');
const Castle = require('../../../client/data/tiles.castle');

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
});
