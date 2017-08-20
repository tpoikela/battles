
const RG = require('../../../client/src/battles');
const expect = require('chai').expect;
const TemplLevel = require('../../../client/src/template.level');

const Castle = require('../../../client/data/tiles.castle');

describe('Template.Level', () => {
    it('creates a 2-d map of the level', () => {
        const level = new TemplLevel(10, 7);

        RG.RAND.setSeed(new Date().getTime());

        level.setGenParams([1, 2, 1, 1]);
        level.setRoomCount(30);
        level.create();
        expect(Array.isArray(level.map)).to.be.true;

        // console.log(JSON.stringify(level.map));
        // RG.printMap(level.map);

    });

    it('can create 2-d castles', () => {
        const level = new TemplLevel(12, 6);
        RG.RAND.setSeed(new Date().getTime());

        level.setFiller(Castle.fillerWall);
        level.setTemplates(Castle.templates);
        level.setConstraintFunc(Castle.constraintFunc);
        level.setStartRoomFunc(Castle.getStartRoom);

        level.setGenParams([1, 1, 1, 1]);
        level.setRoomCount(-1); // Fill until no more exits
        level.create();

        expect(level.map).to.have.length(7 * 12);
        expect(level.map[0]).to.have.length(7 * 6);

        // RG.printMap(level.map);
    });

    it('can create 2-d castles with outer wall only', () => {
        const level = new TemplLevel(12, 6);
        RG.RAND.setSeed(new Date().getTime());

        level.setFiller(Castle.fillerFloor);
        level.setTemplates(Castle.templatesWall);
        level.setConstraintFunc(Castle.constraintFunc);
        level.setStartRoomFunc(Castle.getStartRoom);

        level.setGenParams([1, 1, 1, 1]);
        level.setRoomCount(-1); // Fill until no more exits
        level.create();

        expect(level.map).to.have.length(7 * 12);
        expect(level.map[0]).to.have.length(7 * 6);

        RG.printMap(level.map);
    });
});
