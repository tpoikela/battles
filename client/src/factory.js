
const RG = require('./rg.js');
const ROT = require('../../lib/rot.js');

RG.Component = require('./component.js');
RG.Brain = require('./brain.js');
RG.Map = require('./map.js');

const RGObjects = require('../data/battles_objects.js');
RG.Effects = require('../data/effects.js');

const MSG = {
    EYE_OF_STORM:
        'You see an eye of the storm approaching. Brace yourself now..',
    BEASTS_SLAIN:
        'All beasts have been slain. The blizzard seems to calm down',
    ENEMIES_DEAD:
        'All enemies are dead! You emerge victorious. Congratulations!'
};

const Stairs = RG.Element.Stairs;

/* Returns a basic configuration for a city level. */
const cityConfBase = function(_parser, conf) {
    const userConf = conf || {};
    const obj = {
        nHouses: 10, minHouseX: 5, maxHouseX: 10, minHouseY: 5,
        maxHouseY: 10, parser: _parser,
        func: function(item) {return item.type === 'armour';}
    };
    const result = Object.assign(obj, userConf);
    return result;
};


//---------------------------------------------------------------------------
// FACTORY OBJECTS
//---------------------------------------------------------------------------

RG.Factory = {};

/* This object is used to randomize item properties during procedural
 * generation.*/
RG.Factory.ItemRandomizer = function() {

    /* Only public function. All logic is deferred to private functions.
     * Adjusts the properties of given item, based also on maxValue.*/
    this.adjustItem = function(item, val) {
        var itemType = item.getType();
        if (_adjustFunctions.hasOwnProperty(itemType)) {
            _adjustFunctions[itemType](item, val);
        }
    };

    /* Distr. of food weights.*/
    var _foodWeights = RG.getFoodWeightDistr();


    var _adjustFoodItem = function(food) {
        var weight = ROT.RNG.getWeightedValue(_foodWeights);
        food.setWeight(weight);
    };

    /* LUT for functions to call on specific items.*/
    var _adjustFunctions = {
        food: _adjustFoodItem
    };

};

