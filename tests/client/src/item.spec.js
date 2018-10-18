
const chai = require('chai');
const chaiBattles = require('../../helpers/chai-battles.js');
const RG = require('../../../client/src/battles');
const RGTest = require('../../roguetest');

chai.use(chaiBattles);
const expect = chai.expect;
const Actor = RG.Actor.Rogue;
const Item = RG.Item.Base;

describe('How items are typed, physical entities', () => {

    it('has a type', () => {
        Object.keys(RG.Item).forEach(item => {
            if (!(/Container/).test(item)) {
                const newItem = new RG.Item[item]();
                expect(newItem.getType(), 'RG.Item.' + item).not.to.be.empty;
            }
        });
    });

    it('Has weight and size', () => {
        const item = new Item('TestItem');
        expect(item.has('Physical')).to.equal(true);

        item.setWeight(3.0);
        expect(item.get('Physical').getWeight()).to.equal(3.0);
        expect(item.getWeight()).to.equal(3.0);

        const clonedItem = item.clone();
        expect(item.equals(clonedItem)).to.equal(true);
        expect(clonedItem.equals(item)).to.equal(true);

    });

    it('can be compared', () => {
        Object.keys(RG.Item).forEach(item => {
            if (!(/Container/).test(item)) {
                const newItem = new RG.Item[item]();
                expect(newItem.equals(newItem),
                    'Identity: ' + item).to.equal(true);
            }
        });
        const arrow1 = new RG.Item.Missile('Arrow');
        const arrow2 = new RG.Item.Missile('Steel arrow');
        expect(arrow1.equals(arrow2)).to.be.false;
    });

    it('can be cloned with components', () => {
        const item = new RG.Item.Base('some item');
        const stats = new RG.Component.Stats();
        stats.setAccuracy(10);
        item.add(stats);
        const statsMods = new RG.Component.StatsMods();
        item.add(statsMods);

        const itemClone = item.clone();
        expect(itemClone.has('Stats')).to.equal(true);
        expect(itemClone.has('StatsMods')).to.equal(true);

        expect(itemClone.get('Stats').getAccuracy()).to.equal(10);

    });

    it('has a value depending on count', () => {
        const arrow = new RG.Item.Ammo('arrow');
        arrow.setValue(100);
        arrow.setCount(10);
        expect(arrow.getValue()).to.equal(100);
    });
});

