
import RG from '../../../client/src/rg';
import chai from 'chai';

import {Objects} from '../../../client/data/battles_objects';
import {RGTest} from '../../roguetest';
import {RGUnitTests} from '../../rg.unit-tests';
import {Effects} from '../../../client/data/effects';
import {ItemGen} from '../../../client/data/item-gen';
import {chaiBattles} from '../../helpers/chai-battles';
import {SentientActor } from '../../../client/src/actor';
import {ObjectShell} from '../../../client/src/objectshellparser';
import {ObjectShellComps} from '../../../client/src/objectshellcomps';
import {FactoryActor} from '../../../client/src/factory.actors';
import {FactoryLevel} from '../../../client/src/factory.level';
import {FactoryBase as Factory} from '../../../client/src/factory';
import {FromJSON} from '../../../client/src/game.fromjson';
import {Random} from '../../../client/src/random';
import {Dice} from '../../../client/src/dice';

type Level = import('../../../client/src/level').Level;

const expect = chai.expect;
chai.use(chaiBattles);

const Parser = ObjectShell.Parser;
const Creator = ObjectShell.Creator;

const Actor = SentientActor;
RG.cellRenderArray = RG.cellRenderVisible;

const wolfShell = {
    name: 'wolf', attack: 15, defense: 10, damage: '1d6 + 2',
    hp: 9
};

const factLevel = new FactoryLevel();

const seed = Date.now();
//const seed = 1596399820349;
Random.getRNG().setSeed(seed);
// game.setRNG(Random.getRNG());
console.log('Using seed', seed);
Dice.RNG.setSeed(seed);

//---------------------------------------------------------------------------
// PARSER TESTS
//---------------------------------------------------------------------------

