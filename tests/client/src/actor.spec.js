
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');
const Actor = require('../../../client/src/actor.js');

describe('Rogue.Actor', function() {

    it('has name, stats and inventory', function() {
        var actor = new Actor.Rogue('testRogue');
        expect(actor.getName()).to.equal('testRogue');

        var wp = actor.getWillpower();
        expect(wp).to.equal(5);

        var missile = actor.getMissile();
        expect(missile).to.be.null;

    });

    it('can be a player actor', function() {
        var actor = new Actor.Rogue('player hero');
        actor.setIsPlayer(true);
        expect(actor.isPlayer()).to.equal(true);

        actor.setIsPlayer(false);
        expect(actor.isPlayer()).to.equal(true);

        actor.setName('renamed');
        expect(actor.getName()).to.equal('renamed');

    });

    it('can be serialized to JSON', function() {
        var actor = new Actor.Rogue('player hero');
        actor.setIsPlayer(true);

        var hunger = new RG.Component.Hunger(100);
        actor.add('Hunger', hunger);

        var actorJSON = actor.toJSON();
        expect(actorJSON.name).to.equal('player hero');

        expect(actorJSON).to.have.property('components');

        expect(actorJSON.components.Hunger).to.exist;

    });

    it('has different stats', function() {
        var actor = new Actor.Rogue('player hero');
        actor.setIsPlayer(true);

        var prot = actor.getProtection();
        expect(prot).to.equal(0);

        var str = actor.getStrength();
        expect(str).to.equal(5);

        var dmg = actor.getDamage();
        expect(dmg > 0, 'More than 0 damage').to.equal(true);

    });

    it('can have CombatMods added', function() {
        var mob = new Actor.Rogue('mob');
        var combatMods = new RG.Component.CombatMods();

        var attack = mob.getAttack();
        combatMods.setAttack(5);
        mob.add('CombatMods', combatMods);
        var newAttack = mob.getAttack();
        expect(newAttack).to.equal(attack + 5);

        combatMods.setDamage(5);
        var mobDamage = mob.getDamage();
        expect(mobDamage >= 6).to.equal(true);

        var mobDefense = mob.getDefense();
        combatMods.setDefense(7);
        var mobNewDefense = mob.getDefense();
        expect(mobNewDefense).to.equal(mobDefense + 7);
    });

    it('can have StatsMods added', function() {
        var mob = new Actor.Rogue('mob');
        var statMods = new RG.Component.StatsMods();
        mob.add('StatsMods', statMods);

        var oldWp = mob.getWillpower();
        statMods.setWillpower(5);
        var newWp = mob.getWillpower();
        expect(newWp).to.equal(oldWp + 5);

        var oldStr = mob.getStrength();
        statMods.setStrength(-3);
        var newStr = mob.getStrength();
        expect(newStr).to.equal(oldStr - 3);

        var oldAcc = mob.getAccuracy();
        statMods.setAccuracy(10);
        var newAcc = mob.getAccuracy();
        expect(newAcc).to.equal(oldAcc + 10);

        var oldAgi = mob.getAgility();
        statMods.setAgility(10);
        var newAgi = mob.getAgility();
        expect(newAgi).to.equal(oldAgi + 10);

    });

});
