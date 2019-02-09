
import chai from 'chai';
import ROT from '../../../lib/rot';
import RG from '../../../client/src/rg';

import {Entity} from '../../../client/src/entity';
import {Cell} from '../../../client/src/map.cell';
import {Level} from '../../../client/src/level';

import {RGTest} from '../../roguetest';
import {RGUnitTests} from '../../rg.unit-tests';
import {chaiBattles} from '../../helpers/chai-battles';
import {SentientActor } from '../../../client/src/actor';
import * as Item from '../../../client/src/item';
import * as Component from '../../../client/src/component';
import * as Element from '../../../client/src/element';
import { ELEM } from '../../../client/data/elem-constants';
import {System} from '../../../client/src/system';
import {FactoryLevel} from '../../../client/src/factory.level';
import {FactoryActor} from '../../../client/src/factory.actors';
import {MapGenerator} from '../../../client/src/map.generator';
import {ObjectShell} from '../../../client/src/objectshellparser';
import {Dice} from '../../../client/src/dice';
import {FromJSON} from '../../../client/src/game.fromjson';
import {Spell} from '../../../client/src/spell';
import {BrainPlayer} from '../../../client/src/brain/brain.player';

const Stairs = Element.ElementStairs;
const expect = chai.expect;
chai.use(chaiBattles);
const Factory = new FactoryLevel();

/* Updates given systems in given order.*/
const updateSystems = RGTest.updateSystems;

const factLevel = new FactoryLevel();

describe('System.Hunger', () => {
    it('Subtracts energy from actors with hunger', () => {
        const system = new System.Hunger(['Hunger', 'Action']);

        const hunger = new Component.Hunger();
        hunger.setEnergy(2000);
        hunger.setMaxEnergy(2000);

        const factActor = new FactoryActor();
        const player = factActor.createPlayer('Player', {});
        const action = new Component.Action();
        player.add(hunger);
        player.add(action);
        action.addEnergy(100);
        expect(player).to.have.component('Hunger');
        expect(system.entities[player.getID()]).to.equal(player);

        const actComp = player.get('Action');
        const actList = player.getList('Action');
        expect(actList.length).to.equal(1);
        expect(actComp.getEnergy()).to.equal(100);
        system.update();
        expect(player.get('Hunger').getEnergy()).to.equal(2000 - 100);
    });
});