describe('ObjectShell.Parser', () => {

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

        const objWolf = parser.dbGetActor({name: 'wolf'});
        expect(objWolf).to.equal(wolfNew);

        const wolfPack = parser.dbGet({categ: 'actors', danger: 3});
        expect(wolfPack.hasOwnProperty('superwolf')).to.equal(true);
        const wolf1 = wolfPack.superwolf;
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

        const player = new FactoryActor().createPlayer('player', {});
        const cell = new Factory().createFloorCell();
        cell.setProp('actors', player);
        cell.setExplored(true);

        expect(RG.getCellChar(cell)).to.match(/[@X]/);

        const randWolf = parser.createRandomActor({danger: 3});
        expect(randWolf !== null).to.equal(true);
        expect(randWolf.get('Combat').getAttack()).to.equal(superWolf.attack);

        const punyWolf = parser.parseObjShell('actors', {name: 'Puny wolf',
            base: 'wolf', attack: 1, defense: 50}
        );
        expect(punyWolf.attack).to.equal(1);

        const punyWolfCreated = parser.createRandomActor({
            func(actor) {return actor.attack < 2;}
        });
        expect(punyWolfCreated.get('Combat').getDefense()).to.equal(50);
        expect(punyWolfCreated.get('Combat').getAttack()).to.equal(1);

    });

    it('can create actors in constrained-random manner', () => {
        const parser = new Parser();
        const wolf: any = Object.assign({}, wolfShell);
        wolf.type = 'animal';
        wolf.danger = 2;
        parser.parseObjShell(RG.TYPE_ACTOR, wolf);

        let func = actor => (actor.danger <= 1 && actor.type === 'animal');
        expect(parser.createRandomActor({func})).to.equal(null);

        let wolfObj = null;
        func = actor => (actor.danger <= 2 && actor.type === 'animal');
        wolfObj = parser.createRandomActor({func});
        expect(wolfObj).to.be.an.instanceof(SentientActor);

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
        expect(sword.name).to.equal('sword');
        const potion = parser.parseObjShell(RG.TYPE_ITEM, {
            name: 'Healing potion', type: 'potion'
        });
        expect(potion.name).to.equal('Healing potion');

        const goblinObj = parser.createActualObj(RG.TYPE_ACTOR, 'goblin');

        expect(goblinObj.has('Loot'),
            'Goblin should have loot component').to.equal(true);

        const inv = goblinObj.getInvEq().getInventory();
        expect(inv.getItems()).to.have.length(1);

    });

    it('can add equipped items into the created actors', () => {
        const parser = new Parser();
        const goblinShell = {
            name: 'goblin', attack: 15, defense: 10, damage: '1d6 + 2',
            hp: 9, equip: ['sword']
        };
        const goblin = parser.parseObjShell('actors', goblinShell);
        expect(goblin.equip).to.have.length(1);
        parser.parseObjShell(RG.TYPE_ITEM, {
            name: 'sword', type: 'weapon', damage: '1d1'
        });
        const actualGoblin = parser.createActualObj(RG.TYPE_ACTOR, 'goblin');

        const eqSword = actualGoblin.getWeapon();
        expect(eqSword).to.exist;
        expect(eqSword.getType()).to.equal('weapon');

        // Check to competing equips
        goblinShell.equip.push('sword');
        goblinShell.name = 'goblin2';
        const goblin2 = parser.parseObjShell('actors', goblinShell);
        expect(goblin2.equip).to.have.length(2);

        const actualGoblin2 = parser.createActor('goblin2');
        const eq2Sword = actualGoblin2.getWeapon();
        expect(eq2Sword.getType()).to.equal('weapon');

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
        expect(gold.getCount(), 'Keeper has 100 gold coins').to.equal(100);
    });

    it('can add component with a string attribute', () => {
        const creator = new Creator();
        const parser = new Parser();
        const bat = {name: 'bat', addComp: 'Flying'};
        const shell = parser.parseObjShell(RG.TYPE_ACTOR, bat);
        const batActor = new SentientActor('bat');

        const compGen = new ObjectShellComps();
        compGen.addComponents(shell, batActor);
        expect(batActor).to.have.component('Flying');

        compGen.addComponents({addComp: ['Flying', 'FirstStrike']},
            batActor);
        expect(batActor).to.have.component('FirstStrike');
        expect(batActor).to.have.component('Flying');
    });

    it('Creates food objects items from shells', () => {
        const parser = new Parser();
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

        const geleeObj = parser.dbGetItem({name: 'Gelee'});
        expect(geleeObj.char).to.equal('%');
        expect(geleeObj.value).to.equal(expFood.value);

        const items = parser.dbGet({categ: 'items'});
        expect(Object.keys(items).length).to.equal(2);

        const randFood = parser.createRandomItem({
            func(item) {return item.value <= 5;}
        });

        expect(randFood.getEnergy()).to.equal(100);
        expect(randFood.getValue()).to.equal(5);
        RGUnitTests.checkChar(randFood, '%');
        RGUnitTests.checkCSSClassName(randFood, 'cell-item-food');

        const geleeFood = parser.createRandomItem({
            func(item) {return item.value >= 99;}
        });
        expect(geleeFood.getEnergy()).to.equal(500);
        expect(geleeFood.getType()).to.equal('food');
        RGUnitTests.checkChar(geleeFood, '%');

    });

    it('can create elements from object shells', function() {
        const parser = new Parser();
        const waterShell = parser.parseObjShell(RG.TYPE_ELEM, {
            name: 'water', char: '~', className: 'cell-element-water'
        });
        expect(waterShell).to.not.be.empty;

        const waterElem = parser.createElement('water');
        expect(waterElem).to.not.be.empty;
        expect(waterElem.getName()).to.equal('water');
        RGUnitTests.checkChar(waterElem, '~');
        RGUnitTests.checkCSSClassName(waterElem, 'cell-element-water');

        parser.parseShellCateg(RG.TYPE_ELEM, Objects.elements);
        Objects.elements.forEach(shell => {
            if (shell.dontCreate !== true) {
                const elem = parser.createElement(shell.name);
                expect(elem.getName()).to.equal(shell.name);

                // Check conditional chars and normal chars
                if (typeof shell.char === 'object') {
                    let shellChar = '';
                    Object.keys(shell.char).forEach((key: string) => {
                        const funcName = key;
                        if (elem[funcName] && elem[funcName]()) {
                            shellChar = shell.char[key];
                        }
                        else if (shellChar === '' && key === 'default') {
                            shellChar = shell.char.default;
                        }
                    });
                    RGUnitTests.checkChar(elem, shellChar);
                }
                else {
                    RGUnitTests.checkChar(elem, shell.char);
                }
                RGUnitTests.checkCSSClassName(elem, shell.className);
            }

        });
    });

    it('supports also random specifications', () => {
        const addCompRand = ['Ethereal', {random: ['EagleEye', 
            'DoubleShot']}
        ];
        const archer = {name: 'archer', addComp: addCompRand};
        const parser = new Parser();
        const archerShell = parser.parseObjShell(RG.TYPE_ACTOR, archer);

        const archerObj = parser.createActor('archer');
        expect(archerObj).to.have.component('Ethereal');
        expect(archerObj.hasAny(['EagleEye', 'DoubleShot'])).to.equal(true);
    });

});

