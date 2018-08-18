
const RG = require('../../../client/src/battles');
const RGObjects = require('../../../client/data/battles_objects.js');
const RGTest = require('../../roguetest.js');

const Effects = require('../../../client/data/effects.js');

const chai = require('chai');
const chaiBattles = require('../../helpers/chai-battles.js');

const expect = chai.expect;
chai.use(chaiBattles);

const Parser = RG.ObjectShell.Parser;
const Creator = RG.ObjectShell.Creator;

const Actor = RG.Actor.Rogue;

RG.cellRenderArray = RG.cellRenderVisible;

const wolfShell = {
    name: 'wolf', attack: 15, defense: 10, damage: '1d6 + 2',
    hp: 9
};

//---------------------------------------------------------------------------
// PARSER TESTS
//---------------------------------------------------------------------------

describe('RG.ObjectShell.Parser', () => {

    it('Returns base objects and supports also base', () => {
        const parser = new Parser();
        const wolfNew = parser.parseObjShell('actors', wolfShell);
        expect(wolfNew.attack).to.equal(15);
        expect(wolfNew.defense).to.equal(10);

        const wolves = parser.dbGet({categ: 'actors', danger: 3});
        expect(wolves.hasOwnProperty('superwolf')).to.equal(false);

        const superWolf = parser.parseObjShell('actors', {
            name: 'superwolf', base: 'wolf', defense: 20,
            damage: '2d6 + 3', danger: 3
        });
        expect(superWolf.attack).to.equal(15);
        expect(superWolf.defense).to.equal(20);

        const objWolf = parser.dbGet({name: 'wolf'})[0];
        expect(objWolf).to.equal(wolfNew);

        const wolfPack = parser.dbGet({categ: 'actors', danger: 3});
        expect(wolfPack.hasOwnProperty('superwolf')).to.equal(true);
        const wolf1 = wolfPack['superwolf'];
        expect(wolf1).to.equal(superWolf);

        // Create a reference actor
        const wolfObj = new Actor('wolf');
        wolfObj.setType('wolf');
        wolfObj.get('Combat').setAttack(15);
        wolfObj.get('Combat').setDefense(10);
        wolfObj.get('Combat').setDamageDie('1d6 + 2');
        wolfObj.get('Health').setHP(9);
        const wolfComp = wolfObj.get('Combat');

        // Create actor using parsed shell data
        const createdWolf = parser.createActualObj('actors', 'wolf');
        const cWolfComp = createdWolf.get('Combat');
        expect(cWolfComp.getAttack()).to.equal(wolfComp.getAttack());
        expect(cWolfComp.getDefense()).to.equal(wolfComp.getDefense());
        expect(createdWolf.getType()).to.equal(wolfObj.getType());

        RGTest.expectEqualHealth(createdWolf, wolfObj);

        const player = RG.FACT.createPlayer('player', {});
        const cell = RG.FACT.createFloorCell();
        cell.setProp('actors', player);
        cell.setExplored(true);

        const actorChar = RG.charStyles.actors.player;
        expect(RG.getCellChar(cell)).to.equal(actorChar);

        const randWolf = parser.createRandomActor({danger: 3});
        expect(randWolf !== null).to.equal(true);
        expect(randWolf.get('Combat').getAttack()).to.equal(superWolf.attack);

        const punyWolf = parser.parseObjShell('actors', {name: 'Puny wolf',
            base: 'wolf', attack: 1, defense: 50}
        );
        expect(punyWolf.attack).to.equal(1);

        const punyWolfCreated = parser.createRandomActor({
            func: function(actor) {return actor.attack < 2;}
        });
        expect(punyWolfCreated.get('Combat').getDefense()).to.equal(50);
        expect(punyWolfCreated.get('Combat').getAttack()).to.equal(1);

    });

    it('can create actors in constrained-random manner', () => {
        const parser = new Parser();
        const wolf = Object.assign({}, wolfShell);
        wolf.type = 'animal';
        wolf.danger = 2;
        parser.parseObjShell(RG.TYPE_ACTOR, wolf);

        let func = actor => (actor.danger <= 1 && actor.type === 'animal');
        expect(parser.createRandomActor({func})).to.be.null;

        let wolfObj = null;
        func = actor => (actor.danger <= 2 && actor.type === 'animal');
        wolfObj = parser.createRandomActor({func});
        expect(wolfObj).not.to.be.empty;

    });

    it('Parses Spirits/Gems and creates them correctly', () => {
        const parser = new Parser();
        const spiritShell = {
            name: 'Wolf spirit', type: 'spirit',
            strength: 0, accuracy: 0, agility: 1, willpower: 0, power: 1,
            danger: 1, addComp: ['Ethereal']
        };
        const spiritNew = parser.parseObjShell('actors', spiritShell);
        expect(spiritNew.strength).to.equal(0);
        expect(spiritNew.agility).to.equal(1);

        const spiritObj = parser.createActualObj('actors', 'Wolf spirit');
        expect(spiritObj.has('Ethereal')).to.equal(true);
        expect(spiritObj.has('Stats')).to.equal(true);

        const gemShell = {name: 'Lesser gem', value: 40, type: 'spiritgem'};
        const newGem = parser.parseObjShell('items', gemShell);
        expect(newGem.name).to.equal('Lesser gem');
        const gemObj = parser.createActualObj('items', 'Lesser gem');
        expect(gemObj.getValue()).to.equal(40);
    });

    it('can add inventory items into the created actors', () => {
        const parser = new Parser();
        const goblin = parser.parseObjShell('actors', {
            name: 'goblin', attack: 15, defense: 10, damage: '1d6 + 2',
            hp: 9, inv: ['sword'], loot: 'Healing potion'
        });
        expect(goblin.inv).to.have.length(1);
        expect(goblin.loot).to.equal('Healing potion');

        const sword = parser.parseObjShell(RG.TYPE_ITEM, {
            name: 'sword', type: 'weapon'
        });
        expect(sword).to.exist;
        const potion = parser.parseObjShell(RG.TYPE_ITEM, {
            name: 'Healing potion', type: 'potion'
        });
        expect(potion).to.exist;

        const goblinObj = parser.createActualObj(RG.TYPE_ACTOR, 'goblin');

        expect(goblinObj.has('Loot'),
            'Goblin should have loot component').to.be.true;

        const inv = goblinObj.getInvEq().getInventory();
        expect(inv.getItems()).to.have.length(1);

    });

    it('can add equipped items into the created actors', () => {
        const parser = new Parser();
        const goblin = parser.parseObjShell('actors', {
            name: 'goblin', attack: 15, defense: 10, damage: '1d6 + 2',
            hp: 9, equip: ['sword']
        });
        expect(goblin.equip).to.have.length(1);
        parser.parseObjShell(RG.TYPE_ITEM, {
            name: 'sword', type: 'weapon', damage: '1d1'
        });
        const actualGoblin = parser.createActualObj(RG.TYPE_ACTOR, 'goblin');

        const eqSword = actualGoblin.getWeapon();
        expect(eqSword).to.exist;
        expect(eqSword.getType()).to.equal('weapon');

    });

    it('can add inventory items with count into the created actors', () => {
        const parser = new Parser();
        const keeperShell = {
            name: 'shopkeeper', char: '@', hp: 50,
            attack: 10, defense: 10, damage: '3d3',
            danger: 6, inv: [{name: 'Gold coin', count: 100}]
        };
        const goldCoinShell = {name: 'Gold coin', type: 'goldcoin'};
        expect(parser.parseObjShell(RG.TYPE_ITEM, goldCoinShell))
            .not.to.be.empty;
        const keeper = parser.parseObjShell(RG.TYPE_ACTOR, keeperShell);
        expect(keeper.inv).to.deep.equal([{name: 'Gold coin', count: 100}]);
        const keeperObj = parser.createActualObj(RG.TYPE_ACTOR, 'shopkeeper');

        const gold = keeperObj.getInvEq().getInventory().getItems()[0];
        expect(gold.count, 'Keeper has 100 gold coins').to.equal(100);
    });

    describe('addComponent(shell, newObj)', () => {
        it('can add component with a string attribute', () => {
            const creator = new Creator();
            const parser = new Parser();
            const bat = {name: 'bat', addComp: 'Flying'};
            const shell = parser.parseObjShell(RG.TYPE_ACTOR, bat);
            const batActor = new RG.Actor.Rogue('bat');

            creator.addComponent(shell, batActor);
            expect(batActor.has('Flying')).to.equal(true);
        });

    });

describe('How food items are created from objects', () => {
   const parser = new Parser();
    it('Creates food objects items from shells', () => {
        const foodBase = parser.parseObjShell('items',
            {type: 'food', name: 'foodBase',
            weight: 0.1, misc: 'XXX', dontCreate: true, char: '%',
            className: 'cell-item-food'});

        const food = parser.parseObjShell('items',
            {base: 'foodBase', name: 'Dried meat',
            energy: 100, value: 5
        });

        expect(food.name).to.equal('Dried meat');
        expect(food.energy).to.equal(100);
        expect(food.value).to.equal(5);
        expect(food.type).to.equal('food');
        expect(food.weight).to.equal(foodBase.weight);
        expect(food.char).to.equal('%');
        expect(food.className).to.equal('cell-item-food');

        const expFood = parser.parseObjShell('items',
            {name: 'Gelee', energy: 500,
            weight: 0.2, value: 100, base: 'foodBase'});

        const geleeObj = parser.dbGet({name: 'Gelee'})[0];
        expect(geleeObj.char).to.equal('%');
        expect(geleeObj.value).to.equal(expFood.value);

        const items = parser.dbGet({categ: 'items'});
        expect(Object.keys(items).length).to.equal(2);

        const randFood = parser.createRandomItem({
            func: function(item) {return item.value <= 5;}
        });

        expect(randFood.getEnergy()).to.equal(100);
        expect(randFood.getValue()).to.equal(5);
        RGTest.checkChar(randFood, '%');
        RGTest.checkCSSClassName(randFood, 'cell-item-food');

        const geleeFood = parser.createRandomItem({
            func: function(item) {return item.value >= 99;}
        });
        expect(geleeFood.getEnergy()).to.equal(500);
        expect(geleeFood.getType()).to.equal('food');
        RGTest.checkChar(geleeFood, '%');

    });
});

//---------------------------------------------------------------------------
// PARSING THE FULL OBJECTS FILE
//---------------------------------------------------------------------------

describe('It contains all game content info', () => {

    let parser = null;
    before(() => {
        parser = new Parser();
        parser.parseShellData(Effects);
        parser.parseShellData(RGObjects);
    });

    it('Should parse all actors properly', () => {
        const rsnake = parser.get('actors', 'rattlesnake');
        expect(rsnake.poison).to.exist;
        const coyote = parser.get('actors', 'coyote');
        expect(coyote.attack).to.equal(3);
        expect(coyote.danger).to.equal(2);

        const rat = parser.get('actors', 'rat');
        expect(rat.hp).to.equal(5);
        const ratObj = parser.createActualObj('actors', 'rat');
        expect(ratObj.getName()).to.equal('rat');
        expect(ratObj.getType()).to.equal('animal');
        expect(ratObj.get('Health').getHP()).to.equal(5);
        expect(ratObj.get('Health').getMaxHP()).to.equal(5);
        expect(ratObj.get('Combat').getAttack()).to.equal(1);
        expect(ratObj.get('Combat').getDefense()).to.equal(1);
        expect(ratObj.get('Stats').getSpeed()).to.equal(100);
        RGTest.checkChar(ratObj, 'r');
        RGTest.checkCSSClassName(ratObj, 'cell-actor-animal');

    });

    it('Should parse all items properly', () => {
        const bayShell = parser.get('items', 'Bayonette');
        expect(bayShell.base).to.equal('MeleeWeaponBase');
        const bayon = parser.createActualObj('items', 'Bayonette');
        expect(bayon.has('Physical')).to.equal(true);
        RGTest.checkCSSClassName(bayon, 'cell-item-melee-weapon');
    });

    it('Should parse weapons properly', () => {
        const rubySwordShell = parser.get('items', 'Ruby glass sword');
        const rubySwordObj = parser.createActualObj('items',
            'Ruby glass sword');
        expect(rubySwordShell.attack).to.equal(rubySwordObj.getAttack());
    });

    it('Should parse all armour properly', () => {
        const larmour = parser.get('items', 'Leather armour');
        expect(larmour.defense).to.equal(2);

        const armObj = parser.createActualObj('items', 'Leather armour');
        expect(armObj.getArmourType()).to.equal('chest');
        expect(armObj.getAttack()).to.equal(0);
        expect(armObj.getDefense()).to.equal(2);
        expect(armObj.getWeight()).to.equal(2.0);
    });

    it('Should parse missiles with correct ranges', () => {
        const missObj = parser.createActualObj('items', 'Shuriken');
        expect(missObj.getAttackRange()).to.equal(3);
        expect(missObj.getWeight()).to.equal(0.1);
    });

    it('should parse/create missile weapons and ammo', () => {
        const rifle = parser.createActualObj('items', 'Rifle');
        const bullet = parser.createActualObj('items', 'Steel bullet');

        expect(rifle.getAttackRange()).to.equal(7);
        expect(bullet.getAttackRange()).to.equal(1);

    });

    it('Parses/creates spirits/gems properly', () => {
        const demonSpirit = parser.createActualObj('actors',
            'Winter demon spirit');
        expect(demonSpirit.has('Stats')).to.equal(true);
        expect(demonSpirit.get('Stats').getStrength()).to.equal(3);

        // const spiritGem =
    });

    it('Can generate actors using weighted algorithms', () => {
        let newActor = parser.createRandomActorWeighted(1, 1);
        expect(RG.isNullOrUndef([newActor])).to.equal(false);

        newActor = parser.createRandomActorWeighted(1000);
        // expect(RG.isNullOrUndef([newActor])).to.equal(false);
    });

    it('Creates healing potion correctly with useItem attribute', () => {
        const healPotion = parser.createActualObj('items', 'Healing potion');
        expect(healPotion).to.have.property('useFuncs');
        expect(healPotion).to.have.property('useItem');
        expect(healPotion).to.have.property('useArgs');
        expect(healPotion.useArgs).to.have.property('hp');
        expect(healPotion.useArgs.hp).to.equal('3d4');

        RG.suppressErrorMessages = true;
        healPotion.useItem({});
        RG.suppressErrorMessages = false;

        const venom = parser.createActualObj('items', 'Potion of venom');
        expect(venom).to.have.property('useItem');
        expect(venom).to.have.property('useArgs');

    });

    it('Creates a proper pickaxe with digger capability', () => {
        const cell = RG.FACT.createWallCell();
        const pickaxe = parser.createActualObj('items', 'Pick-axe');
        expect(pickaxe).to.have.property('useItem');

        const digger = new RG.Actor.Rogue('Dwarf');
        digger.getInvEq().addItem(pickaxe);
        expect(cell.getBaseElem().getType()).to.equal('wall');
        pickaxe.useItem({target: cell});
        expect(digger).to.have.component('UseItem');
    });

    it('can create gold coins', () => {
        const goldcoin = parser.createActualObj(RG.TYPE_ITEM, 'Gold coin');
        expect(goldcoin.getName()).to.equal('Gold coin');
        RGTest.checkChar(goldcoin, '$');
        RGTest.checkCSSClassName(goldcoin, 'cell-item-gold-coin');
    });

    it('can create stat-boosting potions', () => {
        const potion = parser.createItem('Potion of agility');
        const user = new RG.Actor.Rogue('user');
        user.getInvEq().addItem(potion);
        const cell = RGTest.wrapObjWithCell(user);
        // const agil = user.get('Stats').getAgility();
        potion.useItem({target: cell});
        expect(user).to.have.component('UseItem');
    });

    it('suppors multiple base shells', () => {
        const parser = new Parser();
        const b1 = {name: 'base1', hp: 10, damage: 10};
        const b2 = {name: 'base2', hp: 15, defense: 20};
        const shell = {name: 'shell', base: ['base2', 'base1']};

        parser.parseObjShell('actors', b1);
        parser.parseObjShell('actors', b2);
        const objShell = parser.parseObjShell('actors', shell);

        expect(objShell.damage).to.equal(10);
        expect(objShell.hp).to.equal(15);
        expect(objShell.defense).to.equal(20);
    });

    it('creates actors with type', () => {
        const miner = parser.createActor('miner');
        expect(miner.getType()).to.equal('human');
        const json = miner.toJSON();
        expect(json.type).to.equal('human');
    });

    it('can create actors with equipped items with count', () => {
        const goblinSlinger = parser.createActor('goblin slinger');
        const inv = goblinSlinger.getInvEq();
        const rocks = inv.getEquipped('missile');
        expect(rocks.count).to.equal(10);
    });

    it('can add enemies for actors', () => {
        const goblin = parser.createActor('goblin');
        const fighter = parser.createActor('fighter');
        let mem = goblin.getBrain().getMemory();
        expect(mem.isEnemy(fighter)).to.equal(true);

        const goblinSlinger = parser.createActor('goblin slinger');
        mem = goblinSlinger.getBrain().getMemory();
        expect(mem.isEnemy(fighter)).to.equal(true);
    });

    it('also supports non-random shells', () => {
        const bossShell = {
            name: 'Unique boss', noRandom: true,
            danger: 2
        };
        const boss = parser.parseObjShell(RG.TYPE_ACTOR, bossShell);
        expect(boss.noRandom).to.equal(true);
        const bossObj = parser.createActor('Unique boss');
        expect(bossObj.getName()).to.equal('Unique boss');
    });
});

describe('Data query functions for objects', function() {

    let parser = null;
    before(() => {
        parser = new Parser();
        parser.parseShellData(Effects);
        parser.parseShellData(RGObjects);
    });

    it('can filter query with category/function', () => {
        const actor = parser.dbGet({name: 'Winter demon'});
        expect(actor[0].name).to.equal('Winter demon');

        const items = parser.dbGet({categ: 'items'});
        expect(Object.keys(items)).to.have.length.above(10);

    });

    it('can return objects randomly based on constraints', () => {
        const actors = parser.dbGetRand({categ: 'actors', danger: 2});
        expect(actors.danger).to.equal(2);

        for (let i = 1; i < 20; i++) {
            let maxLimit = i % 10;
            if (maxLimit <= 1) {
                ++maxLimit;
            }
            const actor = parser.createRandomActorWeighted(1, maxLimit);
            if (actor !== null) {
                expect(actor.get('Experience').getDanger())
                    .to.be.below(maxLimit + 2);
            }
        }
    });

    it('can create flying actors', () => {
        const flying = ['bat', 'hawk', 'eagle', 'black vulture'];
        flying.forEach(name => {
            const flyEnt = parser.createActualObj(RG.TYPE_ACTOR, name);
            expect(flyEnt.has('Flying'), `${name} has Flying`).to.equal(true);
            const actor = flyEnt.getBrain().getActor();
            expect(flyEnt).to.deep.equal(actor);
            expect(actor.has('Flying'), `${name} has Flying`).to.equal(true);

        });

    });

    it('can create venomous actors', () => {
        const viper = parser.createActualObj(RG.TYPE_ACTOR, 'Frost viper');
        expect(viper.has('AddOnHit')).to.equal(true);

        const addOnHit = viper.get('AddOnHit');
        expect(addOnHit.getComp().getType()).to.equal('Poison');
    });

    it('can create spellcasters', () => {
        const cryomancer = parser.createActor('Cryomancer');
        expect(cryomancer.has('SpellPower')).to.equal(true);
        expect(cryomancer.get('SpellPower').getPP()).to.equal(21);
        expect(cryomancer.get('SpellPower').getMaxPP()).to.equal(22);

        const spellbook = cryomancer.getBook();
        expect(spellbook.getSpells()).to.have.length(1);
    });

    it('can create actors with different actorTypes', () => {
        const fireActor = parser.createActor('Fire');
        expect(fireActor.getBrain().getType()).to.equal('Flame');
        expect(fireActor).not.to.have.component('Stats');
        expect(fireActor).not.to.have.component('Health');
        expect(fireActor).not.to.have.component('Experience');
        expect(fireActor).to.have.component('Ethereal');
        expect(fireActor).to.have.component('NonSentient');
        expect(fireActor).to.have.component('Damaging');
        const damaging = fireActor.get('Damaging');
        expect(damaging.getDamageType()).to.equal(RG.DMG.FIRE);

        const flameActor = parser.createActor('Ice flame');
        expect(flameActor.getBrain().getType()).to.equal('Flame');
        expect(flameActor).to.have.component('Damaging');
        const damagingIce = flameActor.get('Damaging');
        expect(damagingIce.getDamageType()).to.equal(RG.DMG.ICE);
    });

    it('can create actors with addOnHit capabilites for any component', () => {
        const wraith = parser.createActor('wraith');
        expect(wraith).to.have.component('AddOnHit');

        const addOnHit = wraith.get('AddOnHit');
        const addedComp = addOnHit.getComp();
        expect(addedComp.getType()).to.equal('Duration');

        const statsComp = addedComp.getComp();
        expect(statsComp.getType()).to.equal('StatsMods');
        expect(statsComp.getStrength()).to.equal(-1);

        const json = addOnHit.toJSON();

        const fromJSON = new RG.Game.FromJSON();
        const newAddOnHitComp = fromJSON.createComponent('AddOnHit', json);
        expect(newAddOnHitComp.getType()).to.equal('AddOnHit');

        const newDurComp = newAddOnHitComp.getComp();
        expect(newDurComp.getType()).to.equal('Duration');
        const newStatsComp = newDurComp.getComp();
        expect(newStatsComp.getType()).to.equal('StatsMods');
        expect(newStatsComp.getStrength()).to.equal(-1);

        expect(newAddOnHitComp.toJSON()).to.deep.equal(json);

        let newDurClone = newDurComp.clone();
        expect(newDurClone.getID()).not.to.equal(newDurComp.getID());

        const victim = new RG.Actor.Rogue('victim');
        expect(victim).not.to.have.component('StatsMods');

        victim.add(newDurClone);
        expect(victim).to.have.component('StatsMods');
        expect(victim).to.have.component('Duration');
        victim.remove('StatsMods');
        expect(victim).to.have.component('Duration');
        victim.remove('Duration');
        expect(victim).not.to.have.component('StatsMods');

        newDurClone = newDurComp.clone();
        victim.add(newDurClone);
        let victimJSON = victim.toJSON();
        let newVictim = fromJSON.createActor(victimJSON);
        fromJSON.restoreEntityData();

        expect(newVictim).to.have.component('Duration');
        expect(newVictim).to.have.component('StatsMods');
        expect(newVictim.getList('Duration')).to.have.length(1);
        expect(newVictim.getList('StatsMods')).to.have.length(1);

        newDurClone = newDurComp.clone();
        newVictim.add(newDurClone);
        expect(newVictim.getList('Duration')).to.have.length(2);
        expect(newVictim.getList('StatsMods')).to.have.length(2);

        victimJSON = newVictim.toJSON();
        newVictim = fromJSON.createActor(victimJSON);
        fromJSON.restoreEntityData();
        expect(newVictim.getList('Duration')).to.have.length(2);
        expect(newVictim.getList('StatsMods')).to.have.length(2);
    });

    it('can create firemaking kits and other tools', () => {
        const firekit = parser.createEntity('firemaking kit');
        expect(firekit).to.have.property('useItem');
        const level = RG.FACT.createLevel('arena', 20, 20);
        const cell = level.getMap().getCell(1, 1);
        const fireStarter = new RG.Actor.Rogue('firestarted');
        level.addActor(fireStarter, 1, 2);
        fireStarter.getInvEq().addItem(firekit);

        firekit.useItem({target: cell});

        expect(fireStarter).to.have.component('UseItem');

        const clonedKit = firekit.clone();
        expect(clonedKit.useArgs).to.exist;
        expect(clonedKit.useItem).to.be.a.function;

    });

    it('can create runes', () => {
        const runeProt = parser.createEntity('rune of protection');
        expect(runeProt).to.have.property('useItem');
        expect(runeProt).to.have.property('useArgs');
        console.log(runeProt.useArgs);
        expect(runeProt.useArgs).to.have.property('setters');
    });

    it('can create actors with components and their values set', () => {
        const avianEmperor = parser.createActor('avian emperor');
        const bypass = avianEmperor.get('BypassProtection');
        expect(bypass.getChance()).to.equal(0.15);

        expect(avianEmperor).to.have.component('Flying');
    });

    it('can create forcefield with HP', () => {
        const forcefield = parser.createActor('Forcefield');
        expect(forcefield).to.have.component('Health');

        const hComp = forcefield.get('Health');
        expect(hComp.getHP()).to.be.above(0);

        expect(forcefield).to.have.component('Weakness');
        const weakness = forcefield.get('Weakness');
        expect(weakness.getEffect()).to.equal(RG.DMG.MAGIC);
        expect(weakness.getLevel()).to.equal(RG.WEAKNESS.FATAL);
    });
});

describe('ObjectShell.Parser error handling', () => {
    it('It should detect invalid object shells', () => {
        const parser = new Parser();
        RG.suppressErrorMessages = true;
        const noObj = parser.createActualObj('items', 'Void Item');
        expect(noObj).to.be.null;
        RG.suppressErrorMessages = true;

        const invalidShell = {xxx: 'xxx', noname: 'noname'};
        expect(parser.validShellGiven(invalidShell)).to.be.false;
    });
});

}); // describe ObjectShell.Parser
