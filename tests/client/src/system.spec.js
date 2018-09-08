
import Entity from '../../../client/src/entity';

const chai = require('chai');
const RG = require('../../../client/src/battles');

const RGTest = require('../../roguetest');
const ROT = require('../../../lib/rot');
const chaiBattles = require('../../helpers/chai-battles.js');

const expect = chai.expect;
chai.use(chaiBattles);

/* Updates given systems in given order.*/
const updateSystems = RGTest.updateSystems;

describe('System.Hunger', () => {
    it('Subtracts energy from actors with hunger', () => {
        const system = new RG.System.Hunger(['Hunger', 'Action']);
        const hunger = new RG.Component.Hunger();
        hunger.setEnergy(2000);
        hunger.setMaxEnergy(2000);
        const action = new RG.Component.Action();
        const player = RG.FACT.createPlayer('Player', {});
        player.add('Hunger', hunger);
        player.add('Action', action);
        action.addEnergy(100);
        expect(player).to.have.component('Hunger');
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
        let hList = monster.getList('Health');
        expect(hList).to.have.length(1);

        const humanStats = {hp: 5, att: 1, def: 1, prot: 1};
        const human = RG.FACT.createActor('Human', humanStats);

        const dSystem = new RG.System.Damage(['Damage']);
        const systems = [dSystem];

        const lootItem = new RG.Item.Base('Loot item');
        const loot = new RG.Component.Loot(lootItem);

        const invItem = new RG.Item.Weapon('Sword');

        monster.getInvEq().addItem(invItem);
        monster.add(loot);
        const dmgComp = new RG.Component.Damage(6, RG.DMG.FIRE);
        dmgComp.setSource(human);
        monster.add(dmgComp);
        expect(dSystem.entities.hasOwnProperty(monster.getID())).to.equal(true);

        const lootCell = level.getMap().getCell(3, 6);
        level.addActor(monster, 3, 6);
        expect(lootItem.getOwner()).to.equal(null);
        expect(lootCell.hasProp('items')).to.equal(false);
        updateSystems(systems);

        hList = monster.getList('Health');
        expect(hList).to.have.length(1);

        expect(monster.get('Health').isDead()).to.be.true;
        // expect(monster).to.be.dead;
        expect(lootItem.getOwner()).to.equal(lootCell);
        expect(lootCell.hasItems()).to.equal(true);

        // Check for the dropped inventory item
        const items = lootCell.getProp(RG.TYPE_ITEM);
        expect(items).to.have.length(3);
    });
});

