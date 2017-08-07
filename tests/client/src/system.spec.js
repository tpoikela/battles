
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');

/* Updates given systems in given order.*/
const updateSystems = function(systems) {
    for (let i = 0; i < systems.length; i++) {
        systems[i].update();
    }
};

describe('How hunger system works', function() {
    it('Subtracts energy from actors with hunger', function() {
        const system = new RG.System.Hunger('Hunger', ['Hunger', 'Action']);
        const hunger = new RG.Component.Hunger(2000);
        const action = new RG.Component.Action();
        const player = RG.FACT.createPlayer('Player', {});
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

describe('How items/loot is dropped by monsters', function() {
    it('Drops loot when lethal damage is dealt', function() {
        const level = RG.FACT.createLevel('arena', 20, 20);

        const monsterStats = {hp: 5, att: 1, def: 1, prot: 1};
        const monster = RG.FACT.createActor('TestMonster', monsterStats);
        const humanStats = {hp: 5, att: 1, def: 1, prot: 1};
        const human = RG.FACT.createActor('Human', humanStats);

        const dSystem = new RG.System.Damage('Damage', ['Damage']);
        const systems = [dSystem];

        const lootItem = new RG.Item.Base('Loot item');
        const loot = new RG.Component.Loot(lootItem);

        const invItem = new RG.Item.Weapon('Sword');

        monster.getInvEq().addItem(invItem);
        monster.add('Loot', loot);
        const dmgComp = new RG.Component.Damage(6, 'fire');
        dmgComp.setSource(human);
        monster.add('Damage', dmgComp);
        expect(dSystem.entities.hasOwnProperty(monster.getID())).to.equal(true);

        const lootCell = level.getMap().getCell(3, 6);
        level.addActor(monster, 3, 6);
        expect(lootItem.getOwner()).to.equal(null);
        expect(lootCell.hasProp('items')).to.equal(false);
        updateSystems(systems);
        expect(monster.get('Health').getHP()).to.equal(0);
        expect(lootItem.getOwner()).to.equal(lootCell);
        expect(lootCell.hasProp('items')).to.equal(true);

        // Check for the dropped inventory item
        const items = lootCell.getProp(RG.TYPE_ITEM);
        expect(items).to.have.length(2);
    });
});

describe('System.Damage', () => {
    it('handles adding components on hit', () => {
        const level = RG.FACT.createLevel('arena', 10, 10);
        const dSystem = new RG.System.Damage('Damage', ['Damage']);
        const systems = [dSystem];

        const poisonSword = new RG.Item.Weapon('Sword of Poison');
        const addOnHit = new RG.Component.AddOnHit();
        const poisonComp = new RG.Component.Poison();
        addOnHit.setComp(poisonComp);
        poisonComp.duration = '1d6 + 5';
        poisonSword.add('AddOnHit', addOnHit);
        const human = new RG.Actor.Rogue('Human');
        human.getInvEq().addItem(poisonSword);
        human.getInvEq().equipItem(poisonSword);
        const beast = new RG.Actor.Rogue('Beast');

        const dmgComp = new RG.Component.Damage(10, 'slash');
        dmgComp.setSource(human);
        dmgComp.setWeapon(poisonSword);
        beast.add('Damage', dmgComp);

        updateSystems(systems);
        expect(beast.has('Poison')).to.equal(true);
    });
});
