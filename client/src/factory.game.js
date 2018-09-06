
import Entity from './entity';

const RG = require('./rg');
RG.Factory = require('./factory');
RG.Game = require('./game');
RG.Element = require('./element');
RG.Game.FromJSON = require('./game.fromjson');
RG.Verify = require('./verify');
RG.ObjectShell = require('./objectshellparser');
RG.Factory.World = require('./factory.world');

const OW = require('./overworld.map');
RG.getOverWorld = require('./overworld');

const Creator = require('./world.creator');
const ActorClass = require('./actor-class');
const DebugGame = require('../data/debug-game');
const TerritoryMap = require('../data/territory-map');

const RNG = RG.Random.getRNG();

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
const FactoryGame = function() {
    RG.Factory.Base.call(this);
    this._verif = new RG.Verify.Conf('Factory.Game');
    this._parser = RG.ObjectShell.getParser();
    this.presetLevels = {};
    this.callbacks = {};
};
RG.extend2(FactoryGame, RG.Factory.Base);

/* Creates a player actor and starting inventory unless a game has been
 * restored. */
FactoryGame.prototype.createPlayerUnlessLoaded = function(obj) {
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

FactoryGame.prototype.createPlayerRegenEvents = function(game, player) {
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
FactoryGame.prototype.addActorClass = function(obj, player) {
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

/* Creates the game based on the selection. */
FactoryGame.prototype.createNewGame = function(conf) {
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

FactoryGame.prototype.createEmptyGame = function(obj, game, player) {
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

FactoryGame.prototype.setCallback = function(name, cb) {
    this.callbacks[name] = cb;
};

FactoryGame.prototype.createOverWorld = function(obj, game, player) {
    const owConf = FactoryGame.getOwConf(1, obj);
    const midX = Math.floor(owConf.nLevelsX / 2);
    const playerX = midX;
    const playerY = owConf.nLevelsY - 1;
    owConf.playerX = playerX;
    owConf.playerY = playerY;
    owConf.playerRace = obj.playerRace;
    owConf.createTerritory = true;

    const startTime = new Date().getTime();

    this.progress('Creating Overworld Tile Map...');
    const overworld = OW.createOverWorld(owConf);
    this.progress('DONE');

    if (!overworld.terrMap) {
        this.progress('Generating territory for clans/races...');
        overworld.terrMap = this.createTerritoryMap(overworld, obj.playerRace,
            playerX, playerY);
    }
    this.progress('DONE');

    this.progress('Creating Overworld Level Map...');
    const worldAndConf = RG.OverWorld.createOverWorldLevel(
      overworld, owConf);
    const [worldLevel, worldConf] = worldAndConf;
    this.progress('DONE');

    this.progress('Mapping settlements into territory areas..');
    this.mapZonesToTerritoryMap(overworld.terrMap, worldConf);
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

    const factWorld = new RG.Factory.World();
    factWorld.setOverWorld(overworld);
    factWorld.setGlobalConf(obj);
    game.setGlobalConf(obj);
    factWorld.setPresetLevels({Realm: splitLevels});

    worldConf.createAllZones = false;
    this.progress('Creating places and local zones...');
    const playerLevel = splitLevels[playerX][playerY];
    this.createPlayerHome(worldConf, player, playerLevel, playerX, playerY);
    this.createAreaLevelConstraints(worldConf, overworld.terrMap);
    const world = factWorld.createWorld(worldConf);
    game.addPlace(world);
    overworld.clearSubLevels();
    game.setOverWorld(overworld);
    game.setEnableChunkUnload(true);
    this.progress('DONE');

    this.progress('Adding player to the game...');

    this.placePlayer(player, playerLevel);
    RG.POOL.emitEvent(RG.EVT_TILE_CHANGED, {actor: player,
        target: playerLevel});

    player.setFOVRange(RG.PLAYER_FOV_RANGE);
    game.addPlayer(player); // Player already placed to level
    this.progress('DONE');

    const endTime = new Date().getTime();
    const totalDur = endTime - startTime;
    this.progress('World generation took ' + totalDur + ' ms.');
    // RG.Verify.verifyStairsConnections(game, 'Factory.Game');
    // this.progress('Stairs connections verified');
    return game;
};

FactoryGame.prototype.progress = function(msg) {
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
FactoryGame.prototype.placePlayer = function(player, level) {
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

FactoryGame.prototype.createTerritoryMap = function(
    ow, playerRace, playerX, playerY) {
    return TerritoryMap.create(ow, playerRace, [playerX, playerY]);
};

/* Matches each zone with territory map, and adds some generation
 * constraints.
 */
FactoryGame.prototype.mapZonesToTerritoryMap = function(terrMap, worldConf) {
    const terrMapXY = terrMap.getMap();
    const citiesConf = worldConf.area[0].city;
    citiesConf.forEach(cityConf => {
        const {owX, owY} = cityConf;
        const char = terrMapXY[owX][owY];
        const name = terrMap.getName(char);
        let constrActor = null;
        if (name) {
            constrActor = [
                {op: 'eq', prop: 'type', value: [name]},
                {op: 'neq', prop: 'base', value: ['WinterBeingBase']}
            ];
            if (name === 'winterbeing') {
                constrActor = {
                    op: 'eq', prop: 'base', value: ['WinterBeingBase']
                };
            }

        }
        else {
            // Mixed city, obtain values from area tile influence
            const [aX, aY] = this.getAreaXYFromOWTileXY(owX, owY);
            const values = this.getConstrValuesForAreaXY(aX, aY, terrMap);
            const hasWinterBeings = values.indexOf('winterbeing') >= 0;
            if (hasWinterBeings) {
                constrActor = {
                    op: 'eq', prop: 'base', value: ['WinterBeingBase']
                };
            }
            else if (values.length > 0) {
                constrActor = [
                    {op: 'eq', prop: 'type', value: [name]},
                    {op: 'neq', prop: 'base', value: ['WinterBeingBase']}
                ];
            }
            else if (values.length === 0) {
                RG.log('factory.game.js', terrMap.mapToString());
                const owStr = `owX: ${owX}, owY: ${owY}`;
                RG.err('FactoryGame', 'mapZonesToTerritoryMap',
                    `No values for AreaTile ${aX},${aY}, ${owStr} found`);
            }
        }

        if (!cityConf.constraint) {cityConf.constraint = {};}
        cityConf.constraint.actor = constrActor;

        cityConf.quarter.forEach(qConf => {
            if (!qConf.constraint) {qConf.constraint = {};}
            qConf.constraint.actor = constrActor;
        });
    });
};

FactoryGame.prototype.getAreaXYFromOWTileXY = function(owX, owY) {
    const coordMap = new RG.OverWorld.CoordMap({xMap: 10, yMap: 10});
    return coordMap.getAreaXYFromOWTileXY(owX, owY);
};

/* Creates the starting home village for the player. */
FactoryGame.prototype.createPlayerHome = function(
    worldConf, player, level, playerX, playerY
) {
    let cell = level.getFreeRandCell();
    while (cell.hasConnection()) {
        cell = level.getFreeRandCell();
    }

    const homeConf = {
        name: 'Home town of ' + player.getName(),
        x: playerX, y: playerY,
        levelX: cell.getX(), levelY: cell.getY(),
        nQuarters: 1,
        groupType: 'village',
        friendly: true,
        constraint: {
            actor: [
                {op: 'eq', prop: 'type', value: [player.getType()]},
                {op: 'neq', prop: 'base', value: ['WinterBeingBase']}
            ],
            shop: [
                {op: '<=', prop: 'value', value: 50}
            ]
        },
        quarter: [{
            name: 'Square',
            nLevels: 1,
            entranceLevel: 0,
            nShops: 1
        }]
    };

    console.log('Hometown located @ ', cell.getX(), cell.getY());
    worldConf.area[0].city.push(homeConf);
};

FactoryGame.prototype.createAreaLevelConstraints = function(
    worldConf, terrMap
) {
    const areaConf = worldConf.area[0];
    const constraints = {};
    for (let x = 0; x < areaConf.maxX; x++) {
        for (let y = 0; y < areaConf.maxY; y++) {
            /*
            const bbox = coordMap.getOWTileBboxFromAreaTileXY(x, y);
            const cells = RG.Geometry.getCellsInBbox(terrMapXY, bbox);
            const hist = RG.Geometry.histArrayVals(cells);
            let types = Object.keys(hist);
            types = types.filter(type => (type !== '#' && type !== '.'));
            types = types.map(typeChar => terrMap.getName(typeChar));
            */
            const types = this.getConstrValuesForAreaXY(x, y, terrMap);
            types.push('animal');
            constraints[x + ',' + y] = {
                actor: {op: 'eq', prop: 'type', value: types}
            };

            const index = types.indexOf('winterbeing');
            if (index >= 0) {
                constraints[x + ',' + y].actor =
                    {op: 'eq', prop: 'base', value: 'WinterBeingBase'};
            }
        }
    }
    areaConf.constraint = constraints;
};

/* Given x,y for AreaTile, finds all rivals occupying at least one ow tile
 * tile that AreaTile, and returns them as array. */
FactoryGame.prototype.getConstrValuesForAreaXY = function(aX, aY, terrMap) {
    const terrMapXY = terrMap.getMap();
    const coordMap = new RG.OverWorld.CoordMap({xMap: 10, yMap: 10});

    const bbox = coordMap.getOWTileBboxFromAreaTileXY(aX, aY);
    const cells = RG.Geometry.getCellsInBbox(terrMapXY, bbox);
    const hist = RG.Geometry.histArrayVals(cells);
    let types = Object.keys(hist);
    types = types.filter(type => (type !== '#' && type !== '.'));
    types = types.map(typeChar => terrMap.getName(typeChar));
    return types;
};

FactoryGame.prototype.createWorldWithCreator = function(obj, game, player) {
    const creator = new Creator();

    const conf = {name: 'World', worldSize: 'Small',
        areaSize: 'Small'
    };

    obj.world = creator.createWorldConf(conf);
    return this.createFullWorld(obj, game, player);
};

FactoryGame.prototype.createFullWorld = function(obj, game, player) {
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
FactoryGame.prototype.processPresetLevels = function(conf) {
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

FactoryGame.prototype.createPresetLevels = function(arr) {
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
FactoryGame.prototype.createArenaDebugGame = function(obj, game, player) {
    return new DebugGame(this, this._parser).createArena(obj, game, player);
};

FactoryGame.prototype.createDebugBattle = function(obj, game, player) {
    const arenaGame = new DebugGame(this, this._parser);
    return arenaGame.createDebugBattle(obj, game, player);
};

FactoryGame.prototype.createOneDungeonAndBoss = function(obj, game, player) {
    const arenaGame = new DebugGame(this, this._parser);
    return arenaGame.createOneDungeonAndBoss(obj, game, player);
};


FactoryGame.getOwConf = function(mult = 1, obj = {}) {
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
    return owConf;
};

RG.Factory.Game = FactoryGame;

module.exports = FactoryGame;

