
/* Contains unit tests for Map.Level. */

import RG from '../../../client/src/rg';
import { expect } from 'chai';
import {SentientActor} from  '../../../client/src/actor';
import * as Element from  '../../../client/src/element';
import {Item} from '../../../client/src/item';
import {Level, LevelExtras} from '../../../client/src/level';
import {FactoryLevel} from '../../../client/src/factory.level';

const Actor = SentientActor;
const ItemBase = Item.ItemBase;

const Stairs = Element.ElementStairs;
const Door = Element.ElementDoor;

RG.cellRenderArray = RG.cellRenderVisible;

describe('Map.Level', () => {

    let factLevel = null;

    beforeEach(() => {
        factLevel = new FactoryLevel();
    });

    it('has unique ID and level number', () => {
        const level1 = new Level();
        const level2 = new Level();
        expect(level1.getID()).not.to.equal(level2.getID());

        level1.setLevelNumber(10);
        expect(level1.getLevelNumber()).to.equal(10);
    });

    it('It has a list of map cells', () => {
        const level1 = factLevel.createLevel('arena', 20, 20);
        expect(level1.getMap()).to.not.be.empty;

        const freeCell = level1.getFreeRandCell();
        expect(freeCell).to.not.be.empty;

        const emptyCell = level1.getEmptyRandCell();
        expect(emptyCell).to.not.be.empty;
    });

    it('has actors', () => {
        const level1 = factLevel.createLevel('arena', 20, 20);
        const actor = new Actor('actor');
        level1.addActor(actor, 2, 2);

        let actors = level1.getActors();
        expect(actors).to.have.length(1);
        expect(actors[0].getID()).to.equal(actor.getID());

        level1.removeActor(actor);
        actors = level1.getActors();
        expect(actors).to.have.length(0);
    });

    it('has items', () => {
        const level1 = factLevel.createLevel('arena', 20, 20);
        const item1 = new ItemBase('item1');
        const item2 = new ItemBase('item2');
        expect(level1.addItem(item1, 2, 2)).to.be.true;
        expect(level1.addItem(item2, 3, 3)).to.be.true;

        let items = level1.getItems();
        expect(items).to.have.length(2);
        expect(items[0]).to.equal(item1);

        expect(level1.removeItem(item1, 2, 2)).to.be.true;
        RG.suppressErrorMessages = true;
        expect(level1.removeItem(item1, 2, 2)).to.be.false;
        RG.suppressErrorMessages = false;

        items = level1.getItems();
        expect(items).to.have.length(1);
        expect(items[0]).to.equal(item2);
    });

    it('has a list of elements', () => {
        const level1 = factLevel.createLevel('arena', 20, 20);
        const stairs = new Stairs('stairsDown', level1);
        const elem1 = new Door(true);
        level1.addElement(elem1, 2, 2);
        level1.addElement(stairs, 3, 3);

        expect(level1.getElements()).to.have.length(2);
    });

    it('has stairs as elements', () => {
        const level1 = factLevel.createLevel('arena', 20, 20);
        const level2 = factLevel.createLevel('arena', 20, 20);
        const stairs = new Stairs('stairsDown', level1, level2);
        level1.addStairs(stairs, 5, 5);

        let sList = level1.getElements();
        expect(sList).to.have.length(1);

        level1._removePropFromLevelXY(RG.TYPE_ELEM, stairs, 5, 5);
        sList = level1.getElements();
        expect(sList).to.have.length(0);
    });

    it('has function to move objects around', () => {
        const level1 = factLevel.createLevel('arena', 20, 20);
        const level2 = factLevel.createLevel('arena', 20, 20);
        const actor = new Actor('mover');
        level1.addActor(actor, 1, 1);

        level1.moveActorTo(actor, 3, 7);
        expect(actor.getXY()).to.deep.equal([3, 7]);
        expect(actor.getLevel().getID()).to.equal(level1.getID());

        level2.moveActorTo(actor, 8, 9);
        expect(actor.getXY()).to.deep.equal([8, 9]);
        expect(actor.getLevel().getID()).to.equal(level2.getID());
    });

    it('can be serialized to JSON', () => {
        const level1 = factLevel.createLevel('arena', 20, 20);
        const map = level1.getMap();
        const cells = map.getCells();
        const cell0 = cells[0];
        expect(cell0.getBaseElem().getType()).to.equal('wall');
        expect(cells[35].getBaseElem().getType()).to.equal('floor');

        const json = level1.toJSON();
        expect(json.id).to.equal(level1.getID());
        expect(json.levelNumber).to.equal(level1.getLevelNumber());
    });

    it('can contain almost arbitrary extra info for procgen', () => {
        const level1 = factLevel.createLevel('arena', 30, 35);
        const extras: LevelExtras = {
            extraBool: true,
            extrasNum: 1234,
            extraString: 'location',
            extraArr: [1, "a", 'c'],
            extraObj: {
                nestedObj: {a: 1, b: 2, c: 3}
            },
        };
        level1.setExtras(extras);
    });

});