describe('System.Attack', () => {

    let attackSystem = null;
    let systems = null;
    let human = null;
    let beast = null;

    beforeEach(() => {
        attackSystem = new RG.System.Attack(['Attack']);
        systems = [attackSystem];
        human = new RG.Actor.Rogue('Human');
        beast = new RG.Actor.Rogue('Beast');
        RGTest.wrapIntoLevel([human, beast]);
    });

    it('handles attacks between actors and adds Damage', () => {
        const sword = new RG.Item.Weapon('Sword');
        sword.setDamageDie('10d10 + 10');
        sword.setAttack(100);
        human.get('Combat').setAttack(100);
        human.getInvEq().addItem(sword);
        human.getInvEq().equipItem(sword);
        expect(human.getEquipAttack()).to.equal(100);

        beast.get('Combat').setDefense(0);
        beast.get('Stats').setAgility(0);

        const attackComp = new RG.Component.Attack({target: beast});
        human.add('Attack', attackComp);
        updateSystems(systems);

        expect(beast).to.be.an.entity;
        expect(beast, 'Beast was dealt damage').to.have.component('Damage');
    });

    it('takes into account hits bypassing protection', () => {
        const damageSystem = new RG.System.Damage(['Damage']);
        systems.push(damageSystem);

        const bypassComp = new RG.Component.BypassProtection();
        bypassComp.setChance(1.0);
        beast.add(bypassComp);
        const attackComp = new RG.Component.Attack({target: human});
        beast.add('Attack', attackComp);
        beast.get('Combat').setAttack(100);

        human.get('Combat').setDefense(0);
        human.get('Stats').setAgility(0);

        human.get('Combat').setProtection(100);

        const hpBefore = human.get('Health').getHP();
        updateSystems(systems);
        const hpAfter = human.get('Health').getHP();
        expect(hpAfter).to.be.below(hpBefore);
    });

    it('can apply AddOnHit components', function() {
        const damageSystem = new RG.System.Damage(['Damage']);
        systems.push(damageSystem);
        const timeSys = new RG.System.TimeEffects(['DirectDamage']);
        systems.push(timeSys);

        const parser = RG.ObjectShell.getParser();
        const voidDagger = parser.createItem('Void dagger');
        human.get('Combat').setDefense(0);
        human.get('Stats').setAgility(0);
        beast.getInvEq().addItem(voidDagger);
        beast.getInvEq().equipItem(voidDagger);

        const attComp = new RG.Component.Attack();
        attComp.setTarget(human);
        beast.add(attComp);

        updateSystems(systems);
        expect(human).to.have.component('DirectDamage');
        const ddComp = human.get('DirectDamage');
        expect(ddComp.getSource().getID()).to.equal(beast.getID());

        const hpComp = human.get('Health');

        let count = 100;
        while (!hpComp.isDead()) {
            beast.add(attComp);
            updateSystems(systems);
            if (--count === 0) {break;}
        }
        expect(count, 'Human dies in 100 turns').to.be.above(0);
        expect(beast).to.have.component('ExpPoints');
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

        RGTest.wrapIntoLevel([human, beast]);

        const beastAddOnHit = new RG.Component.AddOnHit();
        const beastDmgComp = new RG.Component.Damage(10, 'slash');
        const beastPoisonComp = new RG.Component.Poison();
        beastPoisonComp.setDamageDie('1d4');
        beastPoisonComp.setDurationDie('1d4');
        beastAddOnHit.setComp(beastPoisonComp);
        beast.add('AddOnHit', beastAddOnHit);

        beastDmgComp.setSource(beast);
        human.add('Damage', beastDmgComp);

        updateSystems(systems);
        expect(beast).to.have.component('Poison');
        expect(human).to.have.component('Poison');

        const dmg2 = new RG.Component.Damage(5, 'slash');
        dmg2.setSource(beast);
        human.add('Damage', dmg2);
        updateSystems(systems);
        expect(beast).to.have.component('Poison');
        expect(human).to.have.component('Poison');
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
        orc.get('Stats').setAgility(0); // Ensure spell hits
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

        expect(mage.get('SpellPower').getPP()).to.be.below(20);
        expect(orc.get('Health').getHP()).to.be.below(startHP);
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
        expect(walker.getX()).to.be.at.least(2);
        expect(walker.getY()).to.be.at.least(2);
        expect(walker.getX()).to.be.at.most(4);
        expect(walker.getY()).to.be.at.most(4);
    });
});

describe('System.Movement', () => {
    it('handles actor movement', () => {
        const movSystem = new RG.System.Movement(['Movement']);
        const player = new RG.Actor.Rogue('player name');
        player.setIsPlayer(true);
        const level = RG.FACT.createLevel('arena', 20, 20);
        level.addActor(player, 1, 1);

        const expElem = new RG.Element.Exploration();
        expElem.setExp(100);
        level.addElement(expElem, 2, 2);
        const movComp = new RG.Component.Movement(2, 2, level);
        player.add(movComp);

        expect(level.getElements()).to.have.length(1);
        updateSystems([movSystem]);

        expect(player).to.have.component('ExpPoints');
        expect(level.getElements()).to.have.length(0);
    });
});

describe('System.Chat', () => {

    it('handles chat actions between player and NPC', () => {
        const chatter = new RG.Actor.Rogue('chatter');
        chatter.setIsPlayer(true);
        const coins = new RG.Item.GoldCoin();
        coins.count = 1000;
        chatter.getInvEq().addItem(coins);

        const trainer = new RG.Actor.Rogue('trainer');
        RGTest.wrapIntoLevel([chatter, trainer]);
        const chatSys = new RG.System.Chat(['Chat']);

        trainer.get('Stats').setAccuracy(20);

        const accBefore = chatter.get('Stats').getAccuracy();

        RGTest.moveEntityTo(chatter, 1, 1);
        RGTest.moveEntityTo(trainer, 2, 2);
        const chatComp = new RG.Component.Chat();
        const args = {dir: [1, 1]};
        chatComp.setArgs(args);
        chatter.add(chatComp);

        const trainComp = new RG.Component.Trainer();
        trainer.add(trainComp);

        updateSystems([chatSys]);

        const brain = chatter.getBrain();
        expect(brain._wantSelection).to.equal(true);
        expect(chatter).not.to.have.component('Chat');

        const actionCb = brain.decideNextAction({code: ROT.VK_0});
        expect(brain._wantSelection).to.equal(false);

        actionCb();

        expect(chatter).to.have.accuracy(accBefore + 1);
    });
});

