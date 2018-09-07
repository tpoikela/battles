
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');

const {
    EquipSlot,
    Equipment
} = require('../../../client/src/equipment');

describe('EquipSlot', () => {

    it('Holds items or stacks of items', () => {
        const rogue = new RG.Actor.Rogue('rogue');
        const invEq = new RG.Inv.Inventory(rogue);
        const eq = invEq.getEquipment();
        const missSlot = new EquipSlot(eq, 'missile', true);

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


describe('Equipment', () => {
    let player = null;
    let eq = null;

    beforeEach(() => {
        player = new RG.Actor.Rogue('rogue');
        eq = new Equipment(player);
    });

    it('has different slots for items', () => {
        const slotTypes = eq.getSlotTypes();
        const nLast = slotTypes.length - 1;
        expect(slotTypes).to.have.length.above(5);
        expect(slotTypes[0]).to.equal('hand');
        expect(slotTypes[nLast]).to.equal('spiritgem');
    });

    it('can have items equipped', () => {
        eq.addSlot('spiritgem', new EquipSlot(eq, 'spiritgem'));
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