describe('System.Attack', () => {

    let attackSystem = null;
    let systems = null;
    let human = null;
    let beast = null;

    beforeEach(() => {
        attackSystem = new System.Attack(['Attack']);
        systems = [attackSystem];
        human = new SentientActor('Human');
        beast = new SentientActor('Beast');
        RGUnitTests.wrapIntoLevel([human, beast]);
    });

    it('handles attacks between actors and adds Damage', () => {
        const sword = new Item.Weapon('Sword');
        sword.setDamageDie('10d10 + 10');
        sword.setAttack(100);
        human.get('Combat').setAttack(100);
        human.getInvEq().addItem(sword);
        human.getInvEq().equipItem(sword);
        expect(human.getEquipAttack()).to.equal(100);

        beast.get('Combat').setDefense(0);
        beast.get('Stats').setAgility(0);

        const attackComp = new Component.Attack({target: beast});
        human.add(attackComp);
        updateSystems(systems);

        expect(beast).to.be.an.instanceof(Entity);
        expect(beast, 'Beast was dealt damage').to.have.component('Damage');
    });

    it('takes into account hits bypassing protection', () => {
        const damageSystem = new System.Damage(['Damage']);
        systems.push(damageSystem);

        const bypassComp = new Component.BypassProtection();
        bypassComp.setChance(1.0);
        beast.add(bypassComp);
        const attackComp = new Component.Attack({target: human});
        beast.add(attackComp);
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
        const damageSystem = new System.Damage(['Damage']);
        systems.push(damageSystem);
        const timeSys = new System.TimeEffects(['DirectDamage']);
        systems.push(timeSys);

        const parser = ObjectShell.getParser();
        const voidDagger = parser.createItem('Void dagger');
        human.get('Combat').setDefense(0);
        human.get('Stats').setAgility(0);
        beast.getInvEq().addItem(voidDagger);
        beast.getInvEq().equipItem(voidDagger);

        const attComp = new Component.Attack();
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
        const dSystem = new System.Damage(['Damage']);
        const systems = [dSystem];

        const poisonSword = new Item.Weapon('Sword of Poison');
        const addOnHit = new Component.AddOnHit();
        const poisonComp = new Component.Poison();
        addOnHit.setComp(poisonComp);
        const dieDur = Dice.create('1d6 + 5');
        poisonComp.setDurationDie(dieDur);
        poisonSword.add(addOnHit);
        const human = new SentientActor('Human');
        human.getInvEq().addItem(poisonSword);
        human.getInvEq().equipItem(poisonSword);

        const beast = new SentientActor('Beast');
        const dmgComp = new Component.Damage(10, 'slash');
        dmgComp.setSource(human);
        dmgComp.setWeapon(poisonSword);
        beast.add(dmgComp);

        RGUnitTests.wrapIntoLevel([human, beast]);

        const beastAddOnHit = new Component.AddOnHit();
        const beastDmgComp = new Component.Damage(10, 'slash');
        const beastPoisonComp = new Component.Poison();
        beastPoisonComp.setDamageDie('1d4');
        beastPoisonComp.setDurationDie('1d4');
        beastAddOnHit.setComp(beastPoisonComp);
        beast.add(beastAddOnHit);

        beastDmgComp.setSource(beast);
        human.add(beastDmgComp);

        updateSystems(systems);
        expect(beast).to.have.component('Poison');
        expect(human).to.have.component('Poison');

        const dmg2 = new Component.Damage(5, 'slash');
        dmg2.setSource(beast);
        human.add(dmg2);
        updateSystems(systems);
        expect(beast).to.have.component('Poison');
        expect(human).to.have.component('Poison');
    });

    it('Drops loot when lethal damage is dealt', () => {
        const level = factLevel.createLevel('arena', 20, 20);

        const monsterStats = {hp: 5, att: 1, def: 1, prot: 1};
        const factActor = new FactoryActor();
        const monster = factActor.createActor('TestMonster', monsterStats);
        let hList = monster.getList('Health');
        expect(hList).to.have.length(1);

        const humanStats = {hp: 5, att: 1, def: 1, prot: 1};
        const human = factActor.createActor('Human', humanStats);

        const dSystem = new System.Damage(['Damage']);
        const systems = [dSystem];

        const lootItem = new Item.ItemBase('Loot item');
        const loot = new Component.Loot(lootItem);

        const invItem = new Item.Weapon('Sword');

        monster.getInvEq().addItem(invItem);
        monster.add(loot);
        const dmgComp = new Component.Damage(6, RG.DMG.FIRE);
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

        expect(monster.get('Health').isDead()).to.equal(true);
        // expect(monster).to.be.dead;
        expect(lootItem.getOwner()).to.equal(lootCell);
        expect(lootCell.hasItems()).to.equal(true);

        // Check for the dropped inventory item
        const items = lootCell.getProp(RG.TYPE_ITEM);
        expect(items).to.have.length(3);
    });
});

describe('System.SpellCast', () => {
    it('handles spellcasting of actors', () => {
        const dSystem = new System.Damage(['Damage']);
        const effectSystem = new System.SpellEffect(['SpellRay']);
        const spellSystem = new System.SpellCast(['SpellCast']);
        const systems = [spellSystem, effectSystem, dSystem];

        const mage = new SentientActor('mage');
        const orc = new SentientActor('orc');
        orc.get('Stats').setAgility(0); // Ensure spell hits
        RGUnitTests.wrapIntoLevel([mage, orc]);
        RGUnitTests.moveEntityTo(mage, 1, 1);
        RGUnitTests.moveEntityTo(orc, 3, 1);

        const startHP = orc.get('Health').getHP();

        const spellPower = new Component.SpellPower(20);
        mage.add(spellPower);

        const frostBolt = new Spell.FrostBolt();
        frostBolt.setCaster(mage);

        const spellCast = new Component.SpellCast();
        spellCast.setSource(mage);
        spellCast.setSpell(frostBolt);
        spellCast.setArgs({dir: [1, 0], src: mage});
        mage.add(spellCast);

        updateSystems(systems);

        expect(mage.get('SpellPower').getPP()).to.be.below(20);
        expect(orc.get('Health').getHP()).to.be.below(startHP);
    });
});