/* Factory object for creating some commonly used objects.*/
RG.Factory.Base = function() { // {{{2

    var _itemRandomizer = new RG.Factory.ItemRandomizer();

    var _initCombatant = function(comb, obj) {
        var hp = obj.hp;
        var att = obj.att;
        var def = obj.def;
        var prot = obj.prot;

        if (!RG.isNullOrUndef([hp])) {
            comb.add('Health', new RG.Component.Health(hp));
        }
        var combatComp = new RG.Component.Combat();

        if (!RG.isNullOrUndef([att])) {combatComp.setAttack(att);}
        if (!RG.isNullOrUndef([def])) {combatComp.setDefense(def);}
        if (!RG.isNullOrUndef([prot])) {combatComp.setProtection(prot);}

        comb.add('Combat', combatComp);
    };

    /* Creates a new die object from array or die expression '2d4 + 3' etc.*/
    this.createDie = function(strOrArray) {
        var numDiceMod = RG.parseDieSpec(strOrArray);
        if (numDiceMod.length === 3) {
            return new RG.Die(numDiceMod[0], numDiceMod[1], numDiceMod[2]);
        }
        return null;
    };

    /* Factory method for players.*/
    this.createPlayer = function(name, obj) {
        var player = new RG.Actor.Rogue(name);
        player.setIsPlayer(true);
        _initCombatant(player, obj);
        return player;
    };

    /* Factory method for monsters.*/
    this.createActor = function(name, obj) {
        var monster = new RG.Actor.Rogue(name);
        if (RG.isNullOrUndef([obj])) {obj = {};}

        var brain = obj.brain;
        _initCombatant(monster, obj);
        if (!RG.isNullOrUndef([brain])) {
            if (typeof brain === 'object') {
                monster.setBrain(brain);
            }
            else { // If brain is string, use factory to create a new one
                var newBrain = this.createBrain(monster, brain);
                monster.setBrain(newBrain);
            }
        }
        return monster;
    };

    /* Factory method for AI brain creation.*/
    this.createBrain = function(actor, brainName) {
        switch (brainName) {
            case 'Animal': return new RG.Brain.Animal(actor);
            case 'Demon': return new RG.Brain.Demon(actor);
            case 'Human': return new RG.Brain.Human(actor);
            case 'Summoner': return new RG.Brain.Summoner(actor);
            case 'Zombie': return new RG.Brain.Zombie(actor);
            default: return new RG.Brain.Rogue(actor);
        }
    };

    this.createFloorCell = function(x, y) {
        return new RG.Map.Cell(x, y, new RG.Element.Base('floor'));
    };

    this.createWallCell = function(x, y) {
        return new RG.Map.Cell(x, y, new RG.Element.Base('wall'));
    };

    this.createSnowCell = function(x, y) {
        return new RG.Map.Cell(x, y, new RG.Element.Base('snow'));
    };

    /* Factory method for creating levels.*/
    this.createLevel = function(levelType, cols, rows, conf) {
        var mapgen = new RG.Map.Generator();
        var mapObj = null;
        var level = new RG.Map.Level(cols, rows);

        if (levelType === 'town') {
            mapObj = mapgen.createTown(cols, rows, conf);
            level.setMap(mapObj.map);
            this.createHouseElements(level, mapObj, conf);
            this.createShop(level, mapObj, conf);
        }
        else if (levelType === 'forest') {
            if (!RG.isNullOrUndef([conf.forest])) {
                const forestShape = conf.forest.shape;
                mapgen.setGen(forestShape, cols, rows);
                mapObj = mapgen.createForest(conf.forest.ratio);
                level.setMap(mapObj.map);
            }
            else {
                RG.err('RG.Factory.Base', 'createLevel',
                    'conf.forest must be specified!');
            }
        }
        else if (levelType === 'mountain') {
            mapgen.setGen('ruins', cols, rows);
            mapObj = mapgen.createMountain();
            level.setMap(mapObj.map);
        }
        else {
            mapgen.setGen(levelType, cols, rows);
            mapObj = mapgen.getMap();
            level.setMap(mapObj.map);
        }

        return level;
    };

    this.createHouseElements = function(level, mapObj) {
        if (!mapObj.hasOwnProperty('houses')) {return;}
        var map = mapObj.map;
        var houses = mapObj.houses;
        for (var i = 0; i < houses.length; i++) {
            var doorXY = houses[i].door;
            var door = new RG.Element.Door(true);
            map.getCell(doorXY[0], doorXY[1]).setProp('elements', door);
        }
    };

    /* Creates a shop and a shopkeeper into a random house in the given level.*/
    this.createShop = function(level, mapObj, conf) {
        var map = mapObj.map;
        if (mapObj.hasOwnProperty('houses')) {
            var houses = mapObj.houses;
            var nlength = houses.length;
            var index = Math.floor(nlength * Math.random());
            var house = mapObj.houses[index];
            var floor = house.floor;

            var doorXY = house.door;
            var door = new RG.Element.Door(true);
            map.getCell(doorXY[0], doorXY[1]).setProp('elements', door);

            var keeper = this.createActor('Shopkeeper', {brain: 'Human'});
            for (var i = 0; i < floor.length; i++) {
                var xy = floor[i];
                if (i === 0) {level.addActor(keeper, xy[0], xy[1]);}
                var cell = map.getCell(xy[0], xy[1]);
                var shopElem = new RG.Element.Shop();
                shopElem.setShopkeeper(keeper);
                cell.setProp('elements', shopElem);

                if (conf.hasOwnProperty('parser')) {
                    var item = conf.parser.createRandomItem({
                        func: conf.func
                    });
                    item.add('Unpaid', new RG.Component.Unpaid());
                    level.addItem(item, xy[0], xy[1]);
                }
            }
        }
        else {
            RG.err('Factory', 'createShop', 'No houses in mapObj.');
        }
    };

    /* Creates a randomized level for the game. Danger level controls how the
     * randomization is done. */
    this.createRandLevel = function(cols, rows) {
        var levelType = RG.Map.Generator.getRandType();
        var level = this.createLevel(levelType, cols, rows);
        return level;
    };


    /* Player stats based on user selection.*/
    this.playerStats = {
        Weak: {att: 1, def: 1, prot: 1, hp: 15, Weapon: 'Dagger'},
        Medium: {att: 2, def: 4, prot: 2, hp: 25, Weapon: 'Short sword'},
        Strong: {att: 5, def: 6, prot: 3, hp: 40, Weapon: 'Tomahawk'},
        Inhuman: {att: 10, def: 10, prot: 4, hp: 80, Weapon: 'Magic sword'}
    };

    /* Adds N random items to the level based on maximum value.*/
    this.addNRandItems = function(parser, itemsPerLevel, level, maxVal, func) {
        // Generate the items randomly for this level
        for (var j = 0; j < itemsPerLevel; j++) {
            var item = parser.createRandomItem({
                func: func
            });
            _doItemSpecificAdjustments(item, maxVal);
            var itemCell = level.getFreeRandCell();
            level.addItem(item, itemCell.getX(), itemCell.getY());
        }
        var food = parser.createRandomItem({func: function(item) {
            return item.type === 'food';
        }});
        var foodCell = level.getFreeRandCell();
        _doItemSpecificAdjustments(item, maxVal);
        level.addItem(food, foodCell.getX(), foodCell.getY());
    };

    /* Adds N random monsters to the level based on given danger level.*/
    this.addNRandMonsters = (parser, monstersPerLevel, level, maxDanger) => {
        // Generate the monsters randomly for this level
        for (var i = 0; i < monstersPerLevel; i++) {
            var cell = level.getFreeRandCell();
            /* var monster = parser.createRandomActor({
                func: function(actor){return actor.danger <= maxDanger;}
            });*/
            var monster = parser.createRandomActorWeighted(1, maxDanger,
                {func: function(actor) {return actor.danger <= maxDanger;}}
            );
            var objShell = parser.dbGet('actors', monster.getName());
            var expLevel = maxDanger - objShell.danger;
            if (expLevel > 1) {
                RG.levelUpActor(monster, expLevel);
            }
            level.addActor(monster, cell.getX(), cell.getY());
        }
    };


    /* Called for random items. Adjusts some of their attributes randomly.*/
    var _doItemSpecificAdjustments = function(item, val) {
        _itemRandomizer.adjustItem(item, val);
    };


    this.createHumanArmy = function(level, parser) {
        for (var y = 0; y < 2; y++) {
            for (var x = 0; x < 20; x++) {
                var human = parser.createActualObj('actors', 'fighter');
                level.addActor(human, x + 1, 4 + y);
            }

            var warlord = parser.createActualObj('actors', 'warlord');
            level.addActor(warlord, 10, y + 7);
        }

    };

    this.spawnDemonArmy = function(level, parser) {
        for (var y = 0; y < 2; y++) {
            for (var i = 0; i < 10; i++) {
                var demon = parser.createActualObj('actors', 'Winter demon');
                level.addActor(demon, i + 10, 14 + y);
                RG.POOL.emitEvent(RG.EVT_ACTOR_CREATED, {actor: demon,
                    level: level, msg: 'DemonSpawn'});
            }
        }
    };

    this.spawnBeastArmy = function(level, parser) {
        var x0 = level.getMap().cols / 2;
        var y0 = level.getMap().rows / 2;
        for (var y = y0; y < y0 + 2; y++) {
            for (var x = x0; x < x0 + 10; x++) {
                var beast = parser.createActualObj('actors', 'Blizzard beast');
                level.addActor(beast, x + 10, 14 + y);
                RG.POOL.emitEvent(RG.EVT_ACTOR_CREATED, {actor: beast,
                    level: level, msg: 'DemonSpawn'});
            }
        }
        RG.debug(this, 'Blizzard beasts should now appear.');
    };

};

