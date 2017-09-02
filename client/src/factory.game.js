
const RG = require('./rg');
RG.Factory = require('./factory');
RG.Game = require('./game');
RG.Element = require('./element');

RG.Game.FromJSON = require('./game.fromjson');

const OW = require('./overworld.map');
RG.getOverWorld = require('./overworld');
const Creator = require('./world.creator');

const RGObjects = require('../data/battles_objects.js');
RG.Effects = require('../data/effects.js');
const ActorClass = require('./actor-class');

const Stairs = RG.Element.Stairs;

/* Player stats based on user selection.*/
const confPlayerStats = {
    Weak: {att: 1, def: 1, prot: 1, hp: 15, Weapon: 'Dagger'},
    Medium: {att: 2, def: 4, prot: 2, hp: 25, Weapon: 'Short sword'},
    Strong: {att: 5, def: 6, prot: 3, hp: 40, Weapon: 'Tomahawk'},
    Inhuman: {att: 10, def: 10, prot: 4, hp: 80, Weapon: 'Magic sword'}
};

const MSG = {
    EYE_OF_STORM:
        'You see an eye of the storm approaching. Brace yourself now..',
    BEASTS_SLAIN:
        'All beasts have been slain. The blizzard seems to calm down',
    ENEMIES_DEAD:
        'All enemies are dead! You emerge victorious. Congratulations!'
};

/* Object for creating the top-level game object. GUI should only use this
 * factory when creating a new game. For restoring a game, see RG.Game.Save.
 */
