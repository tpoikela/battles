

var RG = require("../battles.js");
var Obs = require("../data/battles_objects.js");
var RGTest = require("./roguetest.js");

var chai = require("chai");
var expect = chai.expect;

var Parser = RG.ObjectShellParser;
var Db = RG.RogueObjectDatabase;
var Actor = RG.Actor.Rogue;

RG.cellRenderArray = RG.cellRenderVisible;

//---------------------------------------------------------------------------
// PARSER TESTS
//---------------------------------------------------------------------------

describe('How actors are created from file', function() {

    it('Returns base objects and supports also base', function() {
        var parser = new Parser();
        var wolfNew = parser.parseObjShell("actors", {
            name: "wolf", attack: 15, defense: 10, damage: "1d6 + 2",
            hp: 9
        });
        expect(wolfNew.attack).to.equal(15);
        expect(wolfNew.defense).to.equal(10);

        var wolves = parser.dbGet({categ: "actors", danger: 3});
        expect(wolves.hasOwnProperty("superwolf")).to.equal(false);

        var superWolf = parser.parseObjShell("actors", {
            name: "superwolf", base: "wolf", defense: 20, 
            damage: "2d6 + 3", danger: 3
        });
        expect(superWolf.attack).to.equal(15);
        expect(superWolf.defense).to.equal(20);

        var objWolf = parser.dbGet({name: "wolf"})[0];
        expect(objWolf).to.equal(wolfNew);

        var wolves = parser.dbGet({categ: "actors", danger: 3});
        expect(wolves.hasOwnProperty("superwolf")).to.equal(true);
        var wolf1 = wolves["superwolf"];
        expect(wolf1).to.equal(superWolf);

        // Create a reference actor 
        var wolfObj = new Actor("wolf");
        wolfObj.setType("wolf");
        wolfObj.get("Combat").setAttack(15);
        wolfObj.get("Combat").setDefense(10);
        wolfObj.get("Combat").setDamage("1d6 + 2");
        wolfObj.get("Health").setHP(9);
        var wolfComp = wolfObj.get("Combat");

        // Create actor using parsed shell data
        var createdWolf = parser.createActualObj("actors", "wolf");
        var cWolfComp = createdWolf.get("Combat");
        expect(cWolfComp.getAttack()).to.equal(wolfComp.getAttack());
        expect(cWolfComp.getDefense()).to.equal(wolfComp.getDefense());
        expect(createdWolf.getType()).to.equal(wolfObj.getType());
        expect(createdWolf.get("Health").getHP()).to.equal(wolfObj.get("Health").getHP());

        var player = RG.FACT.createPlayer("player", {});
        player.setType("player");
        player.setIsPlayer(true);
        var cell = new RG.FACT.createFloorCell();
        cell.setProp("actors", player);
        cell.setExplored(true);

        var actorChar = RG.charStyles.actors.player;
        expect(RG.getCellChar(cell)).to.equal(actorChar);

        var randWolf = parser.createRandomActor({danger: 3});
        expect(randWolf !== null).to.equal(true);
        expect(randWolf.get("Combat").getAttack()).to.equal(superWolf.attack);

        var punyWolf = parser.parseObjShell("actors", {name: "Puny wolf",
            base: "wolf", attack: 1, defense: 50}
        );

        var punyWolfCreated = parser.createRandomActor({
            func: function(actor) {return actor.attack < 2;}
        });
        expect(punyWolfCreated.get("Combat").getDefense()).to.equal(50);
        expect(punyWolfCreated.get("Combat").getAttack()).to.equal(1);

    });

    it('Parses Spirits/Gems and creates them correctly', function() {
        var parser = new Parser();
        var spiritShell = {
            name: "Wolf spirit", type: "spirit",
            strength: 0, accuracy: 0, agility: 1, willpower: 0, power: 1,
            danger: 1,
        };
        var spiritNew = parser.parseObjShell("actors", spiritShell);
        expect(spiritNew.strength).to.equal(0);
        expect(spiritNew.agility).to.equal(1);

        var spiritObj = parser.createActualObj("actors", "Wolf spirit");
        expect(spiritObj.has("Ethereal")).to.equal(true);
        expect(spiritObj.has("Stats")).to.equal(true);

        var gemShell = {name: "Lesser gem", value: 40, type: "spiritgem"};
        var newGem = parser.parseObjShell("items", gemShell);
        expect(newGem.name).to.equal("Lesser gem");
        var gemObj = parser.createActualObj("items", "Lesser gem");
        expect(gemObj.getValue()).to.equal(40);
    });
});