describe('System.Disability', () => {
    it('stops actors from acting', () => {
        const disSystem = new System.Disability(['Stun', 'Paralysis']);
        const movSystem = new System.Movement(['Movement']);

        const walker = new SentientActor('walker');
        const level = RGUnitTests.wrapIntoLevel([walker]);
        RGUnitTests.moveEntityTo(walker, 2, 2);
        const movComp = new Component.Movement(level, 3, 3);
        movComp.setLevel(level);
        movComp.setXY(3, 3);
        walker.add(movComp);
        walker.add(new Component.Paralysis());

        updateSystems([disSystem, movSystem]);

        expect(walker.getX()).to.equal(2);
        expect(walker.getY()).to.equal(2);

        walker.remove('Paralysis');
        walker.add(movComp);
        updateSystems([disSystem, movSystem]);
        expect(walker.getX()).to.equal(3);
        expect(walker.getY()).to.equal(3);

        walker.add(new Component.Stun());
        movComp.setXY(5, 5);
        walker.add(movComp);
        updateSystems([disSystem, movSystem]);
        expect(walker.getX()).to.be.at.least(2);
        expect(walker.getY()).to.be.at.least(2);
        expect(walker.getX()).to.be.at.most(4);
        expect(walker.getY()).to.be.at.most(4);
    });
});


describe('System.Chat', () => {

    it('handles chat actions between player and NPC', () => {
        const chatter = new SentientActor('chatter');
        chatter.setIsPlayer(true);
        const coins = new Item.GoldCoin();
        coins.setCount(1000);
        chatter.getInvEq().addItem(coins);

        const trainer = new SentientActor('trainer');
        RGUnitTests.wrapIntoLevel([chatter, trainer]);
        const chatSys = new System.Chat(['Chat']);

        trainer.get('Stats').setAccuracy(20);

        const accBefore = chatter.get('Stats').getAccuracy();

        RGUnitTests.moveEntityTo(chatter, 1, 1);
        RGUnitTests.moveEntityTo(trainer, 2, 2);
        const chatComp = new Component.Chat();
        const args = {dir: [1, 1]};
        chatComp.setArgs(args);
        chatter.add(chatComp);

        const trainComp = new Component.Trainer();
        trainer.add(trainComp);

        updateSystems([chatSys]);

        const brain = chatter.getBrain() as BrainPlayer;
        expect(brain.isMenuShown()).to.equal(true);
        expect(chatter).not.to.have.component('Chat');

        const actionCb = brain.decideNextAction({code: ROT.VK_0});
        expect(brain.isMenuShown()).to.equal(false);

        actionCb();

        expect(chatter).to.have.accuracy(accBefore + 1);
    });
});

