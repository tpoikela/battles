import { expect } from 'chai';
import RG from '../../../client/src/rg';
import {RGUnitTests} from '../../rg.unit-tests';

import {Cell} from '../../../client/src/map.cell';
import * as Element from '../../../client/src/element';
import * as Item from '../../../client/src/item';
import {SentientActor} from '../../../client/src/actor';
import {Level} from '../../../client/src/level';
import {FactoryLevel} from '../../../client/src/factory.level';
import * as Component from '../../../client/src/component';

const Actor = SentientActor;
const ElementBase = Element.ElementBase;
const Container = Item.Container;
const Wall = Element.ElementWall;

RG.cellRenderArray = RG.cellRenderVisible;

//---------------------------------------------------------------------------
// MAP CELL
//---------------------------------------------------------------------------

describe('Map.Cell', () => {
    it('Holds elements and actors', () => {
        const actor = new SentientActor('Player');
        const cell = new Cell(0, 0, new Element.ElementWall('wall'));
        expect(cell.isFree()).to.equal(false);
        expect(cell.hasPropType('wall')).to.equal(true);
        expect(cell.hasPropType('actors')).to.equal(false);
        expect(cell.lightPasses()).to.equal(false);

        // Setting an element property of the cell
        const floorElem = new ElementBase('floor');
        cell.setProp('elements', floorElem);
        expect(cell.hasPropType('floor')).to.equal(true);
        expect(cell.hasProp('elements')).to.equal(true);

        // Removing a property
        expect(cell.removeProp('elements', floorElem)).to.equal(true);
        expect(cell.hasPropType('floor')).to.equal(false);
        expect(cell.hasProp('elements')).to.equal(false);

        // Retrieving a property
        const propNull = cell.getProp('xxx');
        expect(propNull).to.equal(null);

        // A cell with actor(s) is not free
        const cellWithFloor = new Cell(0, 0, new ElementBase('floor'));
        expect(cellWithFloor.isFree()).to.equal(true);
        cellWithFloor.setProp('actors', actor);
        expect(cellWithFloor.isFree()).to.equal(false);
        expect(cellWithFloor.lightPasses()).to.equal(true);
        expect(cellWithFloor.hasProp('actors')).to.equal(true);
        expect(cellWithFloor.hasProp('items')).to.equal(false);
    });

    it('can have doors', () => {
        const cell = new Cell(0, 0, new ElementBase('floor'));
        const door = new Element.ElementDoor(true);
        cell.setProp(RG.TYPE_ELEM, door);
        expect(cell.hasDoor(), 'Cell should have a door').to.be.true;
    });
});

describe('RG.getStyleClassForCell()', () => {
    it('Returns correct CSS class and char', () => {
        const cell = new Cell(0, 0, new Wall('wall'));
        cell.setExplored();
        expect(RG.getStyleClassForCell(cell)).to.equal('cell-element-wall');

        const wallCell = new Cell(0, 0, new Wall('wall'));
        wallCell.setExplored();
        expect(wallCell.hasProp('elements')).to.equal(false);
        expect(RG.getStyleClassForCell(wallCell)).to.equal('cell-element-wall');
        expect(RG.getCellChar(wallCell)).to.equal(RG.charStyles.elements.wall);

        const stylesCopy = JSON.parse(JSON.stringify(RG.cellStyles));
        stylesCopy[RG.TYPE_ACTOR]['Player'] = 'cell-actor-player';

        const floorCell = new Cell(0, 0, new ElementBase('floor'));
        const actor = new SentientActor('Player');
        actor.setIsPlayer(true);
        floorCell.setExplored();
        expect(RG.getStyleClassForCell(floorCell)).to.equal('cell-element-floor');
        floorCell.setProp('actors', actor);

        const playerCss = RG.getPropClassOrChar(
            stylesCopy[RG.TYPE_ACTOR], actor);
        expect(playerCss).to.equal('cell-actor-player');
    });
});

//---------------------------------------------------------------------------
// ITEMS AND MAP CELLS
//--------------------------------------------------------------------------

