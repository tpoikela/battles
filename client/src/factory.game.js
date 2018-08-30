
import Entity from './entity';

const RG = require('./rg');
RG.Factory = require('./factory');
RG.Game = require('./game');
RG.Element = require('./element');
RG.Game.FromJSON = require('./game.fromjson');
RG.Verify = require('./verify');
RG.ObjectShell = require('./objectshellparser');
RG.Factory.World = require('./factory.world');
const Territory = require('./territory');

const OW = require('./overworld.map');
RG.getOverWorld = require('./overworld');

const Creator = require('./world.creator');
const ActorClass = require('./actor-class');
const ArenaDebugGame = require('../data/debug-game');
const Texts = require('../data/texts');

const RNG = RG.Random.getRNG();
const Stairs = RG.Element.Stairs;

/* Player stats based on user selection.*/
const confPlayerStats = {
    Weak: {att: 1, def: 1, prot: 1, hp: 15},
    Medium: {att: 2, def: 4, prot: 2, hp: 25},
    Strong: {att: 5, def: 6, prot: 3, hp: 40},
    Inhuman: {att: 10, def: 10, prot: 4, hp: 80}
};

/* Object for creating the top-level game object. GUI should only use this
 * factory when creating a new game. For restoring a game, see RG.Game.Save.
 */