describe('System.SpiritBind', () => {
    it('is used to bind spirits into spirit gems', () => {
        const spiritSys = new System.SpiritBind(['SpiritBind']);

        const binder = new SentientActor('shaman');
        const spirit = new SentientActor('Evil spirit');
        spirit.setType('spirit');
        spirit.add(new Component.Ethereal());
        RGUnitTests.wrapIntoLevel([binder, spirit]);

        const gem = new Item.SpiritGem('Great gem');
        binder.getInvEq().addItem(gem);
        gem.useItem({target: spirit.getCell()});

        expect(gem).to.have.component('SpiritBind');
        expect(gem.hasSpirit()).to.equal(false);

        updateSystems([spiritSys]);

        expect(gem.hasSpirit()).to.equal(true);
        expect(gem).not.to.have.component('SpiritBind');
    });

    it('is used to bind gems into items', () => {
        const spiritSys = new System.SpiritBind(['SpiritBind']);
        const binder = new SentientActor('shaman');

        const spirit = new SentientActor('Evil spirit');
        spirit.setType('spirit');
        spirit.add(new Component.Ethereal());
        spirit.get('Stats').setStrength(10);

        const gem = new Item.SpiritGem('Great gem');
        gem.setSpirit(spirit);
        binder.getInvEq().addItem(gem);

        const sword = new Item.Weapon('sword');
        const cell = RGUnitTests.wrapObjWithCell(sword);

        expect(gem.getStrength()).to.equal(10);
        expect(RG.getItemStat('getStrength', gem)).to.equal(10);

        let items = binder.getInvEq().getInventory().getItems();
        // 1st attempt, no item binding skill
        gem.useItem({target: cell});
        updateSystems([spiritSys]);
        expect(sword).not.to.have.component('GemBound');
        expect(items).to.have.length(1);

        // 2nd attempt, crafting skill added
        binder.add(new Component.SpiritItemCrafter());
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
        const newSword = new FromJSON().createItem(json);

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
        const expirSys = new System.TimeEffects(['Expiration']);
        const entity = new Entity();
        const expComp = new Component.Expiration();
        expect(entity).not.to.have.component('StatsMods');
        const statsMods = new Component.StatsMods();
        expComp.addEffect(statsMods, 10);
        entity.add(statsMods);
        expect(entity).to.have.component('StatsMods');
        entity.add(expComp);

        (entity as any).getName = () => 'an entity';
        (entity as any).getCell = () => null;

        const statsMods2 = new Component.StatsMods();
        expComp.addEffect(statsMods2, 20);
        entity.add(statsMods2);
        let modsList = entity.getList('StatsMods');
        expect(modsList).to.have.length(2);

        const durComp = new Component.Duration();
        durComp.setDurationDie('8d1 + 4');
        const statsComp3 = new Component.StatsMods();
        statsComp3.setMagic(2);
        statsComp3.setWillpower(-2);
        durComp.setComp(statsComp3);
        const expComp2 = new Component.Expiration();
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
        const timeSys = new System.TimeEffects(['Expiration', 'Coldness']);
        const damageSystem = new System.Damage(['Damage']);

        const ghoul = new SentientActor('ghoul');
        const actor = new SentientActor('frozen');
        const bodyTemp = new Component.BodyTemp();
        bodyTemp.setTemp(-95);
        actor.add(bodyTemp);
        actor.get('Health').setHP(5);
        RGUnitTests.wrapIntoLevel([actor]);

        const expirComp = new Component.Expiration();
        const paralComp = new Component.Paralysis();
        paralComp.setSource(ghoul);
        expirComp.addEffect(paralComp, 15);
        actor.add(expirComp);
        actor.add(paralComp);

        actor.add(new Component.Coldness());

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
        const expSys = new System.ExpPoints(['ExpPoints']);
        const actor = new SentientActor('rogue');
        RGUnitTests.wrapIntoLevel([actor]);

        const compExp = actor.get('Experience');
        expect(compExp.getExp()).to.equal(0);
        for (let i = 1; i <= 4; i++) {
            actor.add(new Component.ExpPoints(i * 10));
        }

        updateSystems([expSys]);
        expect(compExp.getExp()).to.equal(100);
    });

});

