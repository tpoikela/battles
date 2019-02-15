
/* Contains unit tests for Map.Level. */

import RG from '../../../client/src/rg';
import { expect } from 'chai';
import {SentientActor} from '../../../client/src/actor';
import * as Element from '../../../client/src/element';
import {Item} from '../../../client/src/item';
import {Level, LevelExtras} from '../../../client/src/level';
import {FactoryLevel} from '../../../client/src/factory.level';
import {Cell} from '../../../client/src/map.cell';
import {CellMap} from '../../../client/src/map';

const Actor = SentientActor;
const ItemBase = Item.Base;

const Stairs = Element.ElementStairs;
const Door = Element.ElementDoor;

RG.cellRenderArray = RG.cellRenderVisible;

describe('Level', () => {

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
        expect(level1.getMap()).to.be.an.instanceof(CellMap);

        const freeCell: Cell = level1.getFreeRandCell();
        expect(freeCell).to.be.an.instanceof(Cell);
        expect(freeCell.isPassable()).to.equal(true);
        expect(freeCell.isPassableByAir()).to.equal(true);

        const emptyCell: Cell = level1.getEmptyRandCell();
        expect(emptyCell.hasElements()).to.equal(false);
        expect(emptyCell.hasActors()).to.equal(false);
        expect(emptyCell.hasItems()).to.equal(false);

        expect(emptyCell).to.be.an.instanceof(Cell);
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

    it('can have items added and removed from it', () => {
        const level1 = factLevel.createLevel('arena', 20, 20);
        const item1 = new ItemBase('item1');
        const item2 = new ItemBase('item2');
        expect(level1.addItem(item1, 2, 2)).to.equal(true);
        expect(level1.addItem(item2, 3, 3)).to.equal(true);

        let items = level1.getItems();
        expect(items).to.have.length(2);
        expect(items[0]).to.equal(item1);

        expect(level1.removeItem(item1, 2, 2)).to.equal(true);
        const funcThatThrows = () => {
            level1.removeItem(item1, 2, 2);
        };
        expect(funcThatThrows).to.throw(Error);

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
            extraArr: [1, 'a', 'c'],
            extraObj: {
                nestedObj: {a: 1, b: 2, c: 3}
            },
        };

        const noExtras = level1.getExtras();
        expect(level1.hasExtras()).to.equal(false);
        expect(Object.keys(noExtras)).to.have.length(0);

        level1.setExtras(extras);
        expect(level1.hasExtras()).to.equal(true);

        expect(Object.keys(level1.getExtras())).to.have.length(5);
        level1.addExtras('shops', [1, 2, 3, 4]);
        expect(Object.keys(level1.getExtras())).to.have.length(6);
    });

});