RG.FACT = new RG.Factory.Base();
// }}}

RG.Factory.Feature = function() {
    RG.Factory.Base.call(this);

    var _parser = new RG.ObjectShellParser();
    _parser.parseShellData(RG.Effects);
    _parser.parseShellData(RGObjects);

    this.getRandLevelType = function() {
        const type = ['rooms', 'rogue', 'digger', 'cellular'];
        const nLevelType = Math.floor(Math.random() * type.length);
        return type[nLevelType];
    };

    /* Creates random dungeon level. */
    this.createDungeonLevel = function(conf) {
        const levelType = this.getRandLevelType();
        const level = this.createLevel(levelType, conf.x, conf.y);

        const numFree = level.getMap().getFree().length;
        const monstersPerLevel = Math.round(numFree / conf.sqrPerMonster);
        const itemsPerLevel = Math.round(numFree / conf.sqrPerItem);

        const itemConstraint = function(maxVal) {
            return function(item) {return item.value <= maxVal;};
        };

        this.addNRandItems(_parser, itemsPerLevel, level, conf.maxValue,
            itemConstraint(conf.maxValue)
        );
        this.addNRandMonsters(
            _parser, monstersPerLevel, level, conf.nLevel + 1);
        return level;
    };

    this.createCityLevel = function(conf) {
        const levelConf = cityConfBase(_parser);
        const city = this.createLevel('town', conf.x, conf.y, levelConf);
        return city;
    };

    this.createMountainLevel = function(conf) {
        const mountConf = {

        };
        const mountainLevel = this.createLevel('mountain',
            conf.x, conf.y, mountConf);
        return mountainLevel;
    };
};
RG.extend2(RG.Factory.Feature, RG.Factory.Base);

