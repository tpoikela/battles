/**
 * Unit Tests for maps and map cells.
 */

const expect = require('chai').expect;
const RG = require('../../../client/src/battles');
const RGTest = require('../../roguetest.js');

const Actor = RG.Actor.Rogue;
const Level = RG.Map.Level;
const Element = RG.Element.Base;
const Cell = RG.Map.Cell;
const Item = RG.Item.Base;
const Container = RG.Item.Container;
const Factory = RG.FACT;
const Stairs = RG.Element.Stairs;

RG.cellRenderArray = RG.cellRenderVisible;

//---------------------------------------------------------------------------
// MAP CELL
//---------------------------------------------------------------------------

describe('Map.Cell', function() {
    it('Holds elements and actors', function() {
        const actor = Factory.createPlayer('Player', 50);
        const cell = new Cell(0, 0, new Element('wall'));
        expect(cell.isFree()).to.equal(false);
        expect(cell.hasPropType('wall')).to.equal(true);
        expect(cell.hasPropType('actors')).to.equal(false);
        expect(cell.lightPasses()).to.equal(false);

        // Setting an element property of the cell
        const floorElem = new Element('floor');
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
        const cellWithFloor = Factory.createFloorCell(1, 1);
        expect(cellWithFloor.isFree()).to.equal(true);
        cellWithFloor.setProp('actors', actor);
        expect(cellWithFloor.isFree()).to.equal(false);
        expect(cellWithFloor.lightPasses()).to.equal(true);
        expect(cellWithFloor.hasProp('actors')).to.equal(true);
        expect(cellWithFloor.hasProp('items')).to.equal(false);
    });
});

describe('RG.getStyleClassForCell()', function() {
    it('Returns correct CSS class and char', function() {
        const cell = new Cell(0, 0, new Element('wall'));
        cell.setExplored();
        expect(RG.getStyleClassForCell(cell)).to.equal('cell-element-wall');

        const wallCell = new Cell(0, 0, new Element('wall'));
        wallCell.setExplored();
        expect(wallCell.hasProp('elements')).to.equal(false);
        expect(RG.getStyleClassForCell(wallCell)).to.equal('cell-element-wall');
        expect(RG.getCellChar(wallCell)).to.equal(RG.charStyles.elements.wall);

        const floorCell = new Cell(0, 0, new Element('floor'));
        const actor = Factory.createPlayer('Player', 50);
        floorCell.setExplored();
        expect(RG.getStyleClassForCell(floorCell))
            .to.equal('cell-element-floor');
        floorCell.setProp('actors', actor);
        expect(RG.getStyleClassForCell(floorCell))
            .to.equal('cell-actor-player');
    });
});

//---------------------------------------------------------------------------
// ITEMS AND MAP CELLS
//--------------------------------------------------------------------------

