

const RG = require('../../../client/src/battles');
const Obs = require('../../../client/data/battles_objects.js');
const RGTest = require('../../roguetest.js');

const Effects = require('../../../client/data/effects.js');

const expect = require('chai').expect;

const Parser = RG.ObjectShellParser;
const Actor = RG.Actor.Rogue;

RG.cellRenderArray = RG.cellRenderVisible;

//---------------------------------------------------------------------------
// PARSER TESTS
//---------------------------------------------------------------------------

describe('How actors are created from file', function() {

    it('Returns base objects and supports also base', function() {
        const parser = new Parser();
        const wolfNew = parser.parseObjShell('actors', {
            name: 'wolf', attack: 15, defense: 10, damage: '1d6 + 2',
            hp: 9
        });
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
        wolfObj.get('Combat').setDamage('1d6 + 2');
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
        const cell = new RG.FACT.createFloorCell();
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

    it('Parses Spirits/Gems and creates them correctly', function() {
        const parser = new Parser();
        const spiritShell = {
            name: 'Wolf spirit', type: 'spirit',
            strength: 0, accuracy: 0, agility: 1, willpower: 0, power: 1,
            danger: 1
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

    it('can add items into the created actors', () => {
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

});

describe('How food items are created from objects', function() {
   const parser = new Parser();
    it('Creates food objects items from shells', function() {
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

describe('It contains all game content info', function() {
    const parser = new Parser();
    parser.parseShellData(Effects);
    parser.parseShellData(Obs);

    it('Should parse all actors properly', function() {
        const rsnake = parser.get('actors', 'rattlesnake');
        expect(rsnake.poison).to.equal(true);
        const coyote = parser.get('actors', 'coyote');
        expect(coyote.attack).to.equal(3);
        expect(coyote.danger).to.equal(2);

        const rat = parser.get('actors', 'rat');
        expect(rat.hp).to.equal(5);
        const ratObj = parser.createActualObj('actors', 'rat');
        expect(ratObj.getType()).to.equal('rat');
        expect(ratObj.get('Health').getHP()).to.equal(5);
        expect(ratObj.get('Health').getMaxHP()).to.equal(5);
        expect(ratObj.get('Combat').getAttack()).to.equal(1);
        expect(ratObj.get('Combat').getDefense()).to.equal(1);
        expect(ratObj.get('Stats').getSpeed()).to.equal(100);
        RGTest.checkChar(ratObj, 'r');
        RGTest.checkCSSClassName(ratObj, 'cell-actor-animal');

    });

    it('Should parse all items properly', function() {
        const bayShell = parser.get('items', 'Bayonette');
        expect(bayShell.base).to.equal('MeleeWeaponBase');
        const bayon = parser.createActualObj('items', 'Bayonette');
        expect(bayon.has('Physical')).to.equal(true);
        RGTest.checkCSSClassName(bayon, 'cell-item-melee-weapon');
    });

    it('Should parse weapons properly', function() {
        const rubySwordShell = parser.get('items', 'Ruby glass sword');
        const rubySwordObj = parser.createActualObj('items',
            'Ruby glass sword');

        expect(rubySwordShell.attack).to.equal(rubySwordObj.getAttack());
    });


    it('Should parse all armour properly', function() {
        const larmour = parser.get('items', 'Leather armour');
        expect(larmour.defense).to.equal(2);

        const armObj = parser.createActualObj('items', 'Leather armour');
        expect(armObj.getArmourType()).to.equal('chest');
        expect(armObj.getAttack()).to.equal(0);
        expect(armObj.getDefense()).to.equal(2);
        expect(armObj.getWeight()).to.equal(2.0);
    });

    it('Should parse missiles with correct ranges', function() {
        const missObj = parser.createActualObj('items', 'Shuriken');
        expect(missObj.getAttackRange()).to.equal(3);
        expect(missObj.getWeight()).to.equal(0.1);
    });

    it('Parses/creates spirits/gems properly', function() {
        const demonSpirit = parser.createActualObj('actors',
            'Winter demon spirit');
        expect(demonSpirit.has('Stats')).to.equal(true);
        expect(demonSpirit.get('Stats').getStrength()).to.equal(3);

        // const spiritGem =
    });

    it('Can generate actors using weighted algorithms', function() {
        let newActor = parser.createRandomActorWeighted(1, 1);
        expect(RG.isNullOrUndef([newActor])).to.equal(false);

        newActor = parser.createRandomActorWeighted(1000);
        // expect(RG.isNullOrUndef([newActor])).to.equal(false);
    });

    it('Creates healing potion correctly with useItem attribute', function() {
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

    it('Creates a proper pickaxe with digger capability', function() {
        const cell = new RG.FACT.createWallCell();
        const pickaxe = parser.createActualObj('items', 'Pick-axe');
        expect(pickaxe).to.have.property('useItem');

        const digger = new RG.Actor.Rogue('Dwarf');
        digger.getInvEq().addItem(pickaxe);
        expect(cell.getBaseElem().getType()).to.equal('wall');
        pickaxe.useItem({target: cell});
        expect(cell.getBaseElem().getType()).to.equal('floor');

    });

});

describe('It has query functions for objects', function() {
    const parser = new Parser();
    parser.parseShellData(Effects);
    parser.parseShellData(Obs);

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
});

describe('ObjectShellParser error handling', function() {
    it('It should detect invalid object shells', function() {
        const parser = new RG.ObjectShellParser();
        RG.suppressErrorMessages = true;
        const noObj = parser.createActualObj('items', 'Void Item');
        expect(noObj).to.be.null;
        RG.suppressErrorMessages = true;

        const invalidShell = {xxx: 'xxx', noname: 'noname'};
        expect(parser.validShellGiven(invalidShell)).to.be.false;
    });
});
