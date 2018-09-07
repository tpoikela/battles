
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');

const Item = RG.Item.Base;
const Actor = RG.Actor.Rogue;
const Slot = RG.Inv.EquipSlot;

describe('RG.Inv.EquipSlot', () => {

    it('Holds items or stacks of items', () => {
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

describe('RG.Inv.Equipment', () => {
    let player = null;
    let eq = null;

    beforeEach(() => {
        player = new RG.Actor.Rogue('rogue');
        eq = new RG.Inv.Equipment(player);
    });

    it('has different slots for items', () => {
        const slotTypes = eq.getSlotTypes();
        const nLast = slotTypes.length - 1;
        expect(slotTypes).to.have.length.above(5);
        expect(slotTypes[0]).to.equal('hand');
        expect(slotTypes[nLast]).to.equal('spiritgem');
    });

    it('can have items equipped', () => {
        eq.addSlot('spiritgem', new RG.Inv.EquipSlot(eq, 'spiritgem'));
        const items = eq.getItem('spiritgem');
        expect(items).to.have.length(2);
        expect(eq.getNumSlots('hand')).to.equal(1);
        expect(eq.getNumSlots('spiritgem')).to.equal(2);

        for (let i = 0; i < 2; i++) {
            const gem = new RG.Item.SpiritGem('my big gem ' + i);
            eq.equipItem(gem, i);
        }
        expect(eq.getItems()).to.have.length(2);

        const gems = eq.getItem('spiritgem');
        gems.forEach(gem => {
            expect(gem).not.to.be.empty;
        });

        expect(eq.unequipItem('spiritgem')).to.be.true;
        expect(eq.getItems()).to.have.length(1);
        const unequipped = eq.getUnequipped('spiritgem', 0);
        expect(unequipped.getType()).to.equal('spiritgem');

    });

    it('can have a shield equipped', () => {
        const shield = new RG.Item.Armour('shield');
        shield.setArmourType('shield');
        shield.setDefense(10);
        const actor = new RG.Actor.Rogue('shielder');
        const invEq = actor.getInvEq();
        invEq.addItem(shield);
        invEq.equipItem(shield);
        expect(actor.getShieldDefense()).to.equal(10);

        const skills = new RG.Component.Skills();
        skills.addSkill('Shields');
        skills.setLevel('Shields', 5);
        actor.add(skills);
        expect(actor.getShieldDefense()).to.equal(15);
    });

    it('can have equipped items removed and re-equipped', () => {
        const shield = new RG.Item.Armour('shield');
        shield.setArmourType('shield');

        const actor = new RG.Actor.Rogue('equipper');
        const invEq = actor.getInvEq();
        const eq = invEq.getEquipment();
        const eqItems = eq.getItems();
        invEq.addItem(shield);
        invEq.equipItem(shield);
        invEq.unequipItem('shield');
        expect(eqItems).to.have.length(0);

        expect(invEq.equipItem(shield)).to.be.true;
        expect(eqItems).to.have.length(1);
        invEq.unequipItem('shield', 1);
        expect(eqItems).to.have.length(0);
        invEq.equipItem(shield);
        expect(eqItems).to.have.length(1);
        invEq.unequipItem('shield', 1, 0);
        expect(eqItems).to.have.length(0);

        const arrows = new RG.Item.Ammo('arrow');
        arrows.count = 10;
        invEq.addItem(arrows);
        invEq.equipNItems(arrows, 10);
        expect(eqItems).to.have.length(1);
        invEq.unequipItem('missile', 5, 0);
        expect(eqItems).to.have.length(1);
        invEq.unequipItem('missile', 4, 0);
        expect(eqItems).to.have.length(1);
        invEq.unequipItem('missile', 1, 0);
        expect(eqItems).to.have.length(0);
    });

});

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
        eq.addSlot('spiritgem', new RG.Inv.EquipSlot(eq, 'spiritgem'));
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