RG.Factory.Game = function() {
    RG.Factory.Base.call(this);

    const _verif = new RG.Verify.Conf('Factory.Game');
    const _parser = new RG.ObjectShell.Parser();
    this.presetLevels = {};

    /* Creates a player actor and starting inventory unless a game has been
     * restored. */
    this.createPlayerUnlessLoaded = function(game, obj) {
        let player = obj.loadedPlayer;
        if (RG.isNullOrUndef([player])) {
            const expLevel = obj.playerLevel;
            const pConf = confPlayerStats[expLevel];

            player = this.createPlayer(obj.playerName, {
                att: pConf.att, def: pConf.def, prot: pConf.prot
            });

            player.setType('player');
            player.add('Health', new RG.Component.Health(pConf.hp));
            const startingWeapon = _parser.createActualObj(
                'items', pConf.Weapon);
            player.getInvEq().addItem(startingWeapon);
            player.getInvEq().equipItem(startingWeapon);

            if (obj.playerClass) {
                if (ActorClass.hasOwnProperty(obj.playerClass)) {
                    const actorClassComp = new RG.Component.ActorClass();
                    const actorClass = new ActorClass[obj.playerClass](player);
                    actorClassComp.setClass(actorClass);
                    player.add(actorClassComp);
                }
                else {
                    RG.err('Factory.Game', 'createPlayerUnlessLoaded',
                        `${obj.playerClass} not found in ActorClass.`);
                }
            }
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
        const regenPlayer = new RG.Time.RegenEvent(player,
            20 * RG.ACTION_DUR);
        const regenPlayerPP = new RG.Time.RegenPPEvent(player,
            30 * RG.ACTION_DUR);
        game.addEvent(regenPlayer);
        game.addEvent(regenPlayerPP);
        return player;
    };

    const that = this; // For private objects/functions

    // Private object for checking when battle is done
    const DemonKillListener = function(game, level) {

        // Needed for adding monsters and events
        const _game = game;
        const _level = level;

        let _maxBeasts = 0;
        let _maxDemons = 0;
        let _beastsKilled = 0;
        let _demonsKilled = 0;

        this.hasNotify = true;
        this.notify = function(evtName, obj) {
            if (evtName === RG.EVT_ACTOR_CREATED) {
                if (obj.hasOwnProperty('msg') && obj.msg === 'DemonSpawn') {
                    const actorCreated = obj.actor;
                    if (actorCreated.getName() === 'Winter demon') {
                        ++_maxDemons;
                    }
                    if (actorCreated.getName() === 'Blizzard beast') {
                        ++_maxBeasts;
                    }
                }
            }
            else if (evtName === RG.EVT_ACTOR_KILLED) {
                const actor = obj.actor;
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
            const map = level.getMap();
            RG.Map.Generator.addRandomSnow(map, ratio);
        };

        /* Called after all winter demons have been slain.*/
        this.allDemonsKilled = function() {
            RG.gameMsg(
                "Humans have vanquished all demons! But it's not over..");
            const windsEvent = new RG.Time.OneShotEvent(
                this.addSnow.bind(this, _level, 0.2), 20 * 100,
                "Winds are blowing stronger. You feel it's getting colder"
            );
            _game.addEvent(windsEvent);
            const stormEvent = new RG.Time.OneShotEvent(
                () => {}, 35 * 100, MSG.EYE_OF_STORM);
            _game.addEvent(stormEvent);
            const beastEvent = new RG.Time.OneShotEvent(
                that.createBeastArmy.bind(that, _level, _parser), 50 * 100,
                'Winter spread by Blizzard Beasts! Hell seems to freeze.');
            _game.addEvent(beastEvent);
        };


        this.allBeastsKilled = function() {
            RG.gameMsg(MSG.BEASTS_SLAIN);
            // DO a final message of game over
            // Add random people to celebrate
            const msgEvent = new RG.Time.OneShotEvent(() => {}, 10 * 100,
                MSG.ENEMIES_DEAD);
            _game.addEvent(msgEvent);
            const msgEvent2 = new RG.Time.OneShotEvent(() => {}, 20 * 100,
                'Battles in the North will continue soon in larger scale...');
            _game.addEvent(msgEvent2);
        };
    }; // const DemonKillListener

    /* Creates the game based on the selection. */
    this.createNewGame = function(obj) {
        _verif.verifyConf('createNewGame', obj, ['sqrPerItem', 'sqrPerActor',
            'debugMode']);
        _parser.parseShellData(RG.Effects);
        _parser.parseShellData(RGObjects);

        const game = new RG.Game.Main();
        const player = this.createPlayerUnlessLoaded(game, obj);

        if (obj.debugMode === 'Arena') {
            return this.createArenaDebugGame(obj, game, player);
        }
        else if (obj.debugMode === 'Battle') {
            return this.createDebugBattle(obj, game, player);
        }
        else if (obj.debugMode === 'Creator') {
            return this.createWorldWithCreator(obj, game, player);
        }
        else if (obj.debugMode === 'World') {
            return this.createFullWorld(obj, game, player);
        }
        else if (obj.debugMode === 'OverWorld') {
            return this.createOverWorld(obj, game, player);
        }
        else {
            return this.createOneDungeonAndBoss(obj, game, player);
        }
    };

    let _playerFOV = RG.FOV_RANGE;

    this.createOverWorld = function(obj, game, player) {
        const mult = 1;
        const owConf = {
            yFirst: false,
            topToBottom: false,
            // stopOnWall: 'random',
            stopOnWall: true,
            // nHWalls: 2,
            nVWalls: [0.8],
            owTilesX: mult * 40,
            owTilesY: mult * 20,
            worldX: mult * 800,
            worldY: mult * 400,
            nLevelsX: mult * 8,
            nLevelsY: mult * 4,
            areaX: mult * 8,
            areaY: mult * 4
        };

        const overworld = OW.createOverWorld(owConf);
        const worldAndConf = RG.OverWorld.createOverWorldLevel(
          overworld, owConf);
        const worldLevel = worldAndConf[0];

        const splitLevels = RG.Geometry.splitLevel(worldLevel, owConf);
        const midX = Math.floor(owConf.nLevelsX / 2);

        const sizeY = splitLevels[0].length;
        for (let x = 0; x < splitLevels.length; x++) {
            const xDiff = Math.abs(midX - x);
            for (let y = 0; y < sizeY; y++) {
                const yDiff = sizeY - y;
                const itemsPerLevel = 20 + xDiff + 2 * yDiff;
                const actorsPerLevel = (yDiff + 1) * 10 + 2 * xDiff;

                const itemConf = {
                    itemsPerLevel,
                    func: (item) => (
                        item.value <= 15 * yDiff + 5 * xDiff
                        && item.type !== 'food'
                    ),
                    gold: () => false,
                    food: () => false,
                    maxValue: 15 * yDiff + 5 * xDiff
                };
                this.addNRandItems(splitLevels[x][y], _parser, itemConf);

                const actorConf = {
                    actorsPerLevel: actorsPerLevel,
                    maxDanger: yDiff + xDiff
                };
                this.addNRandActors(splitLevels[x][y], _parser, actorConf);

            }
        }

        splitLevels[midX][owConf.nLevelsY - 1].addActorToFreeCell(player);

        const worldArea = new RG.World.Area('Ravendark', owConf.nLevelsX,
            owConf.nLevelsY, 100, 100, splitLevels);
        worldArea.connectTiles();

        const fact = new RG.Factory.World();
        fact.setPresetLevels({Realm: splitLevels});
        fact.setGlobalConf(obj);

        const worldConf = worldAndConf[1];
        const world = fact.createWorld(worldConf);
        game.addPlace(world);
        game.setOverWorld(overworld);

        player.setFOVRange(10);
        game.addPlayer(player); // Player already placed to level
        return game;
    };

    this.createWorldWithCreator = function(obj, game, player) {
        const creator = new Creator();

        const conf = {name: 'World', worldSize: 'Small',
            areaSize: 'Small'
        };

        obj.world = creator.createWorldConf(conf);
        return this.createFullWorld(obj, game, player);
    };

    this.createFullWorld = function(obj, game, player) {
        const worldConf = obj.world;
        this.processPresetLevels(worldConf);
        if (!worldConf) {
            RG.err('Factory', 'createFullWorld',
                'obj.world must exist!');
            return null;
        }
        worldConf.levelSize = obj.levelSize;
        const fact = new RG.Factory.World();
        fact.setGlobalConf(obj);
        fact.setPresetLevels(this.presetLevels);

        const world = fact.createWorld(worldConf);
        const levels = world.getLevels();

        console.log('The world has ' + levels.length + ' levels now');

        let playerStart = {place: worldConf.name, x: 0, y: 0};
        if (worldConf.playerStart) {
            playerStart = worldConf.playerStart;
        }

        if (levels.length > 0) {
            game.addPlace(world);
            game.addPlayer(player, playerStart);
            return game;
        }
        else {
            RG.err('Factory', 'createFullWorld',
                'There are no levels in the world!');
            return null;
        }
    };

    /* Creates all preset levels specified in the world configuration. */
    this.processPresetLevels = function(conf) {
        this.presetLevels = {};
        if (conf.hasOwnProperty('presetLevels')) {
            const keys = Object.keys(conf.presetLevels);
            keys.forEach(name => {
                console.log('processPresetLevels for ' + name);
                this.presetLevels[name] =
                    this.createPresetLevels(conf.presetLevels[name]);
            });
        }
    };

    this.createPresetLevels = function(arr) {
        const fromJSON = new RG.Game.FromJSON();
        return arr.map(item => {
            const level = fromJSON.restoreLevel(item.level);
            // Need to reset level + actors IDs for this game
            if (level.getID() < RG.LEVEL_ID_ADD) {
                level.setID(RG.Map.Level.createLevelID());
            }
            level.getActors().forEach(actor => {
                if (actor.getID() < RG.ENTITY_ID_ADD) {
                    actor.setID(RG.Entity.createEntityID());
                }
            });
            level.getItems().forEach(item => {
                if (item.getID() < RG.ENTITY_ID_ADD) {
                    item.setID(RG.Entity.createEntityID());
                }
            });

            // Reset cell explored status, because game-editor sets all cells as
            // explored for viewing purposes
            RG.setAllExplored(level, false);
            return {
                nLevel: item.nLevel,
                level
            };
        });
    };

    /* Can be used to create a short debugging game for testing.*/
    this.createArenaDebugGame = function(obj, game, player) {
        const sqrPerItem = obj.sqrPerItem;
        const level = this.createLastBattle(game, obj);

        const spirit = new RG.Actor.Spirit('Wolf spirit');
        spirit.get('Stats').setStrength(500);
        level.addActor(spirit, 2, 1);

        const gem = new RG.Item.SpiritGem('Lesser gem');
        level.addItem(gem);

        const pickaxe = _parser.createActualObj('items', 'Pick-axe');
        level.addItem(pickaxe, 2, 2);

        const poison = _parser.createActualObj('items',
            'Potion of frost poison');
        poison.count = 5;
        level.addItem(poison, 2, 2);
        const curePoison = _parser.createActualObj('items',
            'Potion of cure poison');
        level.addItem(curePoison, 3, 2);

        const rifle = _parser.createActualObj('items', 'Rifle');
        const ammo = _parser.createActualObj('items', 'Rifle bullet');
        ammo.setCount(100);
        level.addItem(rifle, 1, 1);
        level.addItem(ammo, 1, 1);

        // Test for shops
        const keeper = _parser.createActualObj('actors', 'shopkeeper');
        const gold = new RG.Item.GoldCoin();
        gold.count = 50;
        keeper.getInvEq().addItem(gold);
        level.addActor(keeper, 2, 2);
        const shopElem = new RG.Element.Shop();
        const shopCell = level.getMap().getCell(3, 3);
        shopCell.setProp('elements', shopElem);
        const soldItem = _parser.createActualObj('items', 'Ruby glass sword');
        soldItem.add('Unpaid', new RG.Component.Unpaid());
        shopCell.setProp('items', soldItem);
        shopElem.setShopkeeper(keeper);

        const numFree = level.getMap().getFree().length;
        const itemsPerLevel = Math.round(numFree / sqrPerItem);

        const itemConf = {
            itemsPerLevel,
            func: (item) => (item.value <= 2500),
            maxValue: 2500,
            food: () => true,
            gold: () => false
        };
        this.addNRandItems(level, _parser, itemConf);

        const cols = level.getMap().cols;
        const rows = level.getMap().rows;

        const boss = _parser.createActor('Thabba, Son of Ice');
        level.addActor(boss, cols - 2, rows - 2);

        const cryomancer = _parser.createActor('Cryomancer');
        level.addActor(cryomancer, 1, rows - 2);

        const spiritPot = _parser.createActualObj(
            'items', 'Potion of spirit form');
        player.getInvEq().addItem(spiritPot);

        const potStr = _parser.createItem('Potion of strength');
        player.getInvEq().addItem(potStr);

        // BladeMaster components
        player.add('Attacker', new RG.Component.Attacker());
        player.add('Defender', new RG.Component.Defender());
        player.add('MasterEquipper', new RG.Component.MasterEquipper());
        player.add('BiDirStrike', new RG.Component.BiDirStrike());
        player.add('CounterAttack', new RG.Component.BiDirStrike());

        const winCond = new RG.Game.WinCondition('Kill a keeper');
        winCond.addActorKilled(keeper);

        player.get('Stats').setStrength(1000);
        game.addPlayer(player);
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

    this.createOneDungeonAndBoss = function(obj, game, player) {
        const cols = obj.cols;
        const rows = obj.rows;
        const nLevels = obj.levels;
        const sqrPerActor = obj.sqrPerActor;
        const sqrPerItem = obj.sqrPerItem;

        let levelCount = 1;
        const levels = ['rooms', 'rogue', 'digger'];

        // For storing stairs and levels
        const allStairsDown = [];
        const allLevels = [];

        const branch = new RG.World.Branch('StartBranch');

        const itemConstraint = function(maxValue) {
            return function(item) {return item.value <= maxValue;};
        };
        // Generate all game levels
        for (let nl = 0; nl < nLevels; nl++) {

            const nLevelType = RG.RAND.randIndex(levels);
            let levelType = levels[nLevelType];
            if (nl === 0) {levelType = 'ruins';}
            const level = this.createLevel(levelType, cols, rows);
            branch.addLevel(level);

            const numFree = level.getMap().getFree().length;
            const actorsPerLevel = Math.round(numFree / sqrPerActor);
            const itemsPerLevel = Math.round(numFree / sqrPerItem);

            const potion = new RG.Item.Potion('Healing potion');
            level.addItem(potion);
            const missile = _parser.createActualObj('items', 'Shuriken');
            missile.count = 20;
            level.addItem(missile);

            const maxValue = 20 * (nl + 1);
            const itemConf = {
                itemsPerLevel, func: itemConstraint(maxValue),
                maxValue,
                food: () => true
            };
            this.addNRandItems(level, _parser, itemConf);

            const actorConf = {
                actorsPerLevel,
                maxDanger: nl + 1
            };
            this.addNRandActors(level, _parser, actorConf);

            allLevels.push(level);
        }

        // Create the final boss
        const lastLevel = allLevels.slice(-1)[0];
        const bossCell = lastLevel.getFreeRandCell();
        const summoner = this.createActor('Summoner',
            {hp: 100, att: 10, def: 10});
        summoner.setType('summoner');
        summoner.get('Experience').setExpLevel(10);
        summoner.setBrain(new RG.Brain.Summoner(summoner));
        lastLevel.addActor(summoner, bossCell.getX(), bossCell.getY());

        const townLevel = this.createLastBattle(game, {cols: 80, rows: 60});
        townLevel.setLevelNumber(levelCount++);

        branch.connectLevels();
        game.addPlace(branch);

        const finalStairs = new Stairs(true, allLevels[nLevels - 1], townLevel);
        const stairsLoot = new RG.Component.Loot(finalStairs);
        summoner.add('Loot', stairsLoot);
        allStairsDown.push(finalStairs);

        const lastStairsDown = allStairsDown.slice(-1)[0];
        const townStairsUp = new Stairs(false, townLevel, lastLevel);
        const rStairCell = townLevel.getFreeRandCell();
        townLevel.addStairs(townStairsUp, rStairCell.getX(), rStairCell.getY());
        townStairsUp.setTargetStairs(lastStairsDown);
        lastStairsDown.setTargetStairs(townStairsUp);

        // Create townsfolk for the extra level
        for (let i = 0; i < 10; i++) {
            const name = 'Townsman';
            const human = this.createActor(name, {brain: 'Human'});
            human.setType('human');
            const cell = townLevel.getFreeRandCell();
            townLevel.addActor(human, cell.getX(), cell.getY());
        }

        // Restore player position or start from beginning
        if (obj.loadedLevel !== null) {
            const loadLevel = obj.loadedLevel;
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

    this.addActorsToArmy = function(army, num, name) {
        for (let i = 0; i < num; i++) {
            const actor = _parser.createActualObj('actors', name);
            actor.setFOVRange(10);
            army.addActor(actor);
        }
    };

    /* eslint-disable */
    let _listener = null;
    /* eslint-enable */

    this.createLastBattle = function(game, obj) {
        const levelConf = RG.Factory.cityConfBase({});
        levelConf.parser = _parser;
        const level = this.createLevel('town', obj.cols, obj.rows, levelConf);
        _listener = new DemonKillListener(game, level);

        this.createHumanArmy(level, _parser);

        level.setOnFirstEnter(function() {
            const demonEvent = new RG.Time.OneShotEvent(
                that.createDemonArmy.bind(that, level, _parser), 100 * 20,
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
RG.extend2(RG.Factory.Game, RG.Factory.Base);

module.exports = RG.Factory.Game;

