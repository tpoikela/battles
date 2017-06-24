
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');
const Actor = require('../../../client/src/actor.js');

describe('Rogue.Actor', function() {

    it('has name, stats and inventory', function() {
        const actor = new Actor.Rogue('testRogue');
        expect(actor.getName()).to.equal('testRogue');

        const wp = actor.getWillpower();
        expect(wp).to.equal(5);

        const missile = actor.getMissile();
        expect(missile).to.be.null;

    });

    it('can be a player actor', function() {
        const actor = new Actor.Rogue('player hero');
        actor.setIsPlayer(true);
        expect(actor.isPlayer()).to.equal(true);

        RG.suppressErrorMessages = true;
        actor.setIsPlayer(false);
        expect(actor.isPlayer()).to.equal(true);
        RG.suppressErrorMessages = false;

        actor.setName('renamed');
        expect(actor.getName()).to.equal('renamed');

    });

    it('can be serialized to JSON', function() {
        const actor = new Actor.Rogue('player hero');
        actor.setIsPlayer(true);

        const hunger = new RG.Component.Hunger(100);
        actor.add('Hunger', hunger);

        const actorJSON = actor.toJSON();
        expect(actorJSON.name).to.equal('player hero');

        expect(actorJSON).to.have.property('components');

        expect(actorJSON.components.Hunger).to.exist;

    });

    it('has different stats', function() {
        const actor = new Actor.Rogue('player hero');
        actor.setIsPlayer(true);

        const prot = actor.getProtection();
        expect(prot).to.equal(0);

        const str = actor.getStrength();
        expect(str).to.equal(5);

        const dmg = actor.getDamage();
        expect(dmg > 0, 'More than 0 damage').to.equal(true);

    });

    it('can have CombatMods added', function() {
        const mob = new Actor.Rogue('mob');
        const combatMods = new RG.Component.CombatMods();

        const attack = mob.getAttack();
        combatMods.setAttack(5);
        mob.add('CombatMods', combatMods);
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

    it('can have StatsMods added', function() {
        const mob = new Actor.Rogue('mob');
        const statMods = new RG.Component.StatsMods();
        mob.add('StatsMods', statMods);

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
});