RG.FCCGame = function() {
    RG.Factory.Base.call(this);

    var _parser = new RG.ObjectShellParser();

    /* Creates a player actor and starting inventory.*/
    this.createFCCPlayer = function(game, obj) {
        var player = obj.loadedPlayer;
        if (RG.isNullOrUndef([player])) {
            var expLevel = obj.playerLevel;
            var pConf = this.playerStats[expLevel];

            player = this.createPlayer(obj.playerName, {
                att: pConf.att, def: pConf.def, prot: pConf.prot
            });

            player.setType('player');
            player.add('Health', new RG.Component.Health(pConf.hp));
            var startingWeapon = _parser.createActualObj('items', pConf.Weapon);
            player.getInvEq().addItem(startingWeapon);
            player.getInvEq().equipItem(startingWeapon);
        }

        if (!player.has('Hunger')) {
            const hunger = new RG.Component.Hunger(20000);
            player.add('Hunger', hunger);
        }
        else {
            // Notify Hunger system only
            const hunger = player.get('Hunger');
            player.remove('Hunger');
            player.add('Hunger', hunger);
        }
        var regenPlayer = new RG.Time.RogueRegenEvent(player,
            20 * RG.ACTION_DUR);
        game.addEvent(regenPlayer);
        return player;
    };


    var that = this; // For private objects/functions

    // Private object for checking when battle is done
    const DemonKillListener = function(game, level) {

        // Needed for adding monsters and events
        var _game = game;
        var _level = level;

        var _maxBeasts = 0;
        var _maxDemons = 0;

        var _beastsKilled = 0;
        var _demonsKilled = 0;

        this.hasNotify = true;
        this.notify = function(evtName, obj) {
            if (evtName === RG.EVT_ACTOR_CREATED) {
                if (obj.hasOwnProperty('msg') && obj.msg === 'DemonSpawn') {
                    var actorCreated = obj.actor;
                    if (actorCreated.getName() === 'Winter demon') {
                        ++_maxDemons;
                    }
                    if (actorCreated.getName() === 'Blizzard beast') {
                        ++_maxBeasts;
                    }
                }
            }
            else if (evtName === RG.EVT_ACTOR_KILLED) {
                var actor = obj.actor;
                if (actor.getName() === 'Winter demon') {
                    ++_demonsKilled;
                    if (_demonsKilled === _maxDemons) {
                        this.allDemonsKilled();
                    }
                    RG.debug(this,
                        'A winter demon was slain! Count:' + _demonsKilled);
                    RG.debug(this, 'Max demons: ' + _maxDemons);
                }
                else if (actor.getName() === 'Blizzard beast') {
                    ++_beastsKilled;
                    if (_beastsKilled === _maxBeasts) {
                        this.allBeastsKilled();
                    }
                }
            }
        };
        RG.POOL.listenEvent(RG.EVT_ACTOR_CREATED, this);
        RG.POOL.listenEvent(RG.EVT_ACTOR_KILLED, this);

        this.addSnow = function(level, ratio) {
            var map = level.getMap();
            RG.Map.Generator.prototype.addRandomSnow(map, ratio);
        };

        /* Called after all winter demons have been slain.*/
        this.allDemonsKilled = function() {
            RG.gameMsg(
                "Humans have vanquished all demons! But it's not over..");
            var windsEvent = new RG.Time.RogueOneShotEvent(
                this.addSnow.bind(this, _level, 0.2), 20 * 100,
                "Winds are blowing stronger. You feel it's getting colder"
            );
            _game.addEvent(windsEvent);
            var stormEvent = new RG.Time.RogueOneShotEvent( () => {}, 35 * 100,
                MSG.EYE_OF_STORM);
            _game.addEvent(stormEvent);
            var beastEvent = new RG.Time.RogueOneShotEvent(
                that.spawnBeastArmy.bind(that, _level, _parser), 50 * 100,
                'Winter spread by Blizzard Beasts! Hell seems to freeze.');
            _game.addEvent(beastEvent);
        };


        this.allBeastsKilled = function() {
            RG.gameMsg(MSG.BEASTS_SLAIN);
            // DO a final message of game over
            // Add random people to celebrate
            var msgEvent = new RG.Time.RogueOneShotEvent(() => {}, 10 * 100,
                MSG.ENEMIES_DEAD);
            _game.addEvent(msgEvent);
            var msgEvent2 = new RG.Time.RogueOneShotEvent(() => {}, 20 * 100,
                'But Battles in North will continue soon in larger scale...');
            _game.addEvent(msgEvent2);
        };
    }; // const DemonKillListener

    /* Creates the game for the FCC project.*/
    this.createNewGame = function(obj) {
        _parser.parseShellData(RG.Effects);
        _parser.parseShellData(RGObjects);
        var cols = obj.cols;
        var rows = obj.rows;
        var nLevels = obj.levels;
        var sqrPerMonster = obj.sqrPerMonster;
        var sqrPerItem = obj.sqrPerItem;

        var levelCount = 1;
        var game = new RG.Game.Main();
        var player = this.createFCCPlayer(game, obj);

        if (obj.debugMode === 'Arena') {
            return this.createArenaDebugGame(obj, game, player);
        }
        else if (obj.debugMode === 'Battle') {
            return this.createDebugBattle(obj, game, player);
        }
        else if (obj.debugMode === 'Tiles') {
            return this.createTiledWorld(obj, game, player);
        }
        else if (obj.debugMode === 'World') {
            return this.createFullWorld(obj, game, player);
        }

        var levels = ['rooms', 'rogue', 'digger'];
        var maxLevelType = levels.length;

        // For storing stairs and levels
        var allStairsDown = [];
        var allLevels = [];

        var branch = new RG.World.Branch('StartBranch');

        const itemConstraint = function(maxVal) {
            return function(item) {return item.value <= maxVal;};
        };
        // Generate all game levels
        for (var nl = 0; nl < nLevels; nl++) {

            var nLevelType = Math.floor(Math.random() * maxLevelType);
            var levelType = levels[nLevelType];
            if (nl === 0) {levelType = 'ruins';}
            var level = this.createLevel(levelType, cols, rows);
            branch.addLevel(level);

            var numFree = level.getMap().getFree().length;
            var monstersPerLevel = Math.round(numFree / sqrPerMonster);
            var itemsPerLevel = Math.round(numFree / sqrPerItem);

            var potion = new RG.Item.Potion('Healing potion');
            level.addItem(potion);
            var missile = _parser.createActualObj('items', 'Shuriken');
            missile.count = 20;
            level.addItem(missile);

            var maxVal = 20 * (nl + 1);
            this.addNRandItems(_parser, itemsPerLevel, level, maxVal,
                itemConstraint(maxVal)
            );
            this.addNRandMonsters(_parser, monstersPerLevel, level, nl + 1);

            allLevels.push(level);
        }

        // Create the final boss
        var lastLevel = allLevels.slice(-1)[0];
        console.log(JSON.stringify(allLevels));
        var bossCell = lastLevel.getFreeRandCell();
        var summoner = this.createActor('Summoner',
            {hp: 100, att: 10, def: 10});
        summoner.setType('summoner');
        summoner.get('Experience').setExpLevel(10);
        summoner.setBrain(new RG.Brain.Summoner(summoner));
        lastLevel.addActor(summoner, bossCell.getX(), bossCell.getY());

        var townLevel = this.createLastBattle(game, {cols: 80, rows: 60});
        townLevel.setLevelNumber(levelCount++);

        branch.connectLevels();
        game.addPlace(branch);

        var finalStairs = new Stairs(true, allLevels[nLevels - 1], townLevel);
        var stairsLoot = new RG.Component.Loot(finalStairs);
        summoner.add('Loot', stairsLoot);
        allStairsDown.push(finalStairs);

        var lastStairsDown = allStairsDown.slice(-1)[0];
        var townStairsUp = new Stairs(false, townLevel, lastLevel);
        var rStairCell = townLevel.getFreeRandCell();
        townLevel.addStairs(townStairsUp, rStairCell.getX(), rStairCell.getY());
        townStairsUp.setTargetStairs(lastStairsDown);
        lastStairsDown.setTargetStairs(townStairsUp);

        // Create townsfolk for the extra level
        for (let i = 0; i < 10; i++) {
            var name = 'Townsman';
            var human = this.createActor(name, {brain: 'Human'});
            human.setType('human');
            var cell = townLevel.getFreeRandCell();
            townLevel.addActor(human, cell.getX(), cell.getY());
        }

        // Restore player position or start from beginning
        if (obj.loadedLevel !== null) {
            var loadLevel = obj.loadedLevel;
            console.log('Adding player to level ' + loadLevel);
            if (loadLevel <= nLevels) {
                allLevels[loadLevel - 1].addActorToFreeCell(player);
            }
            else {
                allLevels[0].addActorToFreeCell(player);
            }
        }
        game.addPlayer(player, {place: 'StartBranch'});

        return game;

    };

    var _playerFOV = RG.FOV_RANGE;

    this.createTiledWorld = function(obj, game, player) {
        const area = new RG.World.Area('Kingdom', 4, 4);
        const levels = area.getLevels();
        levels.forEach(level => {
            game.addLevel(level);
        });
        game.addPlayer(player);
        return game;
    };

    this.createFullWorld = function(obj, game, player) {
        const conf = obj.world;
        if (!conf) {
            RG.err('Factory', 'createFullWorld',
                'obj.world must exist!');
            return null;
        }
        const fact = new RG.World.Factory();
        const world = fact.createWorld(conf);
        const levels = world.getLevels();

        if (levels.length > 0) {
            levels.forEach(level => {
                game.addLevel(level);
            });
            game.addPlayer(player);
            return game;
        }
        else {
            RG.err('Factory', 'createFullWorld',
                'There are no levels in the world!');
            return null;
        }
    };

    /* Can be used to create a short debugging game for testing.*/
    this.createArenaDebugGame = function(obj, game, player) {
        var sqrPerItem = obj.sqrPerItem;
        var level = this.createLastBattle(game, obj);

        var spirit = new RG.Actor.Spirit('Wolf spirit');
        spirit.get('Stats').setStrength(500);
        level.addActor(spirit, 2, 1);

        var gem = new RG.Item.SpiritGem('Lesser gem');
        level.addItem(gem);

        var pickaxe = _parser.createActualObj('items', 'Pick-axe');
        level.addItem(pickaxe, 2, 2);

        var poison = _parser.createActualObj('items', 'Potion of frost poison');
        poison.count = 5;
        level.addItem(poison, 2, 2);
        var curePoison = _parser.createActualObj('items',
            'Potion of cure poison');
        level.addItem(curePoison, 3, 2);

        // Test for shops
        var keeper = _parser.createActualObj('actors', 'shopkeeper');
        level.addActor(keeper, 2, 2);
        var shopElem = new RG.Element.Shop();
        var shopCell = level.getMap().getCell(3, 3);
        shopCell.setProp('elements', shopElem);
        var soldItem = _parser.createActualObj('items', 'Ruby glass sword');
        soldItem.add('Unpaid', new RG.Component.Unpaid());
        shopCell.setProp('items', soldItem);
        shopElem.setShopkeeper(keeper);

        var numFree = level.getMap().getFree().length;
        // var monstersPerLevel = Math.round(numFree / sqrPerMonster);
        var itemsPerLevel = Math.round(numFree / sqrPerItem);
        this.addNRandItems(_parser, itemsPerLevel, level, 2500,
            function(item) {return item.value <= 2500;});
        game.addPlayer(player);

        var pepper = _parser.createActualObj('items', 'Ghost pepper');
        player.getInvEq().addItem(pepper);
        var spiritPot = _parser.createActualObj(
            'items', 'Potion of spirit form');
        player.getInvEq().addItem(spiritPot);

        // player.setFOVRange(50);
        return game;
    };

    this.createDebugBattle = function(obj, game, player) {
        const battle = new RG.Game.Battle('Battle of ice kingdoms');
        const army1 = new RG.Game.Army('Blue army');
        const army2 = new RG.Game.Army('Red army');
        this.addActorsToArmy(army1, 10, 'warlord');
        this.addActorsToArmy(army2, 10, 'Winter demon');

        const battleLevel = RG.FACT.createLevel('arena', 60, 30);
        battle.setLevel(battleLevel);
        battle.addArmy(army1, 1, 1);
        battle.addArmy(army2, 1, 2);

        game.addBattle(battle);

        game.addPlayer(player);
        return game;
    };

    this.addActorsToArmy = function(army, num, name) {
        for (let i = 0; i < num; i++) {
            const actor = _parser.createActualObj('actors', name);
            actor.setFOVRange(10);
            army.addActor(actor);
        }
    };

    var _listener = null;

    this.createLastBattle = function(game, obj) {
        const levelConf = cityConfBase(_parser);
        var level = this.createLevel('town', obj.cols, obj.rows, levelConf);
        _listener = new DemonKillListener(game, level);

        this.createHumanArmy(level, _parser);

        level.setOnFirstEnter(function() {
            var demonEvent = new RG.Time.RogueOneShotEvent(
                that.spawnDemonArmy.bind(that, level, _parser), 100 * 20,
                'Demon hordes are unleashed from the unsilent abyss!');
            game.addEvent(demonEvent);
        });

        level.setOnEnter( function() {
            _playerFOV = game.getPlayer().getFOVRange();
            game.getPlayer().setFOVRange(20);
        });
        level.setOnExit( function() {
            game.getPlayer().setFOVRange(_playerFOV);
        });

        game.addLevel(level);
        return level;
    };
};
RG.extend2(RG.FCCGame, RG.Factory.Base);

