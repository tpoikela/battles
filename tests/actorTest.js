
var expect = require('chai').expect;
var RG = require('../client/src/battles.js');

var Actor = require('../client/src/actor.js');

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

    it('has stat modifiers', function() {
        var actor = new Actor.Rogue('player hero');
        actor.setIsPlayer(true);

        var prot = actor.getProtection();
        expect(prot).to.equal(0);

        var str = actor.getStrength();
        expect(str).to.equal(5);

        var dmg = actor.getDamage();
        expect(dmg > 0, 'More than 0 damage').to.equal(true);

    });

});