describe('Items in map cells', () => {
    it('Is placed in a cell and needs an owner', () => {
        const cell = new Cell(0, 1, new ElementBase('floor'));
        cell.setExplored();
        const item = new Item.Food('MyFood');
        item.setType('fooditem');
        cell.setProp('items', item);
        expect(cell.hasProp('items')).to.equal(true);

        const items = cell.getProp('items');
        expect(items.length).to.equal(1);

        expect(RG.getStyleClassForCell(cell)).to.equal('cell-item-default');

        // Item must have its owners x,y
        item.setOwner(cell);
        expect(item.getX()).to.equal(0);
        expect(item.getY()).to.equal(1);

    });

    it('Container can also be placed into the cell', () => {
        const cell = new Cell(1, 2, new ElementBase('floor'));
        cell.setExplored();
        const container = new Container(cell);
        expect(container.getX()).to.equal(1);
        expect(container.getY()).to.equal(2);
        expect(container.isEmpty()).to.equal(true);
        expect(container.first()).to.equal(null);
        expect(container.next()).to.equal(null);

        // Test adding items.
        const food = new Item.Food('Corn');
        food.setType('food');
        const weapon = new Item.Weapon('Spear');
        weapon.setType('weapon');

        expect(food.getOwner()).to.equal(null);
        container.addItem(food);
        expect(food.getOwner()).to.equal(container);
        expect(container.isEmpty()).to.equal(false);
        expect(container.hasItem(food)).to.equal(true);
        expect(container.hasItem(weapon)).to.equal(false);
        expect(container.first()).to.equal(food);
        expect(container.next()).to.equal(null);

        // Add new weapon, then remove food
        container.addItem(weapon);
        expect(container.first()).to.equal(food);
        expect(container.next()).to.equal(weapon);

        expect(container.removeItem(food)).to.equal(true);
        expect(container.first()).to.equal(weapon);
        expect(container.removeItem(food)).to.equal(false);

        const cont2 = new Container(container);
        container.addItem(cont2);
        expect(cont2.getX()).to.equal(1);
        expect(cont2.getY()).to.equal(2);

    });

    it('Can contain open/closed doors', () => {
        const openDoor = new Element.ElementDoor(true);
        openDoor.openDoor();
        const doorCell = new Cell(0, 1, new Element.ElementBase('floor'));
        doorCell.setProp('elements', openDoor);
        expect(doorCell.hasDoor()).to.equal(true);
        RGUnitTests.checkChar(openDoor, '/');
        expect(doorCell.lightPasses()).to.equal(true);
        expect(doorCell.isPassable()).to.equal(true);
        openDoor.closeDoor();
        RGUnitTests.checkChar(openDoor, '+');
        RGUnitTests.checkCSSClassName(openDoor, 'cell-element-door');
        expect(doorCell.lightPasses()).to.equal(false);
        expect(doorCell.isPassable()).to.equal(false);
    });

});


//---------------------------------------------------------------------------
// MAP UNIT TESTS
//---------------------------------------------------------------------------

/*
describe('Map.CellList', () => {
    const actor = new Actor('Player');
    actor.setIsPlayer(true);
    const level1 = Factory.createLevel('arena', 10, 10);
    // const level2 = Factory.createLevel('arena', 20, 20);

    it('Is initialized as empty and having floors', () => {
        const map = level1.getMap();
        expect(map.hasXY(0, 0)).to.equal(true);
        expect(map.hasXY(9, 9)).to.equal(true);
        expect(map.hasXY(10, 10)).to.equal(false);

        const freeCells = map.getFree();
        expect(freeCells.length).to.equal(8 * 8);
        for (let i = 0; i < freeCells.length; i++) {
            expect(freeCells[i].isFree()).to.equal(true);
            expect(freeCells[i].lightPasses()).to.equal(true);
        }

        const actorNotInLevel = new Actor('monster');
        actor.getFOVRange = () => 1; // Override default
        level1.addActor(actor, 4, 4);
        const cells = map.getVisibleCells(actor);
        expect(cells.length).to.equal(17);

        let zeroCells = map.getVisibleCells(actorNotInLevel);
        expect(zeroCells.length).to.equal(0);

        // After setting x,y try again
        actorNotInLevel.setXY(4, 4);
        actorNotInLevel.getFOVRange = () => {return 5;}; // Override default
        zeroCells = map.getVisibleCells(actorNotInLevel);
        expect(zeroCells.length).to.equal(0);

        expect(level1.getMap().getCell(4, 4).isExplored()).to.equal(false);
        level1.exploreCells(actor);
        expect(level1.getMap().getCell(4, 4).isExplored()).to.equal(true);
    });

    it('contains map cells with different properties', () => {
        const mapgen = new MapGenerator();
        mapgen.setGen('empty', 20, 20);
        const obj = mapgen.getMap();
        const map = obj.map;

        map.setBaseElemXY(0, 0, RG.ELEM.CHASM);

        expect(map.isPassable(0, 0)).to.equal(false);
        expect(map.getCell(0, 0).isFree()).to.equal(false);
        expect(map.isPassableByAir(0, 0)).to.equal(true);
    });
});
*/

//--------------------------------------------------------------------------
// SHOPS
//--------------------------------------------------------------------------

describe('ElementBase.Shop', () => {
    it('Has special Shop elements', () => {
        const levelFact = new FactoryLevel();
        const level = levelFact.createLevel('arena', 30, 30);
        const map = level.getMap();
        const shopkeeper = new SentientActor('Shopkeeper');

        const adventurer = new SentientActor('Buyer');
        level.addActor(adventurer, 1, 1);
        const someGold = new Item.Gold('Gold nuggets');
        someGold.setWeight(2.0);
        adventurer.getInvEq().addItem(someGold);

        for (let i = 0; i < 10; i++) {
            const goldCoin = new Item.GoldCoin();
            adventurer.getInvEq().addItem(goldCoin);
        }
        const hundredCoins = new Item.GoldCoin();
        hundredCoins.setCount(300);
        adventurer.getInvEq().addItem(hundredCoins);

        const shopElem = new Element.ElementShop();
        const shopCell = map.getCell(1, 1);
        shopElem.setShopkeeper(shopkeeper);
        shopCell.setProp('elements', shopElem);
        expect(shopCell.hasShop()).to.equal(true);

        const soldItem = new Item.Weapon('Fancy Sword');
        soldItem.setValue(300);
        soldItem.add(new Component.Unpaid());
        level.addItem(soldItem, 1, 1);

        expect(shopCell.hasProp('items')).to.equal(true);
        expect(soldItem.has('Unpaid')).to.equal(true);
        expect(shopElem.getItemPriceForBuying(soldItem)).to.be.above(100);

    });
});


