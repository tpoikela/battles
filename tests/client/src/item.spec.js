
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');

const Slot = RG.Inv.EquipSlot;
const Actor = RG.Actor.Rogue;
const Item = RG.Item.Base;

describe('How items are physical entities', function() {
    it('Has weight and size', function() {
        const item = new Item('TestItem');
        expect(item.has('Physical')).to.equal(true);

        item.setWeight(3.0);
        expect(item.get('Physical').getWeight()).to.equal(3.0);
        expect(item.getWeight()).to.equal(3.0);

        const clonedItem = item.clone();
        expect(item.equals(clonedItem)).to.equal(true);
        expect(clonedItem.equals(item)).to.equal(true);

    });
});

describe('How items are stacked', function() {
    it('Adds two items to create a count of 2', function() {
        const item1 = new RG.Item.Base('Test item');
        item1.setType('test');
        const item2 = new RG.Item.Base('Test item');
        item2.setType('test');
        expect(RG.addStackedItems(item1, item2)).to.equal(true);
        expect(item1.count).to.equal(2);
    });

    it('Stacks weapons correctly', function() {
        const weapon1 = new RG.Item.Weapon('Short sword');
        weapon1.setAttack(3);
        const weapon2 = new RG.Item.Weapon('Short sword');
        weapon2.setAttack(3);
        expect(weapon1.equals(weapon2)).to.equal(true);

        expect(RG.addStackedItems(weapon1, weapon2)).to.equal(true);

        const weapon3 = RG.removeStackedItems(weapon1, 1);
        expect(weapon3.getAttack()).to.equal(3);
    });
});

describe('How stackes are broken into multiple items', function() {
    it('Splits item stack into two items', function() {
        const itemStack = new RG.Item.Base('Arrow');
        itemStack.setType('missile');
        itemStack.count = 2;
        const arrow = RG.removeStackedItems(itemStack, 1);
        itemStack.setType('missile');
        expect(arrow.getName()).to.equal('Arrow');

        const hugeStack = new RG.Item.Base('Gold coin');
        hugeStack.setType('gold');
        hugeStack.count = 10000;
        const newStack = new RG.Item.Base('Gold coin');
        newStack.setType('gold');
        newStack.count = 100;

        let rmOk = true;
        while (hugeStack.count > 9000 && rmOk) {
            const coin = RG.removeStackedItems(hugeStack, 100);
            rmOk = RG.addStackedItems(newStack, coin);
            expect(rmOk).to.equal(true);
            expect(coin.count).to.equal(100);
        }
        expect(newStack.count).to.equal(1100);
        expect(hugeStack.count).to.equal(9000);

        const testStack = new RG.Item.Base('test item');
        testStack.setType('test');
        const stack = RG.removeStackedItems(testStack, 1);
        expect(testStack.count).to.equal(0);
        expect(stack.count).to.equal(1);

        const two = new RG.Item.Base('test item');
        two.setType('test');
        two.count = 5;
        const rmvTwo = RG.removeStackedItems(two, 5);
        expect(rmvTwo.count).to.equal(5);
        expect(two.count).to.equal(0);


    });

    it('Manages missile items correctly', function() {
        const arrow = new RG.Item.Missile('arrow');
        arrow.setAttack(3);
        const arrow2 = new RG.Item.Missile('arrow');
        arrow2.setAttack(3);
        expect(RG.addStackedItems(arrow, arrow2)).to.equal(true);
        expect(arrow.count).to.equal(2);

        const arrow3 = new RG.Item.Missile('arrow');
        arrow3.setAttack(10);
        expect(RG.addStackedItems(arrow, arrow3)).to.equal(false);
        expect(arrow.count).to.equal(2);

        const rmvArrow = RG.removeStackedItems(arrow, 1);
        expect(arrow.count).to.equal(1);
        expect(rmvArrow.count).to.equal(1);
    });
});