describe('System.SpiritBind', () => {
    it('is used to bind spirits into spirit gems', () => {
        const spiritSys = new RG.System.SpiritBind(['SpiritBind']);

        const binder = new RG.Actor.Rogue('shaman');
        const spirit = new RG.Actor.Rogue('Evil spirit');
        spirit.setType('spirit');
        spirit.add(new RG.Component.Ethereal());
        RGTest.wrapIntoLevel([binder, spirit]);

        const gem = new RG.Item.SpiritGem('Great gem');
        binder.getInvEq().addItem(gem);
        gem.useItem({target: spirit.getCell()});

        expect(gem).to.have.component('SpiritBind');
        expect(gem.hasSpirit()).to.equal(false);

        updateSystems([spiritSys]);

        expect(gem.hasSpirit()).to.equal(true);
        expect(gem).not.to.have.component('SpiritBind');
    });

    it('is used to bind gems into items', () => {
        const spiritSys = new RG.System.SpiritBind(['SpiritBind']);
        const binder = new RG.Actor.Rogue('shaman');

        const spirit = new RG.Actor.Rogue('Evil spirit');
        spirit.setType('spirit');
        spirit.add(new RG.Component.Ethereal());
        spirit.get('Stats').setStrength(10);

        const gem = new RG.Item.SpiritGem('Great gem');
        gem.setSpirit(spirit);
        binder.getInvEq().addItem(gem);

        const sword = new RG.Item.Weapon('sword');
        const cell = RGTest.wrapObjWithCell(sword);

        expect(gem.getStrength()).to.equal(10);
        expect(RG.getItemStat('getStrength', gem)).to.equal(10);

        let items = binder.getInvEq().getInventory().getItems();
        // 1st attempt, no item binding skill
        gem.useItem({target: cell});
        updateSystems([spiritSys]);
        expect(sword).not.to.have.component('GemBound');
        expect(items).to.have.length(1);

        // 2nd attempt, crafting skill added
        binder.add(new RG.Component.SpiritItemCrafter());
        gem.useItem({target: cell});
        updateSystems([spiritSys]);
        expect(sword).to.have.component('GemBound');

        items = binder.getInvEq().getInventory().getItems();
        expect(items).to.have.length(0);

        expect(RG.getItemStat('getStrength', sword)).to.equal(10);

        binder.getInvEq().addItem(sword);
        binder.getInvEq().equipItem(sword);

        const eq = binder.getInvEq().getEquipment();
        expect(eq.getStrength()).to.equal(10);

        // Try toJSON/restoring while we're here
        const json = sword.toJSON();
        const newSword = new RG.Game.FromJSON().createItem(json);

        expect(newSword).to.have.component('GemBound');
        const restGem = newSword.get('GemBound').getGem();
        const restSpirit = restGem.getSpirit();
        expect(restSpirit.get('Stats').getStrength()).to.equal(10);
        expect(restGem.hasSpirit()).to.equal(true);

        expect(restGem.getStrength()).to.equal(10);
    });

});