describe('Items in map cells', function() {
    it('Is placed in a cell and needs an owner', function() {
        const cell = new Cell(0, 1, new Element('floor'));
        cell.setExplored();
        const item = new Item('food');
        item.setType('food');
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

    it('Container can also be placed into the cell', function() {
        const cell = new Cell(1, 2, new Element('floor'));
        cell.setExplored();
        const container = new Container(cell);
        expect(container.getX()).to.equal(1);
        expect(container.getY()).to.equal(2);
        expect(container.isEmpty()).to.equal(true);
        expect(container.first()).to.equal(null);
        expect(container.next()).to.equal(null);

        // Test adding items.
        const food = new Item('Corn');
        food.setType('food');
        const weapon = new Item('Spear');
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

    it('Picking up items from floor by actor', function() {
        const level = Factory.createLevel('arena', 20, 20);
        const actor = Factory.createPlayer('Player', {});
        const inv = actor.getInvEq().getInventory();
        const weapon = new Item('weapon');
        weapon.setType('weapon');

        expect(level.addItem(weapon, 2, 4)).to.equal(true);
        expect(level.addActor(actor, 2, 4)).to.equal(true);

        // After picking up, cell must not have item anymore
        const cell = level.getMap().getCell(2, 4);
        expect(cell.hasProp('items')).to.equal(true);
        level.pickupItem(actor, 2, 4);
        expect(cell.hasProp('items')).to.equal(false);

        const invItems = inv.getItems();
        expect(invItems[0]).to.equal(weapon);
        expect(actor.getInvEq().equipItem(weapon)).to.equal(true);
        expect(inv.isEmpty()).to.equal(true);
    });

    it('Can contain open/closed doors', function() {
        const openDoor = new RG.Element.Door(true);
        openDoor.openDoor();
        const doorCell = new RG.Map.Cell(0, 1, new RG.Element.Base('floor'));
        doorCell.setProp('elements', openDoor);
        expect(doorCell.hasDoor()).to.equal(true);
        RGTest.checkChar(openDoor, '/');
        expect(doorCell.lightPasses()).to.equal(true);
        expect(doorCell.isPassable()).to.equal(true);
        openDoor.closeDoor();
        RGTest.checkChar(openDoor, '+');
        RGTest.checkCSSClassName(openDoor, 'cell-element-door');
        expect(doorCell.lightPasses()).to.equal(false);
        expect(doorCell.isPassable()).to.equal(false);
    });

});


//---------------------------------------------------------------------------
// MAP UNIT TESTS
//---------------------------------------------------------------------------

describe('Map.CellList', function() {
    const actor = new Actor('Player');
    actor.setIsPlayer(true);
    const level1 = Factory.createLevel('arena', 10, 10);
    // const level2 = Factory.createLevel('arena', 20, 20);

    it('Is initialized as empty and having floors', function() {
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
        actor.getFOVRange = function() {return 1;}; // Override default
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
        const mapgen = new RG.Map.Generator();
        mapgen.setGen('empty', 20, 20);
        const obj = mapgen.getMap();
        const map = obj.map;

        map.setBaseElemXY(0, 0, RG.ELEM.CHASM);

        expect(map.isPassable(0, 0)).to.equal(false);
        expect(map.getCell(0, 0).isFree()).to.equal(false);
        expect(map.isPassableByAir(0, 0)).to.equal(true);
    });
});

//---------------------------------------------------------------------------
// LEVEL UNIT TESTS
//---------------------------------------------------------------------------

describe('Moving actors around in the game', function() {
    it('Moves but is blocked by walls.', function() {
        const movSystem = new RG.System.Movement('Movement', ['Movement']);
        const actor = new Actor('TestActor');
        const level = new Level(10, 10);
        const mapgen = new RG.Map.Generator();
        mapgen.setGen('arena', 10, 10);
        const mapObj = mapgen.getMap();
        level.setMap(mapObj.map);
        level.addActor(actor, 1, 2);
        expect(actor.getX()).to.equal(1);
        expect(actor.getY()).to.equal(2);

        // Actors x,y changes due to move
        const movComp = new RG.Component.Movement(2, 3, level);
        actor.add('Movement', movComp);
        movSystem.update();
        expect(actor.getX()).to.equal(2);
        expect(actor.getY()).to.equal(3);

        // Create a wall to block the passage
        const wall = new Element('wall');
        level.getMap().setBaseElemXY(4, 4, wall);
        movSystem.update();
        expect(actor.getX(), "X didn't change due to wall").to.equal(2);
        expect(actor.getY()).to.equal(3);

    });

    it('Moves actors between levels using stairs', function() {
        const movSystem = new RG.System.Movement('Movement', ['Movement']);
        const level1 = Factory.createLevel('arena', 20, 20);
        const level2 = Factory.createLevel('arena', 20, 20);
        const player = Factory.createPlayer('Player', {});

        const stairs1 = new Stairs(true, level1, level2);
        const stairs2 = new Stairs(false, level2, level1);
        stairs1.setTargetStairs(stairs2);
        stairs2.setTargetStairs(stairs1);

        level1.addActor(player, 2, 2);
        expect(player.getLevel()).to.equal(level1);

        const map1 = level1.getMap();
        const map2 = level2.getMap();
        expect(map1.getCell(2, 2).hasPropType('stairsDown')).to.equal(false);
        expect(map2.getCell(10, 10).hasPropType('stairsUp')).to.equal(false);

        // Now add stairs and check they exist in the cells
        level1.addStairs(stairs1, 2, 2);
        level2.addStairs(stairs2, 10, 10);
        expect(map1.getCell(2, 2).hasPropType('stairsDown')).to.equal(true);
        expect(map2.getCell(10, 10).hasPropType('stairsUp')).to.equal(true);

        const refStairs1 = level1.getMap().getCell(2, 2).getStairs();
        expect(refStairs1).to.equal(stairs1);

        const refStairs2 = level2.getMap().getCell(10, 10).getStairs();
        expect(refStairs2).to.equal(stairs2);

        expect(player.getX()).to.equal(2);
        expect(player.getY()).to.equal(2);
        level1.useStairs(player);
        expect(player.getLevel()).to.equal(level2);
        expect(player.getX()).to.equal(10);
        expect(player.getY()).to.equal(10);

        // Return to prev level
        level2.useStairs(player);
        expect(player.getLevel()).to.equal(level1);
        expect(player.getX()).to.equal(2);
        expect(player.getY()).to.equal(2);
        level1.useStairs(player);

        // Check level with two stairs to different levels
        const level3 = Factory.createLevel('arena', 30, 30);
        const stairsDown23 = new Stairs(true, level2, level3);
        const stairsUp32 = new Stairs(false, level2, level3);
        level2.addStairs(stairsDown23, 12, 13);
        level3.addStairs(stairsUp32, 6, 7);
        stairsDown23.setTargetStairs(stairsUp32);
        stairsUp32.setTargetStairs(stairsDown23);

        const movComp = new RG.Component.Movement(12, 13, level2);
        player.add('Movement', movComp);
        movSystem.update();
        level2.useStairs(player);
        expect(player.getLevel()).to.equal(level3);
        expect(player.getX()).to.equal(6);
        expect(player.getY()).to.equal(7);
    });
});

//--------------------------------------------------------------------------
// SHOPS
//--------------------------------------------------------------------------

describe('Element.Shop', function() {
    it('Has special Shop elements', function() {
        const level = RG.FACT.createLevel('arena', 30, 30);
        const map = level.getMap();
        const shopkeeper = new RG.Actor.Rogue('Shopkeeper');

        const adventurer = new RG.Actor.Rogue('Buyer');
        level.addActor(adventurer, 1, 1);
        const someGold = new RG.Item.Gold('Gold nuggets');
        someGold.setWeight(2.0);
        adventurer.getInvEq().addItem(someGold);

        for (let i = 0; i < 10; i++) {
            const goldCoin = new RG.Item.GoldCoin();
            adventurer.getInvEq().addItem(goldCoin);
        }
        const hundredCoins = new RG.Item.GoldCoin();
        hundredCoins.count = 100;
        adventurer.getInvEq().addItem(hundredCoins);

        const shopElem = new RG.Element.Shop();
        const shopCell = map.getCell(1, 1);
        shopElem.setShopkeeper(shopkeeper);
        shopCell.setProp('elements', shopElem);
        expect(shopCell.hasShop()).to.equal(true);

        const soldItem = new RG.Item.Weapon('Fancy Sword');
        soldItem.setValue(300);
        soldItem.add('Unpaid', new RG.Component.Unpaid());
        level.addItem(soldItem, 1, 1);
        expect(shopCell.hasProp('items')).to.equal(true);
        expect(soldItem.has('Unpaid')).to.equal(true);
        expect(shopElem.getItemPriceForBuying(soldItem)).to.equal(40);

        expect(shopElem.buyItem(soldItem, adventurer)).to.equal(true);
        expect(shopCell.hasProp('items')).to.equal(false);
        expect(soldItem.has('Unpaid')).to.equal(false);

        let advItems = adventurer.getInvEq().getInventory().getItems();
        const coinsAfterBuy = advItems[1];
        const ncoinsAfterBuy = coinsAfterBuy.count;

        const soldShield = new RG.Item.Armour('Gleaming shield');
        soldShield.setValue(100);
        adventurer.getInvEq().addItem(soldShield);
        expect(shopElem.sellItem(soldShield, adventurer)).to.equal(true);

        advItems = adventurer.getInvEq().getInventory().getItems();
        const coinsAfterSale = advItems[1];
        const ncoinsAfterSale = coinsAfterSale.count;

        expect(shopCell.hasProp('items')).to.equal(true);
        expect(ncoinsAfterSale > ncoinsAfterBuy).to.equal(true);
    });
});

//---------------------------------------------------------------------------
// MAP GENERATOR
//---------------------------------------------------------------------------

describe('Map.Generator', () => {
    it('can generate forest levels with trees', () => {
        const mapgen = new RG.Map.Generator();
        mapgen.setGen('digger', 20, 20);
        const obj = mapgen.createForest(0.5);
        const map = obj.map;
        expect(map).to.not.be.empty;
    });

    it('can generate mountain levels with zig-zag paths', () => {
        const mapgen = new RG.Map.Generator();
        mapgen.setGen('mountain', 50, 200);
        const conf = {
            chasmThr: -0.3,
            stoneThr: 0.4,
            highRockThr: 0.6,
            nRoadTurns: 6
        };

        for (let i = 0; i < 1; i++) {
            const obj = mapgen.createMountain(100, 400, conf);
            const map = obj.map;
            expect(map).to.exist;
        }

    });
});