/* Object parser for reading game data. Game data is contained within shell
 * objects which are simply object literals without functions etc. */
RG.ObjectShellParser = function() {

    // NOTE: 'SHELL' means vanilla JS object, which has not been
    // created with new:
    //      SHELL:   var rat = {name: "Rat", type: "animal"};
    //      OBJECT: var ratObj = new RG.Actor.Rogue("rat"); ratObj.setType("animal");
    //
    // Shells are used in external data file to describe game objects in a more
    // concise way. Game objects are created from shells by this object.

    var categ = ['actors', 'effects', 'items', 'levels', 'dungeons'];

    // Stores the base shells
    var _base = {
        actors: {},
        effects: {},
        items: {},
        levels: {},
        dungeons: {}
    };

    var _db = {
        actors: {},
        effects: {},
        items: {},
        levels: {},
        dungeons: {}
    };

    var dbDanger = {}; // All entries indexed by danger
    var _dbByName = {}; // All entries indexed by name

    /* Maps obj props to function calls. Essentially this maps bunch of setters
     * to different names. Following formats supported:
     *
     * 1. {factory: funcObj, func: "setter"}
     *  Call obj["setter"]( funcObj(shell.field) )
     *
     * 2. {comp: "CompName", func: "setter"}
     *  Create component comp of type "CompName".
     *  Call comp["setter"]( shell.field)
     *  Call obj.add("CompName", comp)
     *
     * 3. {comp: "CompName"}
     *  Create component comp of type "CompName" with new CompName(shell.field)
     *  Call obj.add("CompName", comp)
     *
     * 4. "setter"
     *   Call setter obj["setter"](shell.field)
     * */
    var _propToCall = {
        actors: {
            type: 'setType',
            attack: {comp: 'Combat', func: 'setAttack'},
            defense: {comp: 'Combat', func: 'setDefense'},
            damage: {comp: 'Combat', func: 'setDamage'},
            speed: {comp: 'Stats', func: 'setSpeed'},

            strength: {comp: 'Stats', func: 'setStrength'},
            accuracy: {comp: 'Stats', func: 'setAccuracy'},
            agility: {comp: 'Stats', func: 'setAgility'},
            willpower: {comp: 'Stats', func: 'setWillpower'},

            hp: {comp: 'Health'},
            danger: {comp: 'Experience', func: 'setDanger'},
            brain: {func: 'setBrain', factory: RG.FACT.createBrain}
        },
        items: {
            // Generic item functions
            value: 'setValue',
            weight: {comp: 'Physical', func: 'setWeight'},

            armour: {
                attack: 'setAttack',
                defense: 'setDefense',
                protection: 'setProtection',
                armourType: 'setArmourType'
            },

            weapon: {
                damage: 'setDamage',
                attack: 'setAttack',
                defense: 'setDefense'
            },
            missile: {
                damage: 'setDamage',
                attack: 'setAttack',
                range: 'setAttackRange'
            },
            food: {
                energy: 'setEnergy'
            }
        },
        levels: {},
        dungeons: {}
    };

    // Internal cache for proc generation
    var _cache = {
        actorWeights: {}

    };

    //---------------------------------------------------------------------------
    // "PARSING" METHODS
    //---------------------------------------------------------------------------

    /* Parses all shell data, items, monsters, level etc.*/
    this.parseShellData = function(obj) {
        var keys = Object.keys(obj);
        for (var i = 0; i < keys.length; i++) {
            this.parseShellCateg(keys[i], obj[keys[i]]);
        }
    };

    /* Parses one specific shell category, ie items or monsters.*/
    this.parseShellCateg = function(categ, objsArray) {
        for (var i = 0; i < objsArray.length; i++) {
            this.parseObjShell(categ, objsArray[i]);
        }
    };

    /* Parses an object shell. Returns null for base objects, and
     * corresponding object for actual actors.*/
    this.parseObjShell = function(categ, obj) {
        if (this.validShellGiven(obj)) {
            // Get properties from base class
            if (obj.hasOwnProperty('base')) {
                var baseName = obj.base;
                if (this.baseExists(categ, baseName)) {
                    obj = this.extendObj(obj, this.getBase(categ, baseName));
                }
                else {
                    RG.err('ObjectParser', 'parseObjShell',
                        'Unknown base ' + baseName + ' specified for ' + obj);
                }
            }

            if (categ === 'actors') {this.addTypeIfUntyped(obj);}

            this.storeIntoDb(categ, obj);
            return obj;
        }
        else {
            return null;
        }
    };

    /* Checks that the object shell given is correctly formed.*/
    this.validShellGiven = function(obj) {
        if (!obj.hasOwnProperty('name')) {
            RG.err('ObjectShellParser', 'validShellGiven',
                "shell doesn't have a name.");
            return false;
        }
        // console.log("validShell ==> " + obj.name);
        return true;
    };

    /* If an object doesn't have type, the name is chosen as its type.*/
    this.addTypeIfUntyped = function(obj) {
        if (!obj.hasOwnProperty('type')) {
            obj.type = obj.name;
        }
    };

    /* Returns an object shell given category and name.*/
    this.get = function(categ, name) {
        return _db[categ][name];
    };

    /* Return specified base shell.*/
    this.getBase = function(categ, name) {
        return _base[categ][name];
    };

    this.setAsBase = function(categ, obj) {
        _base[categ][obj.name] = obj;
    };

    /* Stores the object into given category.*/
    this.storeIntoDb = function(categ, obj) {
        if (_db.hasOwnProperty(categ)) {
            this.setAsBase(categ, obj);

            if (!obj.hasOwnProperty('dontCreate')) {
                _db[categ][obj.name] = obj;
                if (_dbByName.hasOwnProperty(obj.name)) {
                    _dbByName[obj.name].push(obj);
                }
                else {
                    var newArr = [];
                    newArr.push(obj);
                    _dbByName[obj.name] = newArr;
                }
                if (obj.hasOwnProperty('danger')) {
                    var danger = obj.danger;
                    if (!dbDanger.hasOwnProperty(danger)) {
                        dbDanger[danger] = {};
                    }
                    if (!dbDanger[danger].hasOwnProperty(categ)) {
                        dbDanger[danger][categ] = {};
                    }
                    dbDanger[danger][categ][obj.name] = obj;
                }
            } // dontCreate
        }
        else {
            RG.err('ObjectParser', 'storeIntoDb',
                'Unknown category: ' + categ);
        }
        this.storeRenderingInfo(categ, obj);
    };

    /* Stores char/CSS className for the object for rendering purposes.*/
    this.storeRenderingInfo = function(categ, obj) {
        // console.log("\tStoring render information for " + obj.name);
        if (obj.hasOwnProperty('char')) {
            if (obj.hasOwnProperty('name')) {
                RG.addCharStyle(categ, obj.name, obj['char']);
            }
            else {
                RG.addCharStyle(categ, obj.type, obj['char']);
            }
        }
        if (obj.hasOwnProperty('className')) {
            if (obj.hasOwnProperty('name')) {
                RG.addCellStyle(categ, obj.name, obj.className);
            }
            else {
                RG.addCellStyle(categ, obj.type, obj.className);
            }
        }
    };

    /* Creates a component of specified type.*/
    this.createComponent = function(type, val) {
        switch (type) {
            case 'Combat': return new RG.Component.Combat();
            case 'Experience': return new RG.Component.Experience();
            case 'Health': return new RG.Component.Health(val);
            case 'Stats': return new RG.Component.Stats();
            default:
                if (RG.Component.hasOwnProperty(type)) {
                    return RG.Component[type]();
                }
                else {
                    RG.err('Factory', 'createComponent',
                        'Component |' + type + "| doesn't exist.");
                }
        }
    };

    /* Returns an actual game object when given category and name. Note that
     * the blueprint must exist already in the database (blueprints must have
     * been parser before). */
    this.createActualObj = function(categ, name) {
        if (!this.dbExists(categ, name)) {
            RG.err('ObjectParser', 'createActualObj',
                'Categ: ' + categ + ' Name: ' + name + " doesn't exist.");
            return null;
        }

        var shell = this.get(categ, name);
        var propCalls = _propToCall[categ];
        var newObj = this.createNewObject(categ, shell);

        // If propToCall table has the same key as shell property, call corresponding
        // function in _propToCall using the newly created object.
        for (var p in shell) {

            // Called for basic type: actors, items...
            if (propCalls.hasOwnProperty(p)) {
                var funcName = propCalls[p];
                if (typeof funcName === 'object') {
                    if (funcName.hasOwnProperty('comp')) {
                        this.addCompToObj(newObj, funcName, shell[p]);
                    }
                    else if (funcName.hasOwnProperty('factory')) {
                        if (p === 'brain') {
                            var createdObj = funcName.factory(newObj, shell[p]);
                            newObj[funcName.func](createdObj);
                        }
                    }
                    else {
                        for (var f in funcName) {
                            var fName = funcName[f];
                            if (newObj.hasOwnProperty(fName)) {
                                newObj[fName](shell[p]);
                            }
                        }
                    }
                }
                else {
                    newObj[funcName](shell[p]);
                }
            }
            else { // Check for subtypes
                if (shell.hasOwnProperty('type')) {
                    if (propCalls.hasOwnProperty(shell.type)) {
                        var propTypeCalls = propCalls[shell.type];
                        if (propTypeCalls.hasOwnProperty(p)) {
                            var funcName2 = propTypeCalls[p];
                            if (typeof funcName2 === 'object') {
                                for (var f2 in funcName2) {
                                    var fName2 = funcName2[f2];
                                    if (newObj.hasOwnProperty(fName)) {
                                        newObj[funcName2[f2]](shell[p]);
                                    }
                                }
                            }
                            else {
                                newObj[funcName2](shell[p]);
                            }
                        }
                    }
                }
            }
        }

        if (shell.hasOwnProperty('use')) {this.addUseEffects(shell, newObj);}

        // TODO map different props to function calls
        return newObj;
    };

    /* If shell has 'use', this adds specific use effect to the item.*/
    this.addUseEffects = function(shell, newObj) {
        newObj.useFuncs = [];
        newObj.useItem = _db.effects.use.func.bind(newObj);
        if (typeof shell.use === 'object' && shell.use.hasOwnProperty('length')) {
            for (var i = 0; i < shell.use.length; i++) {
                _addUseEffectToItem(shell, newObj, shell.use[i]);
            }
        }
        else if (typeof shell.use === 'object') {
            for (var p in shell.use) {
                _addUseEffectToItem(shell, newObj, p);
            }
        }
        else {
            _addUseEffectToItem(shell, newObj, shell.use);
        }
    };

    var _addUseEffectToItem = function(shell, item, useName) {
        var useFuncName = useName;
        if (_db.effects.hasOwnProperty(useFuncName)) {
            var useEffectShell = _db.effects[useFuncName];
            var useFuncVar = useEffectShell.func;
            item.useFuncs.push(useFuncVar);

            if (useEffectShell.hasOwnProperty('requires')) {
                if (shell.use.hasOwnProperty(useName)) {
                    item.useArgs = {};
                    var reqs = useEffectShell.requires;
                    if (typeof reqs === 'object') {
                        for (var i = 0; i < reqs.length; i++) {
                            _verifyAndAddReq(shell.use[useName], item, reqs[i]);
                        }
                    }
                    else {
                        _verifyAndAddReq(shell.use[useName], item, reqs);
                    }
                }
                else {
                    RG.err('ObjectParser', 'addUseEffects',
                        "useEffect shell has 'requires'. Item shell 'use' must be an object.");
                }
            }
        }
        else {
            RG.err('ObjectParser', 'addUseEffects', 'Unknown effect: |' + useFuncName + '|');
        }
    };

    /* Verifies that the shell has all requirements, and adds them to the
     * object, into useArgs.reqName. */
    var _verifyAndAddReq = function(obj, item, reqName) {
        if (obj.hasOwnProperty(reqName)) {
            item.useArgs[reqName] = obj[reqName];
        }
        else {
            RG.err('ObjectParser', '_verifyAndAddReq',
                'Req |' + reqName + '| not specified in item shell. Item: ' + item);
        }
    };

    /* Adds a component to the newly created object, or updates existing
     * component if it exists already.*/
    this.addCompToObj = function(newObj, compData, val) {
        if (compData.hasOwnProperty('func')) {
            var fname = compData.func;
            var compName = compData.comp;
            if (newObj.has(compName)) {
                newObj.get(compName)[fname](val); // Call comp with setter (fname)
            }
            else { // Have to create new component
                var comp = this.createComponent(compName);
                comp[fname](val); // Then call comp setter
            }
        }
        else {
            newObj.add(compData.comp,
                this.createComponent(compData.comp, val));
        }

    };

    /* Creates actual game object from obj shell in given category.*/
    this.CreateFromShell = function(categ, obj) {
        return this.createActualObj(categ, obj.name);
    };

    /* Factory-method for creating the actual game objects.*/
    this.createNewObject = function(categ, obj) {
        switch (categ) {
            case RG.TYPE_ACTOR:
                var type = obj.type;
                if (type === 'spirit') {return new RG.Actor.Spirit(obj.name);}
                return new RG.Actor.Rogue(obj.name);
            case RG.TYPE_ITEM:
                var subtype = obj.type;
                switch (subtype) {
                    case 'armour': return new RG.Item.Armour(obj.name);
                    case 'food': return new RG.Item.Food(obj.name);
                    case 'missile': return new RG.Item.Missile(obj.name);
                    case 'potion': return new RG.Item.Potion(obj.name);
                    case 'spiritgem': return new RG.Item.SpiritGem(obj.name);
                    case 'weapon': return new RG.Item.Weapon(obj.name);
                    case 'tool': break;
                    default: {
                        const msg =
                            `Unknown subtype: ${subtype}, obj: ${JSON.stringify(obj)}`;
                        RG.err('', 'createNewObject', msg);
                    }
                }
                return new RG.Item.Base(obj.name); // generic, useless
            case 'levels':
                return RG.FACT.createLevel(obj.type, obj.cols, obj.rows);
            case 'dungeons': break;
            default: break;
        }
        return null;
    };

    /* Returns true if shell base exists.*/
    this.baseExists = function(categ, baseName) {
        if (_base.hasOwnProperty(categ)) {
            return _base[categ].hasOwnProperty(baseName);
        }
        return false;
    };

    /* Extends the given object shell with a given base shell.*/
    this.extendObj = function(obj, baseObj) {
        for (var prop in baseObj) {
            if (!obj.hasOwnProperty(prop)) {
                if (prop !== 'dontCreate') {
                    // console.log("\textendObj: Added " + prop + " to " + obj.name);
                    obj[prop] = baseObj[prop];
                }
            }
        }
        return obj;
    };

    //--------------------------------------------------------------------
    // Database get-methods
    //--------------------------------------------------------------------

    this.dbExists = function(categ, name) {
        if (_db.hasOwnProperty(categ)) {
            if (_db[categ].hasOwnProperty(name)) {return true;}
        }
        return false;
    };

    /* Returns entries from db based on the query. Returns null if nothing
     * matches.*/
    this.dbGet = function(query) {

        var name = query.name;
        var categ = query.categ;
        var danger = query.danger;
        // var type = query.type;

        // Specifying name returns an array
        if (typeof name !== 'undefined') {
            if (_dbByName.hasOwnProperty(name)) {return _dbByName[name];}
            else {return [];}
        }

        if (typeof danger !== 'undefined') {
            if (dbDanger.hasOwnProperty(danger)) {
                var entries = dbDanger[danger];
                if (typeof categ !== 'undefined') {
                    if (entries.hasOwnProperty(categ)) {
                        return entries[categ];
                    }
                    else {return {};}
                }
                else {
                    return dbDanger[danger];
                }
            }
            else {
                return {};
            }
        }
        else { // Fetch all entries of given category
            if (typeof categ !== 'undefined') {
                if (_db.hasOwnProperty(categ)) {
                    return _db[categ];
                }
            }
        }
        return {};

    };

    //----------------------------------------------------------------------
    // RANDOMIZED METHODS for procedural generation
    //----------------------------------------------------------------------

    /* Returns stuff randomly from db. For example, {categ: "actors", num: 2}
     * returns two random actors (can be the same). Ex2: {danger: 3, num:1}
     * returns randomly one entry which has danger 3.*/
    this.dbGetRand = function(query) {
        var danger = query.danger;
        var categ = query.categ;
        if (typeof danger !== 'undefined') {
            if (typeof categ !== 'undefined') {
                if (dbDanger.hasOwnProperty(danger)) {
                    var entries = dbDanger[danger][categ];
                    return this.getRandFromObj(entries);
                }
            }
        }
        return null;
    };

    /* Returns a property from an object, selected randomly. For example,
     * given object {a: 1, b: 2, c: 3}, may return 1,2 or 3 with equal
     * probability.*/
    this.getRandFromObj = function(obj) {
        var keys = Object.keys(obj);
        var len = keys.length;
        var randIndex = Math.floor( Math.random() * len);
        return obj[keys[randIndex]];
    };

    /* Filters given category with a function. Func gets each object as arg,
     * and must return either true or false.*/
    this.filterCategWithFunc = function(categ, func) {
        var objects = this.dbGet({categ: categ});
        var res = [];
        var keys = Object.keys(objects);

        for (var i = 0; i < keys.length; i++) {
            var name = keys[i];
            var obj = objects[name];
            var acceptItem = func(obj);
            if (acceptItem) {
                res.push(obj);
            }
        }
        return res;

    };

    /* Creates a random actor based on danger value or a filter function.*/
    this.createRandomActor = function(obj) {
        var randShell = null;
        if (obj.hasOwnProperty('danger')) {
            var danger = obj.danger;
            randShell = this.dbGetRand({danger: danger, categ: 'actors'});
            if (randShell !== null) {
                return this.CreateFromShell('actors', randShell);
            }
            else {
                return null;
            }
        }
        else if (obj.hasOwnProperty('func')) {
            var res = this.filterCategWithFunc('actors', obj.func);
            randShell = this.arrayGetRand(res);
            return this.CreateFromShell('actors', randShell);
        }
    };

    // Uses engine's internal weighting algorithm when givel a level number.
    // Note that this method can return null, if no correct danger level is
    // found. You can supply {func: ...} as a fallback solution.
    this.createRandomActorWeighted = function(min, max, obj) {
        var key = min + ',' + max;
        if (!_cache.actorWeights.hasOwnProperty(key)) {
            _cache.actorWeights[key] = RG.getDangerProb(min, max);
        }
        var danger = ROT.RNG.getWeightedValue(_cache.actorWeights[key]);
        var actor = this.createRandomActor({danger: danger});
        if (RG.isNullOrUndef([actor])) {
            if (!RG.isNullOrUndef([obj])) {
                return this.createRandomActor(obj);
            }
        }
        return actor;
    };

    /* Creates a random item based on a selection function.
     *
     * Example:
     *  var funcValueSel = function(item) {return item.value >= 100;}
     *  var item = createRandomItem({func: funcValueSel}); // Returns item with
     *  value > 100.
     *  */
    this.createRandomItem = function(obj) {
        if (obj.hasOwnProperty('func')) {
            var res = this.filterCategWithFunc('items', obj.func);
            var randShell = this.arrayGetRand(res);
            return this.CreateFromShell('items', randShell);
        }
        else {
            RG.err('ObjectParser', 'createRandomItem', 'No function given.');
        }
        return null;
    };

    /* Returns a random entry from the array.*/
    this.arrayGetRand = function(arr) {
        var len = arr.length;
        var randIndex = Math.floor(Math.random() * len);
        return arr[randIndex];
    };

};

module.exports = RG.Factory;