describe('System.TimeEffects', () => {

    it('removes components from entities', () => {
        const expirSys = new RG.System.TimeEffects(['Expiration']);
        const entity = new Entity();
        const expComp = new RG.Component.Expiration();
        expect(entity).not.to.have.component('StatsMods');
        const statsMods = new RG.Component.StatsMods();
        expComp.addEffect(statsMods, 10);
        entity.add(statsMods);
        expect(entity).to.have.component('StatsMods');
        entity.add(expComp);

        entity.getName = () => 'an entity';
        entity.getCell = () => null;

        const statsMods2 = new RG.Component.StatsMods();
        expComp.addEffect(statsMods2, 20);
        entity.add(statsMods2);
        let modsList = entity.getList('StatsMods');
        expect(modsList).to.have.length(2);

        const durComp = new RG.Component.Duration();
        durComp.setDurationDie('8d1 + 4');
        const statsComp3 = new RG.Component.StatsMods();
        statsComp3.setMagic(2);
        statsComp3.setWillpower(-2);
        durComp.setComp(statsComp3);
        const expComp2 = new RG.Component.Expiration();
        const duration = durComp.rollDuration();
        expComp2.addEffect(durComp, duration);
        entity.add(durComp);
        entity.add(expComp2);

        modsList = entity.getList('StatsMods');
        expect(modsList).to.have.length(3);
        expect(entity).to.have.component('StatsMods');

        for (let i = 0; i < 10; i++) {
            updateSystems([expirSys]);
        }
        expect(entity).to.have.component('Expiration');
        expect(entity).to.have.component('StatsMods');

        modsList = entity.getList('Expiration');
        expect(modsList).to.have.length(2);

        modsList = entity.getList('StatsMods');
        expect(modsList).to.have.length(2);
        const sMods2 = entity.get('StatsMods');
        expect(sMods2.getID()).to.equal(statsMods2.getID());

        for (let i = 0; i < 10; i++) {
            updateSystems([expirSys]);
        }
        expect(entity).not.to.have.component('Expiration');
        expect(entity).not.to.have.component('StatsMods');
    });

    it('processes Coldness effects into damage', () => {
        const timeSys = new RG.System.TimeEffects(['Expiration', 'Coldness']);
        const damageSystem = new RG.System.Damage(['Damage']);

        const ghoul = new RG.Actor.Rogue('ghoul');
        const actor = new RG.Actor.Rogue('frozen');
        const bodyTemp = new RG.Component.BodyTemp();
        bodyTemp.setTemp(-95);
        actor.add(bodyTemp);
        actor.get('Health').setHP(5);
        RGTest.wrapIntoLevel([actor]);

        const expirComp = new RG.Component.Expiration();
        const paralComp = new RG.Component.Paralysis();
        paralComp.setSource(ghoul);
        expirComp.addEffect(paralComp, 15);
        actor.add(expirComp);
        actor.add(paralComp);

        actor.add(new RG.Component.Coldness());

        for (let i = 0; i < 13; i++) {
            updateSystems([timeSys, damageSystem]);
        }
        expect(actor.get('Health').isDead()).to.equal(true);
        expect(actor).not.to.have.component('Coldness');
        expect(actor).not.to.have.component('Expiration');
        expect(actor).not.to.have.component('Paralysis');

        for (let i = 0; i < 5; i++) {
            updateSystems([timeSys, damageSystem]);
        }
    });

});


describe('System.Experience', () => {
    it('checks gained exp points and gives exp levels', () => {
        const expSys = new RG.System.ExpPoints(['ExpPoints']);
        const actor = new RG.Actor.Rogue('rogue');
        RGTest.wrapIntoLevel([actor]);

        const compExp = actor.get('Experience');
        expect(compExp.getExp()).to.equal(0);
        for (let i = 1; i <= 4; i++) {
            actor.add(new RG.Component.ExpPoints(i * 10));
        }

        updateSystems([expSys]);
        expect(compExp.getExp()).to.equal(100);
    });

});

describe('System.Skills', () => {
    it('it handles skill progression of actors', () => {
        const skillsSys = new RG.System.Skills(['SkillsExp']);
        const entity = new RG.Actor.Rogue('rogue');
        RGTest.wrapIntoLevel([entity]);

        const skillComp = new RG.Component.Skills();
        entity.add(skillComp);

        const expComp = new RG.Component.SkillsExp();
        expComp.setSkill('Melee');
        expComp.setPoints(10);
        entity.add(expComp);

        for (let i = 0; i < 3; i++) {
            const expCompSpells = new RG.Component.SkillsExp();
            expCompSpells.setSkill('SpellCasting');
            expCompSpells.setPoints(10);
            entity.add(expCompSpells);
        }

        expect(entity).to.have.component('Skills');
        updateSystems([skillsSys]);

        expect(skillComp.getLevel('Melee')).to.equal(2);
        expect(skillComp.getLevel('SpellCasting')).to.equal(3);
    });
});

