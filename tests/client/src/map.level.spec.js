
/* Contains unit tests for Map.Level. */

const expect = require('chai').expect;
const RG = require('../../../client/src/battles');
const RGTest = require('../../roguetest.js');

const Actor = RG.Actor.Rogue;
const Level = RG.Map.Level;
const Element = RG.Element.Base;
const Cell = RG.Map.Cell;
const Item = RG.Item.Base;
const Container = RG.Item.Container;
const InvAndEquip = RG.Inv.Inventory;
const Factory = RG.FACT;
const Stairs = RG.Element.Stairs;

RG.cellRenderArray = RG.cellRenderVisible;


describe('Map.Level', () => {
    it('has unique ID and level number', () => {
        const level1 = new Level();
        const level2 = new Level();
        expect(level1.getID()).not.to.equal(level2.getID());

        level1.setLevelNumber(10);
        expect(level1.getLevelNumber()).to.equal(10);
    });

    it('It has a list of map cells', () => {
        const level1 = RGTest.createLevel('arena', 20, 20);
        expect(level1.getMap()).to.not.be.empty;

        const freeCell = level1.getFreeRandCell();
        expect(freeCell).to.not.be.empty;

        const emptyCell = level1.getEmptyRandCell();
        expect(emptyCell).to.not.be.empty;
    });

    it('has actors', () => {
        const level1 = RGTest.createLevel('arena', 20, 20);
        const actor = new Actor('actor');
        level1.addActor(actor);
    });

    it('has items', () => {
        const level1 = RGTest.createLevel('arena', 20, 20);
    });

    it('has stairs', () => {
        const level1 = RGTest.createLevel('arena', 20, 20);
    });

});