describe('How inventory container works', function() {

    it('Checks maximum weight allowed', function() {
        const player = new RG.Actor.Rogue('player');
        const invEq = player.getInvEq();
        const inv = invEq.getInventory();
        const eq = invEq.getEquipment();

        const heavySword = new RG.Item.Weapon('HeavySword');
        heavySword.setWeight(21.0);
        expect(invEq.canCarryItem(heavySword)).to.equal(false);

        const lightSword = new RG.Item.Weapon('Light lightSword');
        lightSword.setWeight(5.0);
        lightSword.count = 2;
        expect(invEq.canCarryItem(lightSword)).to.equal(true);
        invEq.addItem(lightSword);
        invEq.equipItem(lightSword);
        expect(eq.getWeight()).to.equal(5.0);
        expect(inv.getWeight()).to.equal(5.0);

        const shuriken = new RG.Item.Missile('Shuriken');
        shuriken.count = 20;
        shuriken.setWeight(0.1);
        invEq.addItem(shuriken);
        expect(inv.getWeight()).to.equal(7.0);


    });

    it('Checks items by reference for existence', function() {
        const player = new RG.Actor.Rogue('player');
        const invEq = new RG.Inv.Inventory(player);
        const inv = invEq.getInventory();

        const arrow = new RG.Item.Missile('arrow');
        const arrow2 = new RG.Item.Missile('arrow');
        expect(inv.hasItem(arrow)).to.equal(false);
        inv.addItem(arrow);
        expect(inv.hasItem(arrow)).to.equal(true);
        expect(inv.hasItemRef(arrow2)).to.equal(false);

        // 1. Add two non-count items
        inv.addItem(arrow2);
        expect(inv.first().count).to.equal(2);

        // 2. Add count and non-count items
        const steelArrow4 = new RG.Item.Missile('Steel arrow');
        const steelArrow1 = new RG.Item.Missile('Steel arrow');
        steelArrow4.count = 4;
        inv.addItem(steelArrow4);
        inv.addItem(steelArrow1);
        expect(inv.last().count).to.equal(5);

        // 3. Add non-count and count item
        const rubyArrow1 = new RG.Item.Missile('Ruby arrow');
        const rubyArrow6 = new RG.Item.Missile('Ruby arrow');
        rubyArrow6.count = 6;
        inv.addItem(rubyArrow1);
        inv.addItem(rubyArrow6);
        expect(inv.last().count).to.equal(7);

        // 4. Add two count items
        const ebonyArrow3 = new RG.Item.Missile('Ebony arrow');
        const ebonyArrow5 = new RG.Item.Missile('Ebony arrow');
        ebonyArrow3.count = 3;
        ebonyArrow5.count = 5;
        inv.addItem(ebonyArrow3);
        inv.addItem(ebonyArrow5);
        expect(inv.last().count).to.equal(8);

        arrow.count = 10;
        expect(inv.removeNItems(arrow, 2)).to.equal(true);
        expect(arrow.count).to.equal(8);
        const removed = inv.getRemovedItem();
        expect(removed.count).to.equal(2);

        expect(inv.removeNItems(arrow, 3)).to.equal(true);
        expect(arrow.count).to.equal(5);
        const removed2 = inv.getRemovedItem();
        expect(removed2.count).to.equal(3);

    });
});

describe('How item equipment slots work', function() {
    const player = new RG.Actor.Rogue('player');
    const invEq = new RG.Inv.Inventory(player);
    const eq = invEq.getEquipment();

    it('Holds items or stacks of items', function() {
        const missSlot = new Slot(eq, 'missile', true);

        const arrow = new RG.Item.Missile('arrow');
        arrow.count = 10;
        expect(missSlot.equipItem(arrow)).to.equal(true);
        expect(missSlot.unequipItem(5)).to.equal(true);

        const arrowStack = missSlot.getItem();
        expect(arrowStack.count).to.equal(5);
        expect(missSlot.unequipItem(5)).to.equal(true);
        const nullArrowStack = missSlot.getItem();
        expect(nullArrowStack === null).to.equal(true);

    });
});