describe('System.Shop', () => {

    let shopSys = null;
    let shopkeeper = null;
    let shopCell = null;
    let shopElem = null;
    let actor = null;

    beforeEach(() => {
        shopSys = new RG.System.Shop(['Transaction']);
        shopkeeper = new RG.Actor.Rogue('shopkeeper');
        actor = new RG.Actor.Rogue('buyer');

        shopCell = new RG.Map.Cell();
        shopCell.setBaseElem(RG.ELEM.FLOOR);
        shopElem = new RG.Element.Shop();
        shopCell.setProp(RG.TYPE_ELEM, shopElem);
        RGTest.wrapIntoLevel([shopkeeper, actor]);

    });

    it('it handles buying transactions', () => {
        const item = new RG.Item.Weapon('sword');
        item.setValue(100);
        item.add(new RG.Component.Unpaid());
        shopCell.setProp(RG.TYPE_ITEM, item);
        const coins = new RG.Item.GoldCoin(RG.GOLD_COIN_NAME);
        coins.count = 100;

        const buyer = actor;
        buyer.getInvEq().addItem(coins);

        const trans = new RG.Component.Transaction();
        trans.setArgs({
            item, buyer, seller: shopkeeper, shop: shopElem
        });
        buyer.add(trans);

        updateSystems([shopSys]);
        expect(item.has('Unpaid'), 'Item not unpaid').to.equal(false);
    });

    it('handles selling transactions', () => {
        const item = new RG.Item.Weapon('sword');
        item.setValue(100);

        const coins = new RG.Item.GoldCoin(RG.GOLD_COIN_NAME);
        coins.count = 100;
        shopkeeper.getInvEq().addItem(coins);

        const seller = actor;
        seller.getInvEq().addItem(item);

        const trans = new RG.Component.Transaction();
        trans.setArgs({
            item, buyer: shopkeeper, seller, shop: shopElem
        });
        seller.add(trans);

        updateSystems([shopSys]);

        const cell = seller.getCell();
        expect(cell.getItems()[0]).to.have.component('Unpaid');
    });

    it('works with item count > 1', () => {
        const arrows = new RG.Item.Ammo('arrow');
        arrows.count = 15;
        arrows.setValue(20);

        const coins = new RG.Item.GoldCoin(RG.GOLD_COIN_NAME);
        coins.count = 100;
        shopkeeper.getInvEq().addItem(coins);

        const seller = actor;
        seller.getInvEq().addItem(arrows);

        const trans = new RG.Component.Transaction();
        trans.setArgs({
            item: arrows, buyer: shopkeeper, seller, shop: shopElem, count: 10
        });
        seller.add(trans);

        updateSystems([shopSys]);
        expect(arrows.count).to.equal(5);

        const soldCell = seller.getCell();
        const items = soldCell.getItems();
        expect(items.length).to.equal(1);
        expect(items[0].count).to.equal(10);
        expect(arrows).not.to.have.component('Unpaid');
        expect(items[0]).to.have.component('Unpaid');
    });

});

describe('System.Event', () => {
    it('It responds to entities with Component.Event', () => {
        const eventSys = new RG.System.Events(['Event']);
        const actor = new RG.Actor.Rogue('killed one');
        const killer = new RG.Actor.Rogue('killer');
        const clueless = new RG.Actor.Rogue('clueless');

        const player = new RG.Actor.Rogue('player hero');
        player.setIsPlayer(true);

        const actors = [actor, killer, clueless, player];
        const level = RGTest.wrapIntoLevel(actors);
        RGTest.moveEntityTo(actor, 2, 2);
        RGTest.moveEntityTo(player, 2, 3);
        RGTest.moveEntityTo(killer, 3, 3);
        RGTest.moveEntityTo(clueless, 5, 5);
        eventSys.addLevel(level, 2);

        const evt = new RG.Component.Event();
        const args = {
            type: RG.EVT_ACTOR_KILLED,
            actor,
            cause: killer};
        evt.setArgs(args);
        actor.add(evt);
        expect(actor).to.have.component('Event');

        updateSystems([eventSys]);
        expect(actor).not.to.have.component('Event');
    });
});

describe('System.AreaEffects', () => {
    it('handles Fire components in cells', () => {
        const areaSys = new RG.System.AreaEffects(['Flame']);
        const damageSystem = new RG.System.Damage(['Damage']);
        const systems = [areaSys, damageSystem];

        const burntActor = new RG.Actor.Rogue('victim');
        RGTest.wrapIntoLevel([burntActor]);

        const flameEnt = new RG.Actor.Rogue('flame');
        const health = burntActor.get('Health');

        while (!health.isDead()) {
            const fireComp = new RG.Component.Flame();
            fireComp.setDamageType(RG.DMG.FIRE);
            fireComp.setSource(flameEnt);
            burntActor.add(fireComp);

            expect(burntActor).to.have.component('Flame');
            const hpBefore = burntActor.get('Health').getHP();
            updateSystems(systems);
            const hpAfter = burntActor.get('Health').getHP();
            expect(hpAfter).to.be.below(hpBefore);
            expect(burntActor).not.to.have.component('Flame');
        }
    });
});
