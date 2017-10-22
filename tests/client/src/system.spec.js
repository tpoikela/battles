
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');

const RGTest = require('../../roguetest');

/* Updates given systems in given order.*/
const updateSystems = systems => {
    for (let i = 0; i < systems.length; i++) {
        systems[i].update();
    }
};

describe('System.Hunger', () => {
    it('Subtracts energy from actors with hunger', () => {
        const system = new RG.System.Hunger(['Hunger', 'Action']);
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

describe('How items/loot is dropped by monsters', () => {
    it('Drops loot when lethal damage is dealt', () => {
        const level = RG.FACT.createLevel('arena', 20, 20);

        const monsterStats = {hp: 5, att: 1, def: 1, prot: 1};
        const monster = RG.FACT.createActor('TestMonster', monsterStats);
        const humanStats = {hp: 5, att: 1, def: 1, prot: 1};
        const human = RG.FACT.createActor('Human', humanStats);

        const dSystem = new RG.System.Damage(['Damage']);
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

describe('System.Attack', () => {
    it('handles attacks between actors and adds Damage', () => {
        const attackSystem = new RG.System.Attack(['Attack']);
        const systems = [attackSystem];

        const sword = new RG.Item.Weapon('Sword');
        sword.setDamageDie('10d10 + 10');
        sword.setAttack(100);
        const human = new RG.Actor.Rogue('Human');
        human.get('Combat').setAttack(100);
        human.getInvEq().addItem(sword);
        human.getInvEq().equipItem(sword);
        expect(human.getEquipAttack()).to.equal(100);
        const beast = new RG.Actor.Rogue('Beast');
        beast.get('Combat').setDefense(0);

        RGTest.wrapIntoLevel([human, beast]);

        const attackComp = new RG.Component.Attack(beast);
        human.add('Attack', attackComp);
        updateSystems(systems);

        expect(beast.has('Damage'), 'Beast was dealt damage').to.be.true;
    });
});

describe('System.Damage', () => {
    it('handles adding components on hit', () => {
        const dSystem = new RG.System.Damage(['Damage']);
        const systems = [dSystem];

        const poisonSword = new RG.Item.Weapon('Sword of Poison');
        const addOnHit = new RG.Component.AddOnHit();
        const poisonComp = new RG.Component.Poison();
        addOnHit.setComp(poisonComp);
        const dieDur = RG.FACT.createDie('1d6 + 5');
        poisonComp.setDurationDie(dieDur);
        poisonSword.add('AddOnHit', addOnHit);
        const human = new RG.Actor.Rogue('Human');
        human.getInvEq().addItem(poisonSword);
        human.getInvEq().equipItem(poisonSword);
        const beast = new RG.Actor.Rogue('Beast');

        const dmgComp = new RG.Component.Damage(10, 'slash');
        dmgComp.setSource(human);
        dmgComp.setWeapon(poisonSword);
        beast.add('Damage', dmgComp);

        const beastAddOnHit = new RG.Component.AddOnHit();
        const beastDmgComp = new RG.Component.Damage(10, 'slash');
        const beastPoisonComp = new RG.Component.Poison();
        beastAddOnHit.setComp(beastPoisonComp);
        beast.add('AddOnHit', beastAddOnHit);

        beastDmgComp.setSource(beast);
        human.add('Damage', beastDmgComp);

        updateSystems(systems);
        expect(beast.has('Poison')).to.equal(true);
        expect(human.has('Poison')).to.equal(true);

        const dmg2 = new RG.Component.Damage(5, 'slash');
        dmg2.setSource(beast);
        human.add('Damage', dmg2);
        updateSystems(systems);
        expect(beast.has('Poison')).to.equal(true);
        expect(human.has('Poison')).to.equal(true);
    });
});

describe('System.SpellCast', () => {
    it('handles spellcasting of actors', () => {
        const dSystem = new RG.System.Damage(['Damage']);
        const effectSystem = new RG.System.SpellEffect(['SpellRay']);
        const spellSystem = new RG.System.SpellCast(['SpellCast']);
        const systems = [spellSystem, effectSystem, dSystem];

        const mage = new RG.Actor.Rogue('mage');
        const orc = new RG.Actor.Rogue('orc');
        RGTest.wrapIntoLevel([mage, orc]);
        RGTest.moveEntityTo(mage, 1, 1);
        RGTest.moveEntityTo(orc, 3, 1);

        const startHP = orc.get('Health').getHP();

        const spellPower = new RG.Component.SpellPower(20);
        mage.add('SpellPower', spellPower);

        const frostBolt = new RG.Spell.FrostBolt();

        const spellCast = new RG.Component.SpellCast();
        spellCast.setSource(mage);
        spellCast.setSpell(frostBolt);
        spellCast.setArgs({dir: [1, 0], src: mage});
        mage.add('SpellCast', spellCast);

        updateSystems(systems);

        expect(orc.get('Health').getHP()).to.be.below(startHP);
        expect(mage.get('SpellPower').getPP()).to.be.below(20);
    });
});

describe('System.Disability', () => {
    it('stops actors from acting', () => {
        const disSystem = new RG.System.Disability(['Stun', 'Paralysis']);
        const movSystem = new RG.System.Movement(['Movement']);

        const walker = new RG.Actor.Rogue('walker');
        const level = RGTest.wrapIntoLevel([walker]);
        RGTest.moveEntityTo(walker, 2, 2);
        const movComp = new RG.Component.Movement(level, 3, 3);
        movComp.setLevel(level);
        movComp.setXY(3, 3);
        walker.add(movComp);
        walker.add(new RG.Component.Paralysis());

        updateSystems([disSystem, movSystem]);

        expect(walker.getX()).to.equal(2);
        expect(walker.getY()).to.equal(2);

        walker.remove('Paralysis');
        walker.add(movComp);
        updateSystems([disSystem, movSystem]);
        expect(walker.getX()).to.equal(3);
        expect(walker.getY()).to.equal(3);

        walker.add(new RG.Component.Stun());
        movComp.setXY(5, 5);
        walker.add(movComp);
        updateSystems([disSystem, movSystem]);
        expect(walker.getX()).to.equal(3);
        expect(walker.getY()).to.equal(3);
    });
});

describe('System.SpiritBind', () => {
    it('is used to bind spirits into spirit gems', () => {
        const spiritSys = new RG.System.SpiritBind(['SpiritBind']);

        const binder = new RG.Actor.Rogue('shaman');
        const spirit = new RG.Actor.Spirit('Evil spirit');
        RGTest.wrapIntoLevel([binder, spirit]);

        const gem = new RG.Item.SpiritGem('Great gem');
        binder.getInvEq().addItem(gem);
        gem.useItem({target: spirit.getCell()});

        expect(gem.has('SpiritBind')).to.equal(true);
        expect(gem.hasSpirit()).to.equal(false);

        updateSystems([spiritSys]);

        expect(gem.hasSpirit()).to.equal(true);
        expect(gem.has('SpiritBind')).to.equal(false);
    });

    it('is used to bind gems into items', () => {
        const spiritSys = new RG.System.SpiritBind(['SpiritBind']);

        const binder = new RG.Actor.Rogue('shaman');
        const spirit = new RG.Actor.Spirit('Evil spirit');
        spirit.get('Stats').setStrength(10);
        const gem = new RG.Item.SpiritGem('Great gem');
        gem.setSpirit(spirit);
        binder.getInvEq().addItem(gem);

        const sword = new RG.Item.Weapon('sword');
        const cell = RGTest.wrapObjWithCell(sword);

        expect(gem.getStrength()).to.equal(10);
        expect(RG.getItemStat('getStrength', gem)).to.equal(10);

        // 1st attempt, no item binding skill
        gem.useItem({target: cell});
        updateSystems([spiritSys]);
        expect(sword.has('GemBound')).to.equal(false);

        // 2nd attempt, crafting skill added
        binder.add(new RG.Component.SpiritItemCrafter());
        gem.useItem({target: cell});
        updateSystems([spiritSys]);
        expect(sword.has('GemBound')).to.equal(true);

        expect(RG.getItemStat('getStrength', sword)).to.equal(10);

    });

});