describe('How item stacks work with equipped missiles', function() {
    const player = new RG.Actor.Rogue('player');
    const invEq = new RG.Inv.Inventory(player);
    const inv = invEq.getInventory();
    const eq = invEq.getEquipment();


    it('Stacks item in inv when added individually', function() {
        for (let i = 0; i < 10; i++) {
            const arrow = new RG.Item.Missile('arrow');
            invEq.addItem(arrow);
        }
        const newArrow = inv.first();
        expect(newArrow.count).to.equal(10);

        const sword = new RG.Item.Weapon('sword');
        invEq.addItem(sword);
        expect(invEq.equipItem(sword)).to.equal(true);

        // Add some arrows and test they're seen in inv
        const testArrow = new RG.Item.Missile('Steel arrow');
        testArrow.count = 12;
        invEq.addItem(testArrow);
        expect(invEq.hasItem(testArrow)).to.equal(true);
        expect(testArrow.count).to.equal(12);

        // Check that iterator last() works
        const arrowStack = inv.last();
        expect(arrowStack.count).to.equal(12);

        // Remove all arrows from inv
        expect(invEq.removeNItems(testArrow, 12)).to.equal(true);
        const removedArrows = invEq.getRemovedItem();
        expect(removedArrows.count).to.equal(12);
        expect(testArrow.count).to.equal(0);
        expect(invEq.hasItem(testArrow)).to.equal(false);

        // Add all arrows and equip one of them. Check that stack is decremented
        // by one
        testArrow.count = 12; // Add count back to 12
        invEq.addItem(testArrow); // Add arrows all at once
        expect(testArrow.count).to.equal(12);
        expect(invEq.hasItem(testArrow)).to.equal(true);
        expect(testArrow.count).to.equal(12);
        expect(invEq.equipItem(testArrow)).to.equal(true);
        expect(testArrow.count).to.equal(11);
        const oneArrow = invEq.getEquipped('missile');
        expect(oneArrow.count).to.equal(1);

        // Try to equip non-inv items
        const sixArrows = new RG.Item.Missile('Steel arrow');
        sixArrows.count = 6;
        expect(invEq.equipNItems(sixArrows, 6)).to.equal(true);
        expect(sixArrows.count).to.equal(6);
        // invEq.addItem(sixArrows);
        // expect(invEq.hasItem(sixArrows)).to.equal(true);
        const sevenArrows = invEq.getEquipped('missile');
        expect(sevenArrows.count).to.equal(7);

        const anotherSix = new RG.Item.Missile('Steel arrow');
        anotherSix.count = 6;
        invEq.addItem(anotherSix);
        expect(invEq.equipNItems(anotherSix, 6)).to.equal(true);
        const arrows13 = invEq.getEquipped('missile');
        expect(arrows13.count).to.equal(13);

        const shotArrow = invEq.unequipAndGetItem('missile', 3);
        expect(shotArrow.count).to.equal(3);
        const tenArrows = eq.getItem('missile');
        expect(tenArrows.count).to.equal(10);

        expect(invEq.unequipItem('missile', 1)).to.equal(true);
        const nineArrows = eq.getItem('missile');
        expect(nineArrows.count).to.equal(9);

    });

    it('Equips armour correctly', function() {
        const collar = new RG.Item.Armour('Collar');
        collar.setArmourType('neck');
        inv.addItem(collar);
        expect(invEq.equipItem(collar)).to.equal(true);

        const plate = new RG.Item.Armour('Plate mail');
        plate.setArmourType('chest');
        inv.addItem(plate);
        expect(invEq.equipItem(plate)).to.equal(true);

        const gem = new RG.Item.SpiritGem('Lesser gem');
        expect(gem.hasOwnProperty('getArmourType')).to.equal(true);
        inv.addItem(gem);
        expect(invEq.equipItem(gem)).to.equal(true);
        expect(eq.getStrength()).to.equal(0);

    });

});

const ItemDestroyer = function() {

    this.hasNotify = true;
    this.notify = function(evtName, obj) {
        if (evtName === RG.EVT_DESTROY_ITEM) {
            const item = obj.item;
            const owner = item.getOwner().getOwner();
            owner.getInvEq().removeItem(item);
        }
    };
    RG.POOL.listenEvent(RG.EVT_DESTROY_ITEM, this);
};

describe('How one-shot items are removed after their use', function() {
    it('Player uses a potion and it is destroyed after this.', function() {
        const potion = new RG.Item.Potion('potion');
        const player = new Actor('Player');
        const cell = RG.FACT.createFloorCell();
        cell.setProp('actors', player);
        expect(cell.hasProp('actors')).to.equal(true);
        const invEq = player.getInvEq();

        /* eslint-disable */
        const itemDestroy = new ItemDestroyer();
        /* eslint-enable */

        invEq.addItem(potion);

        // Do some damage to the player
        const hp = player.get('Health').getHP();
        player.get('Health').setHP(hp - 5);
        const currHP = player.get('Health').getHP();

        expect(invEq.hasItem(potion)).to.equal(true);
        expect(player.getInvEq().useItem(potion,
            {target: cell})).to.equal(true);
        expect(player.get('Health').getHP() !== currHP).to.equal(true);
        expect(invEq.hasItem(potion)).to.equal(false);
    });
});

describe('Gold coins and other valuables', function() {
    it('Has weight and stacks normally', function() {
        const gold = new RG.Item.Gold('Gold nugget');
        gold.count = 3;
        gold.setWeight(0.1);

        const coin = new RG.Item.GoldCoin();
        expect(coin.getPurity()).to.equal(1.0);

    });
});

describe('RG.Item.MissileWeapon', function() {
    it('Shoots arrows or bolts', function() {
        const bow = new RG.Item.MissileWeapon('bow');
        expect(bow).to.have.property('getAttackRange');
    });
});