describe('How food items are created from objects', function() {
   var parser = new Parser();
    it('Creates food objects items from shells', function() {
        var foodBase = parser.parseObjShell("items", {type: "food", name: "foodBase",
            weight: 0.1, misc: "XXX", dontCreate: true, "char": "%",
            className: "cell-item-food"});

        var food = parser.parseObjShell("items", {base: "foodBase", name: "Dried meat",
            energy: 100, value: 5
        });
        expect(food.name).to.equal("Dried meat");
        expect(food.energy).to.equal(100);
        expect(food.value).to.equal(5);
        expect(food.type).to.equal("food");
        expect(food.weight).to.equal(0.1);
        expect(food.char).to.equal("%");
        expect(food.className).to.equal("cell-item-food");

        var expFood = parser.parseObjShell("items", {name: "Gelee", energy: 500, 
            weight: 0.2, value: 100, base: "foodBase"});

        var geleeObj = parser.dbGet({name: "Gelee"})[0];
        expect(geleeObj.char).to.equal("%");

        var items = parser.dbGet({categ: "items"});
        expect(Object.keys(items).length).to.equal(2);

        var randFood = parser.createRandomItem({
            func: function(item) {return item.value <= 5;}
        });

        expect(randFood.getEnergy()).to.equal(100);
        expect(randFood.getValue()).to.equal(5);
        RGTest.checkChar(randFood, "%");
        RGTest.checkCSSClassName(randFood, "cell-item-food");

        var geleeFood = parser.createRandomItem({
            func: function(item) {return item.value >= 99;}
        });
        expect(geleeFood.getEnergy()).to.equal(500);
        expect(geleeFood.getType()).to.equal("food");
        RGTest.checkChar(geleeFood, "%");

    });
});

//---------------------------------------------------------------------------
// PARSING THE FULL OBJECTS FILE
//---------------------------------------------------------------------------

describe('It contains all game content info', function() {
    var parser = new Parser();
    parser.parseShellData(Obs);

    it('Should parse all actors properly', function() {
        var rsnake = parser.get("actors", "rattlesnake");
        expect(rsnake.poison).to.equal(true);
        var coyote = parser.get("actors", "coyote");
        expect(coyote.attack).to.equal(3);
        expect(coyote.danger).to.equal(2);

        var rat = parser.get("actors", "rat");
        expect(rat.hp).to.equal(5);
        var ratObj = parser.createActualObj("actors", "rat");
        expect(ratObj.getType()).to.equal("rat");
        expect(ratObj.get("Health").getHP()).to.equal(5);
        expect(ratObj.get("Health").getMaxHP()).to.equal(5);
        expect(ratObj.get("Combat").getAttack()).to.equal(1);
        expect(ratObj.get("Combat").getDefense()).to.equal(1);
        expect(ratObj.get("Stats").getSpeed()).to.equal(100);
        RGTest.checkChar(ratObj, "r");
        RGTest.checkCSSClassName(ratObj, "cell-actor-animal");

    });

    it('Should parse all items properly', function() {
        var bayShell = parser.get("items", "Bayonette");
        expect(bayShell.base).to.equal("MeleeWeaponBase");
        var bayon = parser.createActualObj("items", "Bayonette");
        expect(bayon.has("Physical")).to.equal(true);
        RGTest.checkCSSClassName(bayon, "cell-item-melee-weapon");
    });

    it('Should parse weapons properly', function() {
        var rubySwordShell = parser.get("items", "Ruby glass sword");
        var rubySwordObj = parser.createActualObj("items", "Ruby glass sword");

        expect(rubySwordShell.attack).to.equal(rubySwordObj.getAttack());

    });


    it('Should parse all armour properly', function() {
        var larmour = parser.get("items", "Leather armour");
        expect(larmour.defense).to.equal(2);

        var armObj = parser.createActualObj("items", "Leather armour");
        expect(armObj.getArmourType()).to.equal("chest");
        expect(armObj.getAttack()).to.equal(0);
        expect(armObj.getDefense()).to.equal(2);
        expect(armObj.getWeight()).to.equal(2.0);

    });

    it('Should parse missiles with correct ranges', function() {
        var missObj = parser.createActualObj("items", "Shuriken");
        expect(missObj.getAttackRange()).to.equal(3);
        expect(missObj.getWeight()).to.equal(0.1);

    });

    it('Parses/creates spirits/gems properly', function() {
        var demonSpirit = parser.createActualObj("actors", "Winter demon spirit");
        expect(demonSpirit.has("Stats")).to.equal(true);
        expect(demonSpirit.get("Stats").getStrength()).to.equal(3);

        //var spiritGem =
    });

    it('Can generate actors using weighted algorithms', function() {
        var newActor = parser.createRandomActorWeighted(1, 1);
        expect(RG.isNullOrUndef([newActor])).to.equal(false);

        newActor = parser.createRandomActorWeighted(1000);
        //expect(RG.isNullOrUndef([newActor])).to.equal(false);
    });

});