describe('How items are stacked', () => {
    it('Adds two items to create a count of 2', () => {
        const item1 = new RG.Item.Base('Test item');
        item1.setType('test');
        const item2 = new RG.Item.Base('Test item');
        item2.setType('test');
        expect(RG.addStackedItems(item1, item2)).to.equal(true);
        expect(item1.getCount()).to.equal(2);
    });

    it('Stacks weapons correctly', () => {
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

describe('How stackes are broken into multiple items', () => {
    it('Splits item stack into two items', () => {
        const itemStack = new RG.Item.Base('Arrow');
        itemStack.setType('missile');
        itemStack.setCount(2);
        const arrow = RG.removeStackedItems(itemStack, 1);
        itemStack.setType('missile');
        expect(arrow.getName()).to.equal('Arrow');

        const hugeStack = new RG.Item.Base('Gold coin');
        hugeStack.setType('gold');
        hugeStack.setCount(10000);
        const newStack = new RG.Item.Base('Gold coin');
        newStack.setType('gold');
        newStack.setCount(100);

        let rmOk = true;
        while (hugeStack.getCount() > 9000 && rmOk) {
            const coin = RG.removeStackedItems(hugeStack, 100);
            rmOk = RG.addStackedItems(newStack, coin);
            expect(rmOk).to.equal(true);
            expect(coin.getCount()).to.equal(100);
        }
        expect(newStack.getCount()).to.equal(1100);
        expect(hugeStack.getCount()).to.equal(9000);

        const testStack = new RG.Item.Base('test item');
        testStack.setType('test');
        const stack = RG.removeStackedItems(testStack, 1);
        expect(stack).to.equal(testStack);
        expect(testStack.getCount()).to.equal(1);
        expect(stack.getCount()).to.equal(1);

        const two = new RG.Item.Base('test item');
        two.setType('test');
        two.setCount(5);
        const rmvTwo = RG.removeStackedItems(two, 5);
        expect(rmvTwo.getCount()).to.equal(5);
        expect(two).to.equal(rmvTwo);
        expect(two.getCount()).to.equal(5);
    });

    it('Manages missile items correctly', () => {
        const arrow = new RG.Item.Missile('arrow');
        arrow.setAttack(3);
        const arrow2 = new RG.Item.Missile('arrow');
        arrow2.setAttack(3);
        expect(RG.addStackedItems(arrow, arrow2)).to.equal(true);
        expect(arrow.getCount()).to.equal(2);

        const arrow3 = new RG.Item.Missile('arrow');
        arrow3.setAttack(10);
        expect(RG.addStackedItems(arrow, arrow3)).to.equal(false);
        expect(arrow.getCount()).to.equal(2);

        const rmvArrow = RG.removeStackedItems(arrow, 1);
        expect(arrow.getCount()).to.equal(1);
        expect(rmvArrow.getCount()).to.equal(1);
    });
});

describe('How inventory container works', () => {

    it('Checks items by reference for existence', () => {
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
        expect(inv.first().getCount()).to.equal(2);

        // 2. Add count and non-count items
        const steelArrow4 = new RG.Item.Missile('Steel arrow');
        const steelArrow1 = new RG.Item.Missile('Steel arrow');
        steelArrow4.setCount(4);
        inv.addItem(steelArrow4);
        inv.addItem(steelArrow1);
        expect(inv.last().getCount()).to.equal(5);

        // 3. Add non-count and count item
        const rubyArrow1 = new RG.Item.Missile('Ruby arrow');
        const rubyArrow6 = new RG.Item.Missile('Ruby arrow');
        rubyArrow6.setCount(6);
        inv.addItem(rubyArrow1);
        inv.addItem(rubyArrow6);
        expect(inv.last().getCount()).to.equal(7);

        // 4. Add two count items
        const ebonyArrow3 = new RG.Item.Missile('Ebony arrow');
        const ebonyArrow5 = new RG.Item.Missile('Ebony arrow');
        ebonyArrow3.setCount(3);
        ebonyArrow5.setCount(5);
        inv.addItem(ebonyArrow3);
        inv.addItem(ebonyArrow5);
        expect(inv.last().getCount()).to.equal(8);

        arrow.setCount(10);
        expect(inv.removeNItems(arrow, 2)).to.equal(true);
        expect(arrow.getCount()).to.equal(8);
        const removed = inv.getRemovedItem();
        expect(removed.getCount()).to.equal(2);

        expect(inv.removeNItems(arrow, 3)).to.equal(true);
        expect(arrow.getCount()).to.equal(5);
        const removed2 = inv.getRemovedItem();
        expect(removed2.getCount()).to.equal(3);

    });
});

describe('How item stacks work with equipped missiles', () => {
    let player = null;
    let invEq = null;
    let inv = null;
    let eq = null;

    beforeEach(() => {
        player = new RG.Actor.Rogue('player');
        invEq = new RG.Inv.Inventory(player);
        inv = invEq.getInventory();
        eq = invEq.getEquipment();
    });

    it('Stacks item in inv when added individually', () => {
        for (let i = 0; i < 10; i++) {
            const arrow = new RG.Item.Missile('arrow');
            invEq.addItem(arrow);
        }
        const newArrow = inv.first();
        expect(newArrow.getCount()).to.equal(10);

        const sword = new RG.Item.Weapon('sword');
        invEq.addItem(sword);
        expect(invEq.equipItem(sword)).to.equal(true);

        // Add some arrows and test they're seen in inv
        const testArrow = new RG.Item.Missile('Steel arrow');
        testArrow.setCount(12);
        invEq.addItem(testArrow);
        expect(invEq.hasItem(testArrow)).to.equal(true);
        expect(testArrow.getCount()).to.equal(12);

        // Check that iterator last() works
        const arrowStack = inv.last();
        expect(arrowStack.getCount()).to.equal(12);

        // Remove all arrows from inv
        expect(invEq.removeNItems(testArrow, 12)).to.equal(true);
        const removedArrows = invEq.getRemovedItem();
        expect(removedArrows.getCount()).to.equal(12);
        expect(removedArrows).to.equal(testArrow);
        // expect(testArrow.getCount()).to.equal(0);
        expect(invEq.hasItem(testArrow)).to.equal(false);

        // Add all arrows and equip one of them. Check that stack is decremented
        // by one
        testArrow.setCount(12); // Add count back to 12
        invEq.addItem(testArrow); // Add arrows all at once
        expect(testArrow.getCount()).to.equal(12);
        expect(invEq.hasItem(testArrow)).to.equal(true);
        expect(testArrow.getCount()).to.equal(12);
        expect(invEq.equipItem(testArrow)).to.equal(true);
        expect(testArrow.getCount()).to.equal(11);
        const oneArrow = invEq.getEquipped('missile');
        expect(oneArrow.getCount()).to.equal(1);

        // Try to equip non-inv items
        const sixArrows = new RG.Item.Missile('Steel arrow');
        sixArrows.setCount(6);
        expect(invEq.equipNItems(sixArrows, 6)).to.equal(true);
        expect(sixArrows.getCount()).to.equal(6);
        // invEq.addItem(sixArrows);
        // expect(invEq.hasItem(sixArrows)).to.equal(true);
        const sevenArrows = invEq.getEquipped('missile');
        expect(sevenArrows.getCount()).to.equal(7);

        const anotherSix = new RG.Item.Missile('Steel arrow');
        anotherSix.setCount(6);
        invEq.addItem(anotherSix);
        expect(invEq.equipNItems(anotherSix, 6)).to.equal(true);
        const arrows13 = invEq.getEquipped('missile');
        expect(arrows13.getCount()).to.equal(13);

        const shotArrow = invEq.unequipAndGetItem('missile', 3);
        expect(shotArrow.getCount()).to.equal(3);
        const tenArrows = eq.getItem('missile');
        expect(tenArrows.getCount()).to.equal(10);

        expect(invEq.unequipItem('missile', 1)).to.equal(true);
        const nineArrows = eq.getItem('missile');
        expect(nineArrows.getCount()).to.equal(9);

    });

    it('Equips armour correctly', () => {
        const collar = new RG.Item.Armour('Collar');
        collar.setArmourType('neck');
        inv.addItem(collar);
        expect(invEq.equipItem(collar)).to.equal(true);

        const plate = new RG.Item.Armour('Plate mail');
        plate.setArmourType('chest');
        inv.addItem(plate);
        expect(invEq.equipItem(plate)).to.equal(true);

        const gem = new RG.Item.SpiritGem('Lesser gem');
        expect(gem.getArmourType()).to.equal('spiritgem');
        inv.addItem(gem);
        expect(invEq.equipItem(gem)).to.equal(true);
        expect(eq.getStrength()).to.equal(0);

    });

});


describe('Usable one-shot items', () => {

    let itemDestroy = null;
    let pool = null;

    beforeEach(() => {
        pool = new RG.EventPool();
        itemDestroy = new RGTest.ItemDestroyer(pool);
    });

    afterEach(() => {
        pool.removeListener(itemDestroy);
        itemDestroy = null;
        pool = null;
    });


    it('Player uses a potion and it is destroyed after this.', () => {
        const potion = new RG.Item.Potion('potion');
        potion.setCount(1);
        const player = new Actor('Player');
        const cell = RG.FACT.createFloorCell();
        cell.setProp('actors', player);
        expect(cell.hasProp('actors')).to.equal(true);
        const invEq = player.getInvEq();

        invEq.addItem(potion);

        // Do some damage to the player
        const hp = player.get('Health').getHP();
        player.get('Health').setHP(hp - 5);
        const currHP = player.get('Health').getHP();

        expect(invEq.hasItem(potion)).to.equal(true);
        expect(invEq.removeItem(potion)).to.equal(true);
        expect(invEq.hasItem(potion)).to.equal(false);

        const newPotion = invEq.getRemovedItem();
        invEq.addItem(newPotion);
        expect(invEq.getInventory().hasItemRef(potion)).to.equal(true);
        expect(invEq.getInventory().hasItemRef(newPotion)).to.equal(true);

        expect(player.getInvEq().useItem(newPotion,
            {target: cell})).to.equal(true);
        expect(player.get('Health').getHP() !== currHP).to.equal(true);

        expect(player).to.have.component('UseItem');
        const useItemComp = player.get('UseItem');
        const usedItem = useItemComp.getItem();
        if (usedItem.getCount() === 1) {
            pool.emitEvent(RG.EVT_DESTROY_ITEM, {item: usedItem});
        }
        else {
            usedItem.decrCount(1);
        }

        expect(invEq.hasItem(potion)).to.equal(false);

        expect(itemDestroy.numCalls).to.equal(1);
        expect(itemDestroy.numDestroyed).to.equal(1);
    });
});

describe('Gold coins and other valuables', () => {
    it('Has weight and stacks normally', () => {
        const gold = new RG.Item.Gold('Gold nugget');
        gold.setCount(3);
        gold.setWeight(0.1);

        const coin = new RG.Item.GoldCoin();
        expect(coin.getPurity()).to.equal(1.0);

    });
});

describe('RG.Item.MissileWeapon', () => {
    it('Shoots arrows or bolts', () => {
        const bow = new RG.Item.MissileWeapon('bow');
        expect(bow).to.have.property('getAttackRange');
    });
});

