
import RG from '../../../client/src/rg';
import { expect } from 'chai';
import * as Actor from '../../../client/src/actor';
import * as Item from '../../../client/src/item';
import * as Component from '../../../client/src/component';
import {ActorClass} from '../../../client/src/actor-class';

const SentientActor = Actor.SentientActor;

describe('Rogue.Actor', () => {

    it('has name, stats and inventory', () => {
        const actor = new SentientActor('testRogue');
        expect(actor.getName()).to.equal('testRogue');

        const named = actor.get('Named');
        named.setUniqueName('Lester');
        expect(actor.getName()).to.equal('Lester, testRogue');
        const wp = actor.getWillpower();
        expect(wp).to.equal(5);

        const missile = actor.getMissile();
        expect(missile).to.be.null;

    });

    it('Acts like Locatable', () => {
        const actor = new SentientActor(true);
        actor.setXY(2, 10);
        expect(actor.getX()).to.equal(2);
        expect(actor.getY()).to.equal(10);

        expect(actor.getXY()).to.deep.equal([2, 10]);

        expect(actor.isAtXY(2, 10)).to.equal(true);
        expect(actor.isAtXY(5, 11)).to.equal(false);
    });

    it('can be a player actor', () => {
        const actor = new SentientActor('player hero');
        actor.setIsPlayer(true);
        expect(actor.isPlayer()).to.equal(true);

        const funcThatThrows = () => {
            actor.setIsPlayer(false);
        };
        expect(funcThatThrows).to.throw(Error);
        expect(actor.isPlayer()).to.equal(true);

        actor.setName('renamed');
        expect(actor.getName()).to.equal('renamed');

    });

    it('can be serialized to JSON', () => {
        const actor = new SentientActor('player hero');
        actor.setIsPlayer(true);

        const hunger = new Component.Hunger();
        actor.add(hunger);

        const actorJSON = actor.toJSON();
        expect(actorJSON.name).to.equal('player hero');

        expect(actorJSON).to.have.property('components');

        const hungerJSON = Object.values(actorJSON.components).find(
            (c: any) => c.setType === 'Hunger'
        );
        expect(hungerJSON).to.exist;

    });

    it('has different stats', () => {
        const actor = new SentientActor('player hero');

        const prot = actor.getProtection();
        expect(prot).to.equal(0);

        const str = actor.getStrength();
        expect(str).to.equal(5);

        const dmg = actor.getDamage();
        expect(dmg > 0, 'More than 0 damage').to.equal(true);

    });

    it('has methods for getting combat damage', () => {
        const actor = new SentientActor('fighter');
        const sword = new Item.Weapon('sword');
        sword.setDamageDie('10d1 + 3');
        actor.getInvEq().addItem(sword);
        actor.getInvEq().equipItem(sword);
        const dmg = actor.getDamage();
        expect(dmg).to.be.at.least(13);

        const meat = new Item.Food('meat');
        actor.getInvEq().addItem(meat);
        expect(actor.getInvEq().unequipItem('hand', 1, 0)).to.be.true;
        expect(actor.getInvEq().equipItem(meat)).to.be.true;

        const dmgFood = actor.getDamage();
        expect(dmgFood).to.be.at.least(1);
    });

    it('can have CombatMods added', () => {
        const mob = new SentientActor('mob');
        const combatMods = new Component.CombatMods();

        const attack = mob.getAttack();
        combatMods.setAttack(5);
        mob.add(combatMods);
        const newAttack = mob.getAttack();
        expect(newAttack).to.equal(attack + 5);

        combatMods.setDamage(5);
        const mobDamage = mob.getDamage();
        expect(mobDamage >= 6).to.equal(true);

        const mobDefense = mob.getDefense();
        combatMods.setDefense(7);
        const mobNewDefense = mob.getDefense();
        expect(mobNewDefense).to.equal(mobDefense + 7);
    });

    it('can have StatsMods added', () => {
        const mob = new SentientActor('mob');
        const statMods = new Component.StatsMods();
        mob.add(statMods);

        const oldWp = mob.getWillpower();
        statMods.setWillpower(5);
        const newWp = mob.getWillpower();
        expect(newWp).to.equal(oldWp + 5);

        const oldStr = mob.getStrength();
        statMods.setStrength(-3);
        const newStr = mob.getStrength();
        expect(newStr).to.equal(oldStr - 3);

        const oldAcc = mob.getAccuracy();
        statMods.setAccuracy(10);
        const newAcc = mob.getAccuracy();
        expect(newAcc).to.equal(oldAcc + 10);

        const oldAgi = mob.getAgility();
        statMods.setAgility(10);
        const newAgi = mob.getAgility();
        expect(newAgi).to.equal(oldAgi + 10);
    });

    it('can have an actor class', () => {
        const archer = new SentientActor('archer');
        const actorClassComp = new Component.ActorClass();
        const actorClass = ActorClass.create('Marksman', archer);
        actorClassComp.setClassName('Marksman');
        actorClassComp.setActorClass(actorClass);
        archer.add(actorClassComp);
        RG.levelUpActor(archer, 2);

        const compJSON = actorClassComp.toJSON();
        expect(compJSON.setClassName).to.equal('Marksman');
    });
});
