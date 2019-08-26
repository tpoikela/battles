
import {expect} from 'chai';
import RG from '../../../client/src/rg';
import * as Item from '../../../client/src/item';
import * as Component from '../../../client/src/component';
import {SentientActor} from '../../../client/src/actor';
import {EquipSlot} from '../../../client/src/equipment';

const Actor = SentientActor;

describe('Inv.Inventory', () => {

    let actor = null;
    let invEq = null;
    let inventory = null;

    beforeEach(() => {
        actor = new Actor('actor');
        invEq = actor.getInvEq();
        inventory = invEq.getInventory();
    });

    it('can have items added and removed', () => {
        const sword = new Item.ItemBase('Sword');
        invEq.addItem(sword);
        expect(invEq.hasItem(sword)).to.equal(true);
        expect(invEq.removeItem(sword)).to.equal(true);
        expect(invEq.hasItem(sword)).to.equal(false);
        const removedItem = invEq.getRemovedItem();
        expect(removedItem).to.equal(sword);

        for (let i = 0; i < 4; i++) {
            const dagger = new Item.ItemBase('Dagger');
            invEq.addItem(dagger);
        }
        const numItems = inventory.getItems().length;
        expect(numItems).to.equal(1);
    });

    it('can contain and equip items', () => {
        const food = new Item.ItemBase('Bagel');
        food.setType('food');
        const sword = new Item.ItemBase('Sword');
        sword.setType('weapon');

        invEq.addItem(food);
        expect(inventory.getItems().length).to.equal(1);
        invEq.addItem(sword);
        expect(invEq.getInventory().getItems().length).to.equal(2);
        expect(invEq.equipItem(sword)).to.equal(true);
        expect(invEq.getInventory().getItems().length).to.equal(1);

        const handsEquipped = invEq.getEquipment().getEquipped('hand');
        expect(handsEquipped.equals(sword)).to.equal(true);
        expect(invEq.unequipItem('hand')).to.equal(true);
    });

    it('can equip and unequip items in inventory', () => {
        const sword = new Item.Weapon('sword');

        invEq.addItem(sword);
        invEq.equipItem(sword);
        expect(invEq.getWeapon().getName()).to.equal(sword.getName());

        invEq.unequipItem('hand', 1);
        const items = invEq.getInventory().getItems();
        expect(items).to.have.length(1);
        expect(items[0].getCount()).to.equal(1);

    });

    it('Equips armour into correct slots', () => {
        const helmet = new Item.Armour('Helmet');
        helmet.setArmourType('head');

        invEq.addItem(helmet);
        expect(invEq.equipItem(helmet)).to.equal(true);

        const headEquipped = invEq.getEquipment().getEquipped('head');
        expect(headEquipped.equals(helmet)).to.equal(true);
        expect(invEq.unequipItem('head', 0)).to.equal(true);
    });

    it('Equips missile weapons and ammo correctly', () => {
        const rifle = new Item.MissileWeapon('rifle');
        const ammo = new Item.Ammo('rifle bullet');

        invEq.addItem(rifle);
        invEq.addItem(ammo);
        expect(invEq.equipItem(rifle)).to.equal(true);
        expect(invEq.equipItem(ammo)).to.equal(true);

        const missWeaponEquipped = invEq.getEquipment()
            .getEquipped('missileweapon');
        const ammoWeaponEquipped = invEq.getEquipment().getEquipped('missile');

        expect(missWeaponEquipped.getName()).to.equal('rifle');
        expect(ammoWeaponEquipped.getName()).to.equal('rifle bullet');

        const missWeapon = invEq.getMissileWeapon();
        expect(missWeapon.equals(missWeaponEquipped)).to.be.true;
    });

    it('Checks maximum weight allowed to carry', () => {
        const inv = invEq.getInventory();
        const eq = invEq.getEquipment();

        const heavySword = new Item.Weapon('HeavySword');
        heavySword.setWeight(50.0);
        expect(invEq.canCarryItem(heavySword)).to.equal(false);

        const lightSword = new Item.Weapon('Light lightSword');
        lightSword.setWeight(5.0);
        lightSword.setCount(2);
        expect(invEq.canCarryItem(lightSword)).to.equal(true);
        invEq.addItem(lightSword);
        invEq.equipItem(lightSword);
        expect(eq.getWeight()).to.equal(5.0);
        expect(inv.getWeight()).to.equal(5.0);

        const shuriken = new Item.Missile('Shuriken');
        shuriken.setCount(20);
        shuriken.setWeight(0.1);
        invEq.addItem(shuriken);
        expect(inv.getWeight()).to.equal(7.0);
    });

    it('Should not lose the item count (Bug was found)', () => {
        const inv = invEq.getInventory();

        const dart = new Item.Missile('Dart');
        dart.setCount(1);
        const arrow = new Item.Missile('Arrow');
        arrow.setCount(1);

        invEq.addItem(dart);
        invEq.addItem(arrow);
        expect(invEq.equipItem(dart)).to.equal(true);
        expect(invEq.equipItem(arrow)).to.equal(false);

        let items = inv.getItems();
        expect(items[0].getCount()).to.equal(1);

        invEq.unequipItem('missile', 1);
        expect(inv.getItems()).to.have.length(2);
        expect(invEq.equipNItems(dart, 1)).to.equal(true);
        expect(invEq.equipNItems(arrow, 1)).to.equal(false);

        items = inv.getItems();
        expect(items[0].getCount()).to.equal(1);
    });

    it('should work with multiple slots of same type', () => {
        const eq = invEq.getEquipment();
        eq.addSlot('spiritgem', new EquipSlot(eq));
        for (let i = 0; i < 2; i++) {
            const gem = new Item.SpiritGem('my big gem ' + i);
            const stats = new Component.Stats();
            stats.setPerception(2);
            gem.add(stats);
            invEq.addItem(gem);
            invEq.equipItem(gem);
        }

        let perception = eq.getPerception();
        expect(perception).to.equal(4);

        expect(invEq.unequipItem('spiritgem', 1, 1)).to.be.true;
        expect(invEq.unequipItem('spiritgem', 1, 0)).to.be.true;

        perception = eq.getPerception();
        expect(perception).to.equal(0);

        const strength = eq.getStrength();
        expect(strength).to.equal(0);

        const swordOfStrength = new Item.Weapon('sword');
        const stats = new Component.Stats();
        stats.setStrength(10);
        swordOfStrength.add(stats);
        invEq.addItem(swordOfStrength);
        invEq.equipItem(swordOfStrength);
        expect(eq.getStrength()).to.equal(10);
    });

    /*
    it('preserves entity ID between equips', () => {
        const sword = new Item.Weapon('sword');
        const id = sword.getID();
        invEq.addItem(sword);
        invEq.equipItem(sword, 0);
        const unequippedSword = invEq.unequipAndGetItem('hand', 1);
        expect(unequippedSword.getID()).to.equal(id);

        const arrows = new Item.Ammo();
        // const arrowID = arrows.getID();
        arrows.setCount(10);
        invEq.addItem(arrows);
        invEq.equipNItems(arrows, arrows.count);

        const newArrows = invEq.getMissile();
        expect(newArrows.count).to.equal(10);
    });
    */

});
