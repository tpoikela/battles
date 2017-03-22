
var expect = require('chai').expect;
var RG = require('../client/src/battles');

/* Updates given systems in given order.*/
var updateSystems = function(systems) {
    for (var i = 0; i < systems.length; i++) {
        systems[i].update();
    }
};

describe('Combat using ECS', function() {
    it('Has combat components', function() {
        var player = RG.FACT.createPlayer('Player', {});
        var combatComp = new RG.Component.Combat();
        player.add('Combat', combatComp);
        expect(player.get('Combat').getDamage() >= 1).to.equal(true);
        expect(player.get('Combat').getDamage() <= 4).to.equal(true);
    });
});

describe('How hunger system works', function() {
    it('Subtracts energy from actors with hunger', function() {
        var system = new RG.System.Hunger('Hunger', ['Hunger', 'Action']);
        var hunger = new RG.Component.Hunger(2000);
        var action = new RG.Component.Action();
        var player = RG.FACT.createPlayer('Player', {});
        player.add('Hunger', hunger);
        player.add('Action', action);
        action.addEnergy(100);
        expect(player.has('Hunger')).to.equal(true);
        expect(system.entities[player.getID()]).to.equal(player);
        expect(player.get('Action').getEnergy()).to.equal(100);
        system.update();
        expect(player.get('Hunger').getEnergy()).to.equal(2000 - 100);

    });

});

describe('How loot is dropped by monsters', function() {

    it('Drops loot when lethal damage is dealt', function() {
        var level = RG.FACT.createLevel('arena', 20, 20);

        var monsterStats = {hp: 5, att: 1, def: 1, prot: 1};
        var monster = RG.FACT.createActor('TestMonster', monsterStats);
        var humanStats = {hp: 5, att: 1, def: 1, prot: 1};
        var human = RG.FACT.createActor('Human', humanStats);

        var dSystem = new RG.System.Damage('Damage', ['Damage']);
        var systems = [dSystem];

        var lootItem = new RG.Item.Base('Loot item');
        var loot = new RG.Component.Loot(lootItem);

        monster.add('Loot', loot);
        var dmgComp = new RG.Component.Damage(6, 'fire');
        dmgComp.setSource(human);
        monster.add('Damage', dmgComp);
        expect(dSystem.entities.hasOwnProperty(monster.getID())).to.equal(true);

        var lootCell = level.getMap().getCell(3, 6);
        level.addActor(monster, 3, 6);
        expect(lootItem.getOwner()).to.equal(null);
        expect(lootCell.hasProp('items')).to.equal(false);
        updateSystems(systems);
        expect(monster.get('Health').getHP()).to.equal(0);
        expect(lootItem.getOwner()).to.equal(lootCell);
        expect(lootCell.hasProp('items')).to.equal(true);

    });
});