RG.Factory.Game = function() {
    RG.Factory.Base.call(this);
    this._verif = new RG.Verify.Conf('Factory.Game');
    this._parser = RG.ObjectShell.getParser();
    this.presetLevels = {};
    this.callbacks = {};

    /* Creates a player actor and starting inventory unless a game has been
     * restored. */
    this.createPlayerUnlessLoaded = function(obj) {
        let player = obj.loadedPlayer;
        if (RG.isNullOrUndef([player])) {
            this._verif.verifyConf('createPlayerUnlessLoaded', obj,
                ['playerLevel', 'playerRace', 'playerName']);
            const expLevel = obj.playerLevel;
            const pConf = confPlayerStats[expLevel];

            player = this.createPlayer(obj.playerName, {
                att: pConf.att, def: pConf.def, prot: pConf.prot
            });

            player.setType(obj.playerRace);
            player.add(new RG.Component.Health(pConf.hp));
            this.addActorClass(obj, player);
            player.add(new RG.Component.Skills());
            player.add(new RG.Component.GameInfo());
            player.add(new RG.Component.BodyTemp());
            player.add(new RG.Component.Abilities());
        }

        if (!player.has('Hunger')) {
            const hunger = new RG.Component.Hunger(20000);
            player.add(hunger);
        }
        else {
            // Notify Hunger system only
            const hunger = player.get('Hunger');
            player.remove('Hunger');
            player.add(hunger);
        }

        // Add to the CSS class table
        RG.addCellStyle(RG.TYPE_ACTOR, player.getName(), 'cell-actor-player');
        return player;
    };

    this.createPlayerRegenEvents = function(game, player) {
        // Add HP regeneration
        const regenPlayer = new RG.Time.RegenEvent(player,
            RG.PLAYER_HP_REGEN_PERIOD * RG.ACTION_DUR);
        game.addEvent(regenPlayer);

        // Add PP regeneration (if needed)
        if (player.has('SpellPower')) {
            const regenPlayerPP = new RG.Time.RegenPPEvent(player,
                RG.PLAYER_PP_REGEN_PERIOD * RG.ACTION_DUR);
            game.addEvent(regenPlayerPP);
        }
    };

    /* Adds the actor class to player, and creates starting equipment. */
    this.addActorClass = function(obj, player) {
        if (obj.playerClass) {
            if (ActorClass.hasOwnProperty(obj.playerClass)) {
                const actorClassComp = new RG.Component.ActorClass();
                actorClassComp.setClassName(obj.playerClass);
                player.add(actorClassComp);
                const actorClass = actorClassComp.getClass();

                const name = obj.playerClass;
                const items = ActorClass.getStartingItems(name);
                const eqs = ActorClass.getEquipment(name);

                // Create starting inventory
                items.forEach(item => {
                    const itemObj = this._parser.createItem(item.name);
                    itemObj.count = item.count || 1;
                    player.getInvEq().addItem(itemObj);

                });

                // Create starting equipment
                eqs.forEach(item => {
                    const itemObj = this._parser.createItem(item.name);
                    itemObj.count = item.count || 1;
                    player.getInvEq().addItem(itemObj);
                    player.getInvEq().equipNItems(itemObj, item.count);
                });

                actorClass.setStartingStats();
                actorClass.advanceLevel(); // Advance to level 1
            }
            else {
                RG.err('Factory.Game', 'addActorClass',
                    `${obj.playerClass} not found in ActorClass.`);
            }
        }

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

        this.addSnow = (level, ratio) => {
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
                () => {}, 35 * 100, Texts.battle.eyeOfStorm);
            _game.addEvent(stormEvent);
            const beastEvent = new RG.Time.OneShotEvent(
                that.createBeastArmy.bind(that, _level, this._parser), 50 * 100,
                'Winter spread by Blizzard Beasts! Hell seems to freeze.');
            _game.addEvent(beastEvent);
        };


        this.allBeastsKilled = () => {
            RG.gameMsg(Texts.battle.beastsSlain);
            // DO a final message of game over
            // Add random people to celebrate
            const msgEvent = new RG.Time.OneShotEvent(() => {}, 10 * 100,
                Texts.battle.enemiesDead);
            _game.addEvent(msgEvent);
            const msgEvent2 = new RG.Time.OneShotEvent(() => {}, 20 * 100,
                'Battles in the North will continue soon in larger scale...');
            _game.addEvent(msgEvent2);
        };
    }; // const DemonKillListener

    /* Creates the game based on the selection. */
    this.createNewGame = function(conf) {
        this._verif.verifyConf('createNewGame', conf,
            ['sqrPerItem', 'sqrPerActor', 'playMode']);

        const game = new RG.Game.Main();
        if (Number.isInteger(conf.seed)) {
            const rng = new RG.Random(conf.seed);
            game.setRNG(rng);
        }
        const player = this.createPlayerUnlessLoaded(conf);
        this.createPlayerRegenEvents(game, player);

        if (conf.playMode === 'Arena') {
            return this.createArenaDebugGame(conf, game, player);
        }
        else if (conf.playMode === 'Battle') {
            return this.createDebugBattle(conf, game, player);
        }
        else if (conf.playMode === 'Creator') {
            return this.createWorldWithCreator(conf, game, player);
        }
        else if (conf.playMode === 'World') {
            return this.createFullWorld(conf, game, player);
        }
        else if (conf.playMode === 'OverWorld') {
            return this.createOverWorld(conf, game, player);
        }
        else if (conf.playMode === 'Dungeon') {
            return this.createOneDungeonAndBoss(conf, game, player);
        }
        else { // Empty game for doing whatever
            return this.createEmptyGame(conf, game, player);
        }
    };

    let _playerFOV = RG.PLAYER_FOV_RANGE;

    this.createEmptyGame = function(obj, game, player) {
        // Add given levels to the game
        if (obj.levels) {
            obj.levels.forEach(level => {
                const extras = level.getExtras();
                game.addLevel(level);

                // If startpoint given, use it
                if (extras.startPoint) {
                    const [sx, sy] = extras.startPoint;
                    level.addActor(player, sx, sy);
                }
            });
            game.addPlayer(player);
        }
        return game;
    };

    this.setCallback = function(name, cb) {
        this.callbacks[name] = cb;
    };

    this.createOverWorld = function(obj, game, player) {
        const mult = 1;
        const xMult = obj.xMult || 1;
        const yMult = obj.yMult || 1;
        const owConf = {
            yFirst: false,
            topToBottom: false,
            // stopOnWall: 'random',
            stopOnWall: true,
            // nHWalls: 3,
            nVWalls: [0.8],
            owTilesX: xMult * mult * 40,
            owTilesY: yMult * mult * 40,
            worldX: xMult * mult * 400,
            worldY: yMult * mult * 400,
            nLevelsX: xMult * mult * 4,
            nLevelsY: yMult * mult * 4,
            nTilesX: xMult * mult * 4,
            nTilesY: yMult * mult * 4
        };

        this.progress('Creating Overworld Tile Map...');
        const overworld = OW.createOverWorld(owConf);
        this.progress('DONE');

        this.progress('Generating territory for clans/races...');
        const midX = Math.floor(owConf.nLevelsX / 2);
        const playerX = midX;
        const playerY = owConf.nLevelsY - 1;
        this.addTerritories(overworld, obj, owConf, playerX, playerY);
        this.progress('DONE');

        this.progress('Creating Overworld Level Map...');
        const worldAndConf = RG.OverWorld.createOverWorldLevel(
          overworld, owConf);
        const worldLevel = worldAndConf[0];
        this.progress('DONE');

        this.progress('Splitting Overworld Level Map into AreaTiles...');
        RG.Map.Level.idCount = 0;
        const splitLevels = RG.Geometry.splitLevel(worldLevel, owConf);
        this.progress('DONE');


        this.progress('Creating and connectting World.Area tiles...');
        RG.Map.Level.idCount = 1000;
        const worldArea = new RG.World.Area('Ravendark', owConf.nLevelsX,
            owConf.nLevelsY, 100, 100, splitLevels);
        worldArea.connectTiles();
        this.progress('DONE');

        const fact = new RG.Factory.World();
        fact.setGlobalConf(obj);
        game.setGlobalConf(obj);
        fact.setPresetLevels({Realm: splitLevels});

        const worldConf = worldAndConf[1];
        worldConf.createAllZones = false;
        this.progress('Creating places and local zones...');
        const world = fact.createWorld(worldConf);
        game.addPlace(world);
        overworld.clearSubLevels();
        game.setOverWorld(overworld);
        game.setEnableChunkUnload(true);
        this.progress('DONE');

        this.progress('Adding player to the game...');
        const playerLevel = splitLevels[playerX][playerY];
        // playerLevel.addActorToFreeCell(player);
        this.placePlayer(player, playerLevel);
        RG.POOL.emitEvent(RG.EVT_TILE_CHANGED, {actor: player,
            target: playerLevel});

        player.setFOVRange(RG.PLAYER_FOV_RANGE);
        game.addPlayer(player); // Player already placed to level
        this.progress('DONE');
        // RG.Verify.verifyStairsConnections(game, 'Factory.Game');
        // this.progress('Stairs connections verified');
        return game;
    };

    this.progress = function(msg) {
        const timeNow = new Date().getTime();
        let durSec = 0;
        if (this.timePrev) {
            durSec = (timeNow - this.timePrev) / 1000;
        }
        this.timePrev = timeNow;
        if (this.callbacks.progress) {
            this.callbacks.progress(msg);
        }
        if (msg === 'DONE') {
            RG.log(`${this.prevMsg} - Time: ${durSec} sec`);
        }
        this.prevMsg = msg;
    };

    /* Places player into a free cell surrounded by other free cells. */
    this.placePlayer = function(player, level) {
        const freeCells = level.getMap().getFree();
        const freeLUT = {};
        freeCells.forEach(cell => {
            freeLUT[cell.getKeyXY()] = true;
        });

        let cell = null;
        let found = false;
        let watchdog = 1000;
        const bSize = 2;
        const minFreeCells = ((2 * bSize + 1) ** 2 - 1);

        while (!found) {
            cell = RNG.arrayGetRand(freeCells);
            const [x, y] = cell.getXY();
            const box = RG.Geometry.getBoxAround(x, y, bSize);
            if (box.length === minFreeCells) {
                found = true;
            }
            for (let i = 0; i < box.length; i++) {
                const [cx, cy] = box[i];
                found = found && freeLUT[cx + ',' + cy];
            }

            if (--watchdog <= 0) {
                RG.log('Timeout reached');
                break;
            }
        }

        if (found) {
            level.addActor(player, cell.getX(), cell.getY());
        }
        else {
            level.addActorToFreeCell(player);
        }
    };

	this.addTerritories = function(ow, conf, playerX, playerY) {
        const {playerRace} = conf;
		const capXY = ow.getFeaturesByType(OW.WCAPITAL)[0];
		const dwarves = ow.getFeaturesByType(OW.WTOWER)[0];
		const btower = ow.getFeaturesByType(OW.BTOWER)[0];
		// const bcapital = ow.getFeaturesByType(OW.BCAPITAL)[0];

		const owMap = ow.getOWMap();
		const terrMap = new Territory(ow.getSizeX(), ow.getSizeY());

		// console.log(ow.mapToString());
		terrMap.setAsEmpty(owMap, {
			[OW.TERM]: true,
			[OW.MOUNTAIN]: true,
			[OW.BVILLAGE]: true,
			[OW.WVILLAGE]: true,
			[OW.WCAPITAL]: true,
			[OW.BCAPITAL]: true,
			[OW.WTOWER]: true,
			[OW.BTOWER]: true
		});

		const bears = {name: 'bearfolk',
			char: 'B', numPos: 2};
		const undeads = {name: 'undead', char: 'u', numPos: 3,
			startX: [ow.getCenterX()], startY: [ow.getSizeY() - 5]};

		terrMap.addContestant({name: 'avian', char: 'A'});
		terrMap.addContestant(undeads);
		terrMap.addContestant({name: 'wildling', char: 'I'});
		terrMap.addContestant(bears);
		terrMap.addContestant({name: 'wolfclan', char: 'w'});
		terrMap.addContestant({name: 'catfolk', char: 'c'});
		terrMap.addContestant({name: 'dogfolk', char: 'd'});
		terrMap.addContestant({name: 'human', char: '@'});
		terrMap.addContestant({name: 'goblin', char: 'g', numPos: 8});
		terrMap.addContestant({name: 'dwarf', char: 'D',
			startX: dwarves[0], startY: dwarves[1]});
		terrMap.addContestant({name: 'hyrkhian', char: 'y',
			startX: capXY[0], startY: capXY[1]});
		terrMap.addContestant({name: 'winterbeing', char: 'W',
			startX: btower[0], startY: btower[1]});

        const coordMap = ow.coorMap;
        const bbox = coordMap.getOWTileBboxFromAreaTileXY(playerX, playerY);

        const pData = terrMap.getData(playerRace);
        pData.numPos += 1;
        pData.startX.push(RNG.getUniformInt(bbox.ulx, bbox.lrx));
        pData.startY.push(RNG.getUniformInt(bbox.uly, bbox.lry));

		terrMap.generate();
        ow.terrMap = terrMap;
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
                this.presetLevels[name] =
                    this.createPresetLevels(conf.presetLevels[name]);
                // Replace json with Map.Level
                conf.presetLevels[name] = this.presetLevels[name];
            });
        }
    };

    this.createPresetLevels = arr => {
        const fromJSON = new RG.Game.FromJSON();
        return arr.map(item => {
            // Return the item itself if it's already Map.Level
            if (typeof item.level.getID === 'function') {
                return item;
            }

            const level = fromJSON.restoreLevel(item.level);
            // Need to reset level + actors IDs for this game
            if (level.getID() < RG.LEVEL_ID_ADD) {
                level.setID(RG.Map.Level.createLevelID());
            }
            level.getActors().forEach(actor => {
                if (actor.getID() < RG.ENTITY_ID_ADD) {
                    actor.setID(Entity.createEntityID());
                }
            });
            level.getItems().forEach(item => {
                if (item.getID() < RG.ENTITY_ID_ADD) {
                    item.setID(Entity.createEntityID());
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
        return new ArenaDebugGame(this, this._parser).create(obj, game, player);
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

        const itemConstraint = maxValue => item => item.value <= maxValue;
        // Generate all game levels
        for (let nl = 0; nl < nLevels; nl++) {

            const nLevelType = RNG.randIndex(levels);
            let levelType = levels[nLevelType];
            if (nl === 0) {levelType = 'ruins';}
            const level = this.createLevel(levelType, cols, rows);
            branch.addLevel(level);

            const numFree = level.getMap().getFree().length;
            const actorsPerLevel = Math.round(numFree / sqrPerActor);
            const itemsPerLevel = Math.round(numFree / sqrPerItem);

            const potion = new RG.Item.Potion('Healing potion');
            level.addItem(potion);
            const missile = this._parser.createActualObj('items', 'Shuriken');
            missile.count = 20;
            level.addItem(missile);

            const maxValue = 20 * (nl + 1);
            const itemConf = {
                itemsPerLevel, func: itemConstraint(maxValue),
                maxValue,
                food: () => true
            };
            this.addNRandItems(level, this._parser, itemConf);

            const actorConf = {
                actorsPerLevel,
                maxDanger: nl + 1
            };
            this.addNRandActors(level, this._parser, actorConf);

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

    this.addActorsToArmy = (army, num, name) => {
        for (let i = 0; i < num; i++) {
            const actor = this._parser.createActualObj('actors', name);
            actor.setFOVRange(10);
            army.addActor(actor);
        }
    };

    /* eslint-disable */
    let _listener = null;
    /* eslint-enable */

    this.createLastBattle = function(game, obj) {
        const levelConf = RG.Factory.cityConfBase({});
        levelConf.parser = this._parser;
        const level = this.createLevel('town', obj.cols, obj.rows, levelConf);
        _listener = new DemonKillListener(game, level);

        this.createHumanArmy(level, this._parser);

        level.setOnFirstEnter(() => {
            const demonEvent = new RG.Time.OneShotEvent(
                that.createDemonArmy.bind(that, level, this._parser), 100 * 20,
                'Demon hordes are unleashed from the unsilent abyss!');
            game.addEvent(demonEvent);
        });

        level.setOnEnter( () => {
            _playerFOV = game.getPlayer().getFOVRange();
            game.getPlayer().setFOVRange(20);
        });
        level.setOnExit( () => {
            game.getPlayer().setFOVRange(_playerFOV);
        });

        game.addLevel(level);
        return level;
    };

};
RG.extend2(RG.Factory.Game, RG.Factory.Base);

module.exports = RG.Factory.Game;