//---------------------------------------------------------------------------
// PARSING THE FULL OBJECTS FILE
//---------------------------------------------------------------------------

describe('ObjectShellParser.parseShellData()', () => {

    let parser = null;
    before(() => {
        parser = new Parser();
        parser.parseShellData(Effects);
        parser.parseShellData(Objects);
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
        RGUnitTests.checkChar(ratObj, 'r');
        RGUnitTests.checkCSSClassName(ratObj, 'cell-actor-animal');

    });

    it('Should parse all items properly', () => {
        const bayShell = parser.get('items', 'Bayonette');
        expect(bayShell.base).to.equal('MeleeWeaponBase');
        const bayon = parser.createActualObj('items', 'Bayonette');
        expect(bayon.has('Physical')).to.equal(true);
        RGUnitTests.checkCSSClassName(bayon, 'cell-item-melee-weapon');
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

        healPotion.useItem({});

        const venom = parser.createActualObj('items', 'Potion of venom');
        expect(venom).to.have.property('useItem');
        expect(venom).to.have.property('useArgs');

    });

    it('Creates a proper pickaxe with digger capability', () => {
        const cell = new Factory().createWallCell();
        const pickaxe = parser.createActualObj('items', 'Pick-axe');
        expect(pickaxe).to.have.property('useItem');

        const digger = new SentientActor('Dwarf');
        digger.getInvEq().addItem(pickaxe);
        expect(cell.getBaseElem().getType()).to.equal('wall');
        pickaxe.useItem({target: cell});
        expect(digger).to.have.component('UseItem');
    });

    it('can create gold coins', () => {
        const goldcoin = parser.createActualObj(RG.TYPE_ITEM, 'Gold coin');
        expect(goldcoin.getName()).to.equal('Gold coin');
        RGUnitTests.checkChar(goldcoin, '$');
        RGUnitTests.checkCSSClassName(goldcoin, 'cell-item-gold-coin');
    });

    it('can create stat-boosting potions', () => {
        const potion = parser.createItem('Potion of agility');
        const user = new SentientActor('user');
        user.getInvEq().addItem(potion);
        const cell = RGUnitTests.wrapObjWithCell(user);
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
        expect(rocks.getCount()).to.equal(10);
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

    it('it supports $$select, $$dice operations', () => {
        const shell = {name: 'TestShell_1234',
            value: {$$select: [1, 2, 3]},
            weight: {$$dice: '2d6 + 4'},
            type: 'weapon'
        };
        const parsed = parser.parseObjShell(RG.TYPE_ITEM, shell);
        const testObj = parser.createItem('TestShell_1234');
        expect(shell.value.$$select.indexOf(testObj.getValue()) >= 0).to.equal(true);
        expect(testObj.getWeight()).to.be.at.least(2 + 4);
        expect(testObj.getWeight()).to.be.at.most(12 + 4);
    });

    it('can create all possible actors', () => {
        const {actors} = Objects;
        Object.values(actors).forEach(shell => {
            if (!shell.dontCreate && shell.name) {
                // try {
                const actorObj = parser.createActor(shell.name);
                expect(actorObj).to.not.be.empty;
                // }
                /* catch (e) {
                    const msg = e.message + ' ' + JSON.stringify(shell);
                    throw new Error(msg);
                }*/
            }
        });
    });

    it('can create all possible items', () => {
        const {items} = Objects;
        Object.values(items).forEach(shell => {
            if (!shell.dontCreate && shell.name) {
                try {
                    const itemObj = parser.createItem(shell.name);
                    const weight = itemObj.getWeight();
                    const value = itemObj.getValue();
                    expect(weight).to.be.above(0);
                    expect(value).to.be.at.least(0);
                    expect(itemObj).to.not.be.empty;
                }
                catch (e) {
                    const msg = e.message + ' ' + JSON.stringify(shell);
                    throw new Error(msg);
                }
            }
        });
    });

    it('It should detect invalid object shells', () => {
        const parser = new Parser();

        let noObj = null;
        let funcThatThrows = () => {
            noObj = parser.createActualObj('items', 'Void Item');
        };
        expect(noObj).to.be.null;
        expect(funcThatThrows).to.throw(Error);

        const invalidShell = {xxx: 'xxx', noname: 'noname'};

        funcThatThrows = () => {
            parser.validShellGiven(invalidShell);
        };
        expect(funcThatThrows).to.throw(Error);
    });

}); // describe ObjectShell.Parser


describe('Data query functions for objects', function() {

    let parser = null;
    before(() => {
        parser = new Parser();
        parser.parseShellData(Effects);
        parser.parseShellData(Objects);
    });

    it('can filter query with category/function', () => {
        const actor = parser.dbGetActor({name: 'winter demon'});
        expect(actor.name).to.equal('winter demon');

        const items = parser.dbGet({categ: 'items'});
        expect(Object.keys(items)).to.have.length.above(10);

    });

    it('can return objects randomly based on constraints', () => {
        const actors = parser.dbGetRand({categ: 'actors', danger: 2});
        expect(actors.danger).to.equal(2);

        for (let i = 1; i < 20; i++) {
            let maxLimit = i % 10;
            if (maxLimit <= 1) {
                maxLimit = 2;
            }
            const actor = parser.createRandomActorWeighted(1, maxLimit);
            if (actor !== null) {
                expect(actor.get('Experience').getDanger())
                    .to.be.at.most(maxLimit + 2);
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
        const viper = parser.createActualObj(RG.TYPE_ACTOR, 'frost viper');
        expect(viper.has('AddOnHit')).to.equal(true);

        const addOnHit = viper.get('AddOnHit');
        const durComp = addOnHit.getComp();
        expect(durComp.getType()).to.equal('Duration');

        expect(durComp.getComp().getType()).to.equal('DirectDamage');
    });

    it('can create spellcasters', () => {
        const cryomancer = parser.createActor('cryomancer');
        expect(cryomancer.has('SpellPower')).to.equal(true);
        expect(cryomancer.get('SpellPower').getPP()).to.equal(21);
        expect(cryomancer.get('SpellPower').getMaxPP()).to.equal(21);

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

        const fromJSON = new FromJSON();
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

        const victim = new SentientActor('victim');
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
        const level = factLevel.createLevel('arena', 20, 20);
        const cell = level.getMap().getCell(1, 1);
        const fireStarter = new SentientActor('firestarted');
        level.addActor(fireStarter, 1, 2);
        fireStarter.getInvEq().addItem(firekit);

        firekit.useItem({target: cell});

        expect(fireStarter).to.have.component('UseItem');

        const clonedKit = firekit.clone();
        expect(clonedKit.useArgs).to.exist;
        expect(clonedKit.useItem).to.be.a('function');
    });

    it('can create runes', () => {
        const runeProt = parser.createEntity('rune of protection');
        expect(runeProt).to.have.property('useItem');
        expect(runeProt).to.have.property('useArgs');
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

    it('can create boneclaw wit addOnHit', function() {
        const boneclaw = parser.createActor('boneclaw');
        const addOnHit = boneclaw.get('AddOnHit');
        expect(addOnHit.getOnDamage()).to.equal(false);
        expect(addOnHit.getOnAttackHit()).to.equal(true);

        const durComp = addOnHit.getComp();
        const ddComp = durComp.getComp();
        expect(ddComp.getType()).to.equal('DirectDamage');
        expect(ddComp.getDamageType()).to.equal(RG.DMG.NECRO);
    });

    it('can create void elemental', function() {
        const voidElem = parser.createActor('void elemental');
        expect(voidElem).to.have.component('Resistance');

        const resistComps = voidElem.getList('Resistance');
        expect(resistComps).to.have.length(2);

    });

    it('can create boots of flying', function() {
        const boots = parser.createItem('Boots of flying');
        expect(boots).to.have.component('AddOnEquip');
        const addOnEquip = boots.get('AddOnEquip');
        const addComp = addOnEquip.getComp();
        expect(addComp.getType()).to.equal('Flying');
    });

    it('can create addOnHit item with transient comp', () => {
        const swordShell = ItemGen.buildShell({type: 'weapon',
            name: 'sword', suffix: 'ofNecropotence', material: 'steel'});
        const necroSword = parser.createFromShell(RG.TYPE_ITEM, swordShell);
        expect(necroSword).to.have.component('AddOnEquip');
        expect(necroSword).to.have.component('AddOnHit');
        const addOnHit = necroSword.get('AddOnHit');

        const compToAdd = addOnHit.getComp();
        expect(compToAdd.transientComp).to.equal('DrainStat');

        const realComp = addOnHit.getCompToAdd();
        expect(realComp.getType()).to.equal('DrainStat');

        const onEquipComps = necroSword.getList('AddOnEquip');
        expect(onEquipComps).to.have.length(2);
    });

    it('can add goals to actors using shells', () => {
        const demonShell = parser.dbGetActor({name: 'winter demon'});
        demonShell.goals = [{name: 'GoHome', setArgs: {xy: [0, 0]}}, {name: 'Thief'}];
        const winterDemon = parser.createFromShell(RG.TYPE_ACTOR, demonShell);

        const brain = winterDemon.getBrain();
        const goal = brain.getGoal();
        const homeEval = goal.getEvaluator('GoHome');
        const thiefEval = goal.getEvaluator('Thief');
        const evaluators = [homeEval, thiefEval];
        const soughtEvals = evaluators.filter(ee => (
            ee.getType().match(/(GoHome|Thief)/)
        ));
        expect(soughtEvals).to.have.length(2);
    });

    it('can add abilities to actors', () => {
        const chicken = parser.createActor('chicken');
        expect(chicken).to.have.property('useFuncs');
        expect(chicken.useFuncs).to.have.length(1);
        const cell = RGUnitTests.wrapObjWithCell(chicken);
        const useOk = chicken.useSkill({target: cell});
        expect(chicken.has('UseItem')).to.equal(true);

        const json = chicken.toJSON();
        /* Won't pass unless UseSkill evaluator is serialized
        const evaluators = json.brain.goal.evaluators;
        const useSkill = evaluators.find(ee => ee.type === 'UseSkill');
        expect(useSkill).to.have.property('args');
        expect(useSkill.args).to.have.property('cooldown');
        expect(useSkill.args).to.have.property('aiType');
        */

    });

    it('can create treasure hunter', () => {
        const hunter = parser.createActor('treasure hunter');
        RGUnitTests.wrapIntoLevel([hunter]);
        const action = hunter.getBrain().decideNextAction();
    });

    it('can create traveller', () => {
        const traveller = parser.createActor('traveller');
        const level: Level = RGUnitTests.wrapIntoLevel([traveller], 20, 20);
        const turnArgs = {timeOfDay: 12 * 60};
        level.moveActorTo(traveller, 11, 11);
        const action = traveller.getBrain().decideNextAction(turnArgs);
    });

});

