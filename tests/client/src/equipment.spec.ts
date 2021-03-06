
import {expect} from 'chai';
import RG from '../../../client/src/rg';
import * as Item from '../../../client/src/item';
import {SentientActor} from '../../../client/src/actor';

import {
    EquipSlot,
    Equipment
} from '../../../client/src/equipment';
import * as Component from '../../../client/src/component';

describe('EquipSlot', () => {

    it('Holds items or stacks of items', () => {
        const missSlot = new EquipSlot('missile', true);

        const arrow = new Item.Missile('arrow');
        arrow.setCount(10);
        expect(missSlot.equipItem(arrow)).to.equal(true);
        expect(missSlot.unequipItem(5)).to.equal(true);

        const arrowStack = missSlot.getItem();
        expect(arrowStack.getCount()).to.equal(5);
        expect(missSlot.unequipItem(5)).to.equal(true);
        const nullArrowStack = missSlot.getItem();
        expect(nullArrowStack === null).to.equal(true);

    });
});

describe('Equipment', () => {
    let player = null;
    let eq = null;

    beforeEach(() => {
        player = new SentientActor('rogue');
        eq = new Equipment(player);
    });

    it('has different slots for items', () => {
        const slotTypes = eq.getSlotTypes();
        expect(slotTypes).to.have.length.above(5);

        const handSlot = slotTypes.findIndex(type => type === 'hand');
        expect(handSlot).to.be.at.least(0);
        const gemSlot = slotTypes.findIndex(type => type === 'spiritgem');
        expect(gemSlot).to.be.at.least(0);
    });

    it('can have items equipped', () => {
        eq.addSlot('spiritgem', new EquipSlot('spiritgem'));
        const items = eq.getItem('spiritgem');
        expect(items).to.have.length(2);
        expect(eq.getNumSlots('hand')).to.equal(1);
        expect(eq.getNumSlots('spiritgem')).to.equal(2);

        for (let i = 0; i < 2; i++) {
            const gem = new Item.SpiritGem('my big gem ' + i);
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
        const shield = new Item.Armour('shield');
        shield.setArmourType('shield');
        shield.setDefense(10);
        const actor = new SentientActor('shielder');
        const invEq = actor.getInvEq();
        invEq.addItem(shield);
        invEq.equipItem(shield);
        expect(actor.getShieldDefense()).to.equal(10);

        const skills = new Component.Skills();
        skills.addSkill('Shields');
        skills.setLevel('Shields', 5);
        actor.add(skills);
        expect(actor.getShieldDefense()).to.equal(15);
    });

    it('can have equipped items removed and re-equipped', () => {
        const shield = new Item.Armour('shield');
        shield.setArmourType('shield');

        const actor = new SentientActor('equipper');
        const invEq = actor.getInvEq();
        const eq = invEq.getEquipment();
        let eqItems = eq.getItems();
        invEq.addItem(shield);
        invEq.equipItem(shield);
        invEq.unequipItem('shield', 1, 0);
        expect(eqItems).to.have.length(0);

        expect(invEq.equipItem(shield)).to.be.true;
        eqItems = eq.getItems();

        expect(eq.getItems()).to.have.length(1);
        invEq.unequipItem('shield', 1, 0);
        expect(eq.getItems()).to.have.length(0);
        invEq.equipItem(shield);
        expect(eq.getItems()).to.have.length(1);
        invEq.unequipItem('shield', 1, 0);
        expect(eq.getItems()).to.have.length(0);

        const arrows = new Item.Ammo('arrow');
        arrows.setCount(10);
        invEq.addItem(arrows);
        invEq.equipNItems(arrows, 10);
        expect(eqItems).to.have.length(1);
        invEq.unequipItem('missile', 5, 0);
        expect(eqItems).to.have.length(1);
        invEq.unequipItem('missile', 4, 0);
        expect(eqItems).to.have.length(1);
        invEq.unequipItem('missile', 1, 0);
        expect(eq.getItems()).to.have.length(0);
    });

});
