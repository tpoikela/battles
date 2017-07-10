
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');

const Item = RG.Item.Base;
const Actor = RG.Actor.Rogue;
const Slot = RG.Inv.EquipSlot;

describe('RG.Inv.EquipSlot', function() {

    it('Holds items or stacks of items', function() {
        const rogue = new RG.Actor.Rogue('rogue');
        const invEq = new RG.Inv.Inventory(rogue);
        const eq = invEq.getEquipment();
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

describe('RG.Inv.Inventory', () => {

    it('can contain and equip items', function() {
        const food = new Item('Bagel');
        food.setType('food');
        const sword = new Item('Sword');
        sword.setType('weapon');
        const actor = new Actor('actor');

        const invEq = new RG.Inv.Inventory(actor);
        invEq.addItem(food);
        expect(invEq.getInventory().getItems().length).to.equal(1);
        invEq.addItem(sword);
        expect(invEq.getInventory().getItems().length).to.equal(2);
        expect(invEq.equipItem(sword)).to.equal(true);
        expect(invEq.getInventory().getItems().length).to.equal(1);

        const handsEquipped = invEq.getEquipment().getEquipped('hand');
        expect(handsEquipped.equals(sword)).to.equal(true);
        expect(invEq.unequipItem('hand')).to.equal(true);
    });

    it('can equip and unequip items in inventory', () => {
        const rogue = new RG.Actor.Rogue('rogue');
        const inv = new RG.Inv.Inventory(rogue);
        const sword = new RG.Item.Weapon('sword');

        inv.addItem(sword);
        inv.equipItem(sword);
        expect(inv.getWeapon().getName()).to.equal(sword.getName());

        inv.unequipItem('hand', 1);
        const items = inv.getInventory().getItems();
        expect(items).to.have.length(1);
        expect(items[0].count).to.equal(1);

    });

    it('Equips armour into correct slots', function() {
        const helmet = new RG.Item.Armour('Helmet');
        helmet.setArmourType('head');

        const actor = new RG.Actor.Rogue('rogue');
        const invEq = new RG.Inv.Inventory(actor);

        invEq.addItem(helmet);
        expect(invEq.equipItem(helmet)).to.equal(true);

        const headEquipped = invEq.getEquipment().getEquipped('head');
        expect(headEquipped.equals(helmet)).to.equal(true);
        expect(invEq.unequipItem('head', 0)).to.equal(true);
    });

    it('Equips missile weapons and ammo correctly', () => {
        const rifle = new RG.Item.MissileWeapon('rifle');
        const ammo = new RG.Item.Ammo('rifle bullet');
        const actor = new RG.Actor.Rogue('rogue');
        const invEq = new RG.Inv.Inventory(actor);

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

    it('Checks maximum weight allowed to carry', function() {
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

    it('Should not lose the item count (Bug was found)', () => {
        const player = new RG.Actor.Rogue('player');
        const invEq = player.getInvEq();
        const inv = invEq.getInventory();

        const dart = new RG.Item.Missile('Dart');
        dart.count = 1;
        const arrow = new RG.Item.Missile('Arrow');
        arrow.count = 1;

        invEq.addItem(dart);
        invEq.addItem(arrow);
        expect(invEq.equipItem(dart)).to.equal(true);
        expect(invEq.equipItem(arrow)).to.equal(false);

        let items = inv.getItems();
        expect(items[0].count).to.equal(1);

        invEq.unequipItem('missile', 1);
        expect(items).to.have.length(2);
        expect(invEq.equipNItems(dart, 1)).to.equal(true);
        expect(invEq.equipNItems(arrow, 1)).to.equal(false);

        items = inv.getItems();
        expect(items[0].count).to.equal(1);
    });
});