describe('System.Skills', () => {
    it('it handles skill progression of actors', () => {
        const skillsSys = new System.Skills(['SkillsExp']);
        const entity = new SentientActor('rogue');
        RGUnitTests.wrapIntoLevel([entity]);

        const skillComp = new Component.Skills();
        entity.add(skillComp);

        const expComp = new Component.SkillsExp();
        expComp.setSkill('Melee');
        expComp.setPoints(10);
        entity.add(expComp);

        for (let i = 0; i < 3; i++) {
            const expCompSpells = new Component.SkillsExp();
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
        shopSys = new System.Shop(['Transaction']);
        shopkeeper = new SentientActor('shopkeeper');
        actor = new SentientActor('buyer');

        shopCell = new Cell(0, 0);
        shopCell.setBaseElem(ELEM.FLOOR);
        shopElem = new Element.ElementShop();
        shopCell.setProp(RG.TYPE_ELEM, shopElem);
        RGUnitTests.wrapIntoLevel([shopkeeper, actor]);

    });

    it('it handles buying transactions', () => {
        const item = new Item.Weapon('sword');
        item.setValue(100);
        item.add(new Component.Unpaid());
        shopCell.setProp(RG.TYPE_ITEM, item);
        const coins = new Item.GoldCoin(RG.GOLD_COIN_NAME);
        coins.setCount(100);

        const buyer = actor;
        buyer.getInvEq().addItem(coins);

        const trans = new Component.Transaction();
        trans.setArgs({
            item, buyer, seller: shopkeeper, shop: shopElem
        });
        buyer.add(trans);

        updateSystems([shopSys]);
        expect(item.has('Unpaid'), 'Item not unpaid').to.equal(false);
    });

    it('handles selling transactions', () => {
        const item = new Item.Weapon('sword');
        item.setValue(100);

        const coins = new Item.GoldCoin(RG.GOLD_COIN_NAME);
        coins.setCount(100);
        shopkeeper.getInvEq().addItem(coins);

        const seller = actor;
        seller.getInvEq().addItem(item);

        const trans = new Component.Transaction();
        trans.setArgs({
            item, buyer: shopkeeper, seller, shop: shopElem
        });
        seller.add(trans);

        updateSystems([shopSys]);

        const cell = seller.getCell();
        expect(cell.getItems()[0]).to.have.component('Unpaid');
    });

    it('works with item count > 1', () => {
        const arrows = new Item.Ammo('arrow');
        arrows.setCount(15);
        arrows.setValue(20);

        const coins = new Item.GoldCoin(RG.GOLD_COIN_NAME);
        coins.setCount(100);
        shopkeeper.getInvEq().addItem(coins);

        const seller = actor;
        seller.getInvEq().addItem(arrows);

        const trans = new Component.Transaction();
        trans.setArgs({
            item: arrows, buyer: shopkeeper, seller, shop: shopElem, count: 10
        });
        seller.add(trans);

        updateSystems([shopSys]);
        expect(arrows.getCount()).to.equal(5);

        const soldCell = seller.getCell();
        const items = soldCell.getItems();
        expect(items.length).to.equal(1);
        expect(items[0].getCount()).to.equal(10);
        expect(arrows).not.to.have.component('Unpaid');
        expect(items[0]).to.have.component('Unpaid');
    });

});

describe('System.Event', () => {
    it('It responds to entities with Component.Event', () => {
        const eventSys = new System.Events(['Event']);
        const actor = new SentientActor('killed one');
        const killer = new SentientActor('killer');
        const clueless = new SentientActor('clueless');

        const player = new SentientActor('player hero');
        player.setIsPlayer(true);

        const actors = [actor, killer, clueless, player];
        const level = RGUnitTests.wrapIntoLevel(actors);
        RGUnitTests.moveEntityTo(actor, 2, 2);
        RGUnitTests.moveEntityTo(player, 2, 3);
        RGUnitTests.moveEntityTo(killer, 3, 3);
        RGUnitTests.moveEntityTo(clueless, 5, 5);
        eventSys.addLevel(level, 2);

        const evt = new Component.Event();
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
        const areaSys = new System.AreaEffects(['Flame']);
        const damageSystem = new System.Damage(['Damage']);
        const systems = [areaSys, damageSystem];

        const burntActor = new SentientActor('victim');
        RGUnitTests.wrapIntoLevel([burntActor]);

        const flameEnt = new SentientActor('flame');
        const health = burntActor.get('Health');

        while (!health.isDead()) {
            const fireComp = new Component.Flame();
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


describe('System.BaseAction', () => {
    it('handles logic to pickup items', () => {
        const sysBaseAction = new System.BaseAction(['Pickup']);
        const level = Factory.createLevel('arena', 20, 20);

        const factActor = new FactoryActor();
        const actor = factActor.createPlayer('Player', {});
        const inv = actor.getInvEq().getInventory();
        const weapon = new Item.Weapon('weapon');

        expect(level.addItem(weapon, 2, 4)).to.equal(true);
        expect(level.addActor(actor, 2, 4)).to.equal(true);

        // After picking up, cell must not have item anymore
        const cell = level.getMap().getCell(2, 4);
        expect(cell.hasProp('items')).to.equal(true);
        level.pickupItem(actor);
        sysBaseAction.update();
        expect(cell.hasProp('items')).to.equal(false);

        const invItems = inv.getItems();
        expect(invItems[0]).to.equal(weapon);
        expect(actor.getInvEq().equipItem(weapon)).to.equal(true);
        expect(inv.isEmpty()).to.equal(true);
    });
});

