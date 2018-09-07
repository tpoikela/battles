
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');

const Item = RG.Item.Base;
const Actor = RG.Actor.Rogue;
const {EquipSlot} = require('../../../client/src/equipment');

describe('RG.Inv.Inventory', () => {

    let actor = null;
    let invEq = null;

    beforeEach(() => {
        actor = new Actor('actor');
        invEq = actor.getInvEq();
    });

    it('can contain and equip items', () => {
        const food = new Item('Bagel');
        food.setType('food');
        const sword = new Item('Sword');
        sword.setType('weapon');

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
        const sword = new RG.Item.Weapon('sword');

        invEq.addItem(sword);
        invEq.equipItem(sword);
        expect(invEq.getWeapon().getName()).to.equal(sword.getName());

        invEq.unequipItem('hand', 1);
        const items = invEq.getInventory().getItems();
        expect(items).to.have.length(1);
        expect(items[0].count).to.equal(1);

    });

    it('Equips armour into correct slots', () => {
        const helmet = new RG.Item.Armour('Helmet');
        helmet.setArmourType('head');

        invEq.addItem(helmet);
        expect(invEq.equipItem(helmet)).to.equal(true);

        const headEquipped = invEq.getEquipment().getEquipped('head');
        expect(headEquipped.equals(helmet)).to.equal(true);
        expect(invEq.unequipItem('head', 0)).to.equal(true);
    });

    it('Equips missile weapons and ammo correctly', () => {
        const rifle = new RG.Item.MissileWeapon('rifle');
        const ammo = new RG.Item.Ammo('rifle bullet');

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

    it('should work with multiple slots of same type', () => {
        const eq = invEq.getEquipment();
        eq.addSlot('spiritgem', new EquipSlot(eq, 'spiritgem'));
        for (let i = 0; i < 2; i++) {
            const gem = new RG.Item.SpiritGem('my big gem ' + i);
            const stats = new RG.Component.Stats();
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

        const swordOfStrength = new RG.Item.Weapon('sword');
        const stats = new RG.Component.Stats();
        stats.setStrength(10);
        swordOfStrength.add(stats);
        invEq.addItem(swordOfStrength);
        invEq.equipItem(swordOfStrength);
        expect(eq.getStrength()).to.equal(10);
    });

    it('preserves entity ID between equips', () => {
        const sword = new RG.Item.Weapon('sword');
        const id = sword.getID();
        invEq.addItem(sword);
        invEq.equipItem(sword, 0);
        const unequippedSword = invEq.unequipAndGetItem('hand', 1);
        expect(unequippedSword.getID()).to.equal(id);

        const arrows = new RG.Item.Ammo();
        const arrowID = arrows.getID();
        arrows.count = 10;
        console.log('Adding items now');
        invEq.addItem(arrows);
        console.log('Equipping items now');
        invEq.equipNItems(arrows, arrows.count);

        const newArrows = invEq.getMissile();
        expect(newArrows.getID()).to.equal(arrowID);
    });
});
