
import RG from './rg';

import * as Component from './component';
import * as Time from './time';
import * as Verify from './verify';
import * as World from './world';
import {ActorClass} from './actor-class';
import {ActorsData} from '../data/actors';
import {DebugGame} from '../data/debug-game';
import {Disposition} from './disposition';
import {Entity} from './entity';
import {EventPool} from '../src/eventpool';
import {FactoryBase} from './factory';
import {FactoryItem} from './factory.items';
import {FactoryWorld} from './factory.world';
import {Factory} from './factory';
import {FromJSON} from './game.fromjson';
import {GameMain} from './game';
import {Geometry} from './geometry';
import {Builder} from './builder';
import {OWMap} from './overworld.map';
import {ObjectShell} from './objectshellparser';
import {OverWorld, CoordMap} from './overworld';
import {Random} from './random';
import {TerritoryMap} from '../data/territory-map';
import {Territory} from './territory';
import {WorldConf} from './world.creator';
import {Level} from './level';
import {SentientActor} from './actor';

import {IFactoryGameConf, OWMapConf} from './interfaces';

const POOL = EventPool.getPool();
const RNG = Random.getRNG();

/* Player stats based on user selection.*/
const confPlayerStats = {
    Weak: {att: 1, def: 1, prot: 1, hp: 15},
    Medium: {att: 2, def: 4, prot: 2, hp: 25},
    Strong: {att: 5, def: 6, prot: 3, hp: 40},
    Inhuman: {att: 10, def: 10, prot: 4, hp: 80}
};

/* Object for creating the top-level game object. GUI should only use this
 * factory when creating a new game. For restoring a game, see GameSave.
 */
export const FactoryGame = function() {
    FactoryBase.call(this);
    this._verif = new Verify.Conf('Factory.Game');
    this._parser = ObjectShell.getParser();
    this.presetLevels = {};
    this.callbacks = {};
};
RG.extend2(FactoryGame, FactoryBase);

/* Restores a game from JSON representation. */
FactoryGame.prototype.restoreGame = function(json) {
    const fromJSON = new FromJSON();
    const game = new GameMain();
    return fromJSON.createGame(game, json);
};

/* Creates the game based on the selection. Main method that you want to
 * call. */
FactoryGame.prototype.createNewGame = function(conf: IFactoryGameConf) {
    this._verif.verifyConf('createNewGame', conf,
        ['sqrPerItem', 'sqrPerActor', 'playMode']);

    const game = new GameMain();
    if (Number.isInteger(conf.seed)) {
        const rng = new Random(conf.seed);
        game.setRNG(rng);
    }
    const player = this.createPlayerUnlessLoaded(conf);
    this.createPlayerRegenEvents(game, player);

    switch (conf.playMode) {
        case 'Arena':
            return this.createArenaDebugGame(conf, game, player);
        case 'Battle':
            return this.createDebugBattle(conf, game, player);
        case 'Creator':
            return this.createWorldWithCreator(conf, game, player);
        case 'World':
            return this.createFullWorld(conf, game, player);
        case 'OverWorld':
            return this.createOverWorldGame(conf, game, player);
        case 'Quests':
            return this.createQuestsDebugGame(conf, game, player);
        default:
            return this.createEmptyGame(conf, game, player);
    }
};

/* This is used mainly with the level Editor, to play test the created
 * levels with a player. */
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

/* Creates a player actor and starting inventory unless a game has been
 * restored, and obj contains obj.loadedPlayer. */
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
        player.add(new Component.Health(pConf.hp));
        this.addActorClass(obj, player);
        player.add(new Component.Skills());
        player.add(new Component.GameInfo());
        player.add(new Component.BodyTemp());
        player.add(new Component.Abilities());
    }

    if (!player.has('Hunger')) {
        const hunger = new Component.Hunger(20000);
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
    if (obj.playerName === 'Emilia') {
        RG.addCharStyle(RG.TYPE_ACTOR, player.getName(), 'E');
    }
    else if (obj.playerName === 'Oliver') {
        RG.addCharStyle(RG.TYPE_ACTOR, player.getName(), 'O');
    }
    return player;
};

/* Can be used to add player HP/PP regeneration events into the
 * scheduler of the game engine. */
FactoryGame.prototype.createPlayerRegenEvents = function(game, player) {
    // Add HP regeneration
    const regenPlayer = new Time.RegenEvent(player,
        RG.PLAYER_HP_REGEN_PERIOD * RG.ACTION_DUR);
    game.addEvent(regenPlayer);

    // Add PP regeneration (if needed)
    if (player.has('SpellPower')) {
        const regenPlayerPP = new Time.RegenPPEvent(player,
            RG.PLAYER_PP_REGEN_PERIOD * RG.ACTION_DUR);
        game.addEvent(regenPlayerPP);
    }
};

/* Adds the actor class to player, and creates starting equipment. */
FactoryGame.prototype.addActorClass = function(obj, player) {
    if (!obj.playerClass) {return;}
    if (ActorClass.hasOwnProperty(obj.playerClass)) {
        const actorClassComp = new Component.ActorClass();
        const actorClass = ActorClass.create(obj.playerClass, player);
        actorClassComp.setClassName(obj.playerClass);
        actorClassComp.setActorClass(actorClass);
        player.add(actorClassComp);

        const name = obj.playerClass;
        const items = ActorClass.getStartingItems(name);
        const eqs = ActorClass.getEquipment(name);

        // Create starting inventory
        FactoryItem.addItemsToActor(player, items);
        FactoryItem.equipItemsToActor(player, eqs);

        actorClass.setStartingStats();
        actorClass.advanceLevel(); // Advance to level 1
    }
    else {
        RG.err('Factory.Game', 'addActorClass',
            `${obj.playerClass} not found in ActorClass.`);
    }
};

FactoryGame.prototype.setCallback = function(name, cb) {
    this.callbacks[name] = cb;
};

FactoryGame.prototype.createOverWorldGame = function(obj: IFactoryGameConf, game, player) {
    const owMult = obj.owMultiplier || 1;
    const owConf: OWMapConf = FactoryGame.getOwConf(owMult, obj);
    const midX = Math.floor(owConf.nLevelsX / 2);
    const playerX = midX;
    const playerY = owConf.nLevelsY - 1;
    owConf.playerX = playerX;
    owConf.playerY = playerY;
    owConf.playerRace = obj.playerRace;
    owConf.createTerritory = true;

    const startTime = new Date().getTime();

    this.progress('Creating Overworld Tile Map...');
    const overworld = OWMap.createOverWorld(owConf);
    this.progress('DONE');

    if (!overworld._terrMap) {
        this.progress('Generating territory for clans/races...');
        const terrMap = this.createTerritoryMap(overworld, obj.playerRace,
            playerX, playerY);
        overworld.setTerrMap(terrMap);
        this.progress('DONE');
    }

    this.progress('Creating Overworld Level Map...');
    const worldAndConf = OverWorld.createOverWorldLevel(
      overworld, owConf);
    const [worldLevel, worldConf] = worldAndConf;
    this.progress('DONE');

    this.progress('Mapping settlements into territory areas..');
    this.mapZonesToTerritoryMap(overworld.getTerrMap(), worldConf);
    this.progress('DONE');

    this.progress('Splitting Overworld Level Map into AreaTiles...');
    const splitLevels = Builder.splitLevel(worldLevel, owConf);
    this.progress('DONE');

    this.progress('Creating and connecting World.Area tiles...');
    const worldArea = new World.Area('Ravendark', owConf.nLevelsX,
        owConf.nLevelsY, 100, 100, splitLevels);
    worldArea.connectTiles();
    this.progress('DONE');

    const factWorld = new FactoryWorld();
    factWorld.setOverWorld(overworld);
    factWorld.setGlobalConf(obj);
    game.setGlobalConf(obj);
    factWorld.setPresetLevels({Realm: splitLevels});

    worldConf.createAllZones = false;
    this.progress('Creating places and local zones...');
    const playerLevel = splitLevels[playerX][playerY];
    this.createPlayerHome(worldConf, player, playerLevel, playerX, playerY);
    this.createAreaLevelConstraints(worldConf, overworld.getTerrMap());
    const world = factWorld.createWorld(worldConf);
    game.addPlace(world);
    overworld.clearSubLevels();
    game.setOverWorld(overworld);
    game.setEnableChunkUnload(true);
    this.progress('DONE');

    this.progress('Adding player to the game...');

    this.placePlayer(player, playerLevel);
    POOL.emitEvent(RG.EVT_TILE_CHANGED, {actor: player,
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

FactoryGame.prototype.progress = function(msg: string): void {
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
FactoryGame.prototype.placePlayer = function(player: SentientActor, level: Level): void {
    const freeCells = level.getMap().getFree();
    const freeLUT = {};
    freeCells.forEach(c => {
        freeLUT[c.getKeyXY()] = true;
    });

    let cell = null;
    let found = false;
    let watchdog = 1000;
    const bSize = 2;
    const minFreeCells = ((2 * bSize + 1) ** 2 - 1);

    while (!found) {
        cell = RNG.arrayGetRand(freeCells);
        const [x, y] = cell.getXY();
        const box = Geometry.getBoxAround(x, y, bSize);
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
    const uniqueActors = ActorsData.filter(shell => shell.base === 'UniqueBase');
    const uniqueCreated = {};
    let uniquesAdded = 0;

    const disposition = this.getDisposition();

    const terrMapXY = terrMap.getMap();
    const citiesConf = worldConf.area[0].city;
    citiesConf.forEach(cityConf => {
        const {owX, owY} = cityConf;
        const char = terrMapXY[owX][owY];
        let name = terrMap.getName(char);
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

            // Possibly create the unique actor
            if (RG.isSuccess(0.07)) {
                const uniquesThisType = uniqueActors.filter(obj => (
                    obj.type === name
                ));
                if (uniquesThisType.length > 0) {
                    const randUnique = RNG.arrayGetRand(uniquesThisType);
                    if (!uniqueCreated.hasOwnProperty(randUnique.name)) {
                        const actorCreate = {name: randUnique.name, nLevel: 0};

                        let createConf = cityConf.quarter[0].create;
                        if (!createConf) {createConf = {};}
                        if (!createConf.actor) {createConf.actor = [];}
                        createConf.actor.push(actorCreate);

                        uniqueCreated[randUnique.name] = randUnique;
                        cityConf.quarter[0].create = createConf;
                        ++uniquesAdded;
                    }
                }
            }

        }
        else {
            // Mixed city, obtain values from area tile influence
            const [aX, aY] = this.getAreaXYFromOWTileXY(owX, owY);
            const weights = this.getConstrWeightsForAreaXY(aX, aY, terrMap);
            const types = Object.keys(weights);
            const hasWinterBeings = weights.hasOwnProperty('winterbeing');

            if (hasWinterBeings) {
                constrActor = {
                    op: 'eq', prop: 'base', value: ['WinterBeingBase']
                };
            }
            else if (types.length > 0) {
                name = RNG.getWeighted(weights);
                constrActor = [
                    {op: 'eq', prop: 'type', value: [name]},
                    {op: 'neq', prop: 'base', value: ['WinterBeingBase']}
                ];
            }
            else if (types.length === 0) {
                RG.log('factory.game.js', terrMap.mapToString());
                const owStr = `owX: ${owX}, owY: ${owY}`;
                RG.err('FactoryGame', 'mapZonesToTerritoryMap',
                    `No values for AreaTile ${aX},${aY}, ${owStr} found`);
            }
        }

        if (!cityConf.constraint) {cityConf.constraint = {};}
        cityConf.constraint.actor = constrActor;
        cityConf.constraint.disposition = disposition[name];

        cityConf.quarter.forEach(qConf => {
            if (!qConf.constraint) {qConf.constraint = {};}
            qConf.constraint.actor = constrActor;
            qConf.constraint.disposition = disposition[name];
            if (cityConf.constraint.cellsAround) {
                qConf.constraint.cellsAround = cityConf.constraint.cellsAround;
            }
        });
    });
};

FactoryGame.prototype.getDisposition = function() {
    const dispos = new Disposition(RG.ALL_RACES);
    dispos.randomize();
    return dispos.getTable();
};

FactoryGame.prototype.getAreaXYFromOWTileXY = function(owX, owY) {
    const coordMap = new OverWorld.CoordMap({xMap: 10, yMap: 10});
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

/* Creates the procgen constraints for given area level. This is used in
 * FactoryWorld when populating the levels with items/actors. */
FactoryGame.prototype.createAreaLevelConstraints = function(
    worldConf, terrMap: Territory
) {
    const areaConf = worldConf.area[0];
    const constraints = {};
    for (let x = 0; x < areaConf.maxX; x++) {
        for (let y = 0; y < areaConf.maxY; y++) {
            const weights = this.getConstrWeightsForAreaXY(x, y, terrMap);
            const types = Object.keys(weights);
            types.push('animal');
            constraints[x + ',' + y] = {
                actor: {op: 'eq', prop: 'type', value: types}
            };

            if (weights.hasOwnProperty('winterbeing')) {
                constraints[x + ',' + y].actor =
                    {op: 'eq', prop: 'base', value: 'WinterBeingBase'};
            }
        }
    }
    areaConf.constraint = constraints;
};

/* Given x,y for AreaTile, finds all rivals occupying at least one ow tile
 * tile that AreaTile, and returns them as array. */
FactoryGame.prototype.getConstrWeightsForAreaXY = function(aX, aY, terrMap) {
    const terrMapXY = terrMap.getMap();
    const coordMap = new CoordMap({xMap: 10, yMap: 10});

    const bbox = coordMap.getOWTileBboxFromAreaTileXY(aX, aY);
    const cells = Geometry.getCellsInBbox(terrMapXY, bbox);
    const hist = Geometry.histArrayVals(cells);
    let types = Object.keys(hist);
    types = types.filter(type => (type !== '#' && type !== '.'));

    const weights = {};
    types.forEach(typeChar => {
        const actualType = terrMap.getName(typeChar);
        weights[actualType] = hist[typeChar];
    });
    // types = types.map(typeChar => terrMap.getName(typeChar));
    return weights;
};

FactoryGame.prototype.createWorldWithCreator = function(obj, game, player) {
    const creator = new WorldConf();

    const conf = {name: 'World', worldSize: 'Small',
        areaSize: 'Small'
    };

    obj.world = WorldConf.createWorldConf(conf);
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
    const fact = new FactoryWorld();
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
    const fromJSON = new FromJSON();
    return arr.map(presetItem => {
        // Return the item itself if it's already Map.Level
        if (typeof presetItem.level.getID === 'function') {
            return presetItem;
        }

        const level = fromJSON.restoreLevel(presetItem.level);
        // Need to reset level + actors IDs for this game
        if (level.getID() < RG.LEVEL_ID_ADD) {
            level.setID(Level.createLevelID());
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
            nLevel: presetItem.nLevel,
            level
        };
    });
};

/* Can be used to create a short debugging game for testing.*/
FactoryGame.prototype.createArenaDebugGame = function(obj, game, player) {
    return new DebugGame(this, this._parser).createArena(obj, game, player);
};

FactoryGame.prototype.createQuestsDebugGame = function(obj, game, player) {
    const dbgGame = new DebugGame(this, this._parser);
    return dbgGame.createQuestsDebug(obj, game, player);
};

FactoryGame.prototype.createDebugBattle = function(obj, game, player) {
    const arenaGame = new DebugGame(this, this._parser);
    return arenaGame.createDebugBattle(obj, game, player);
};

FactoryGame.prototype.createOneDungeonAndBoss = function(obj, game, player) {
    const arenaGame = new DebugGame(this, this._parser);
    return arenaGame.createOneDungeonAndBoss(obj, game, player);
};


FactoryGame.getOwConf = function(mult = 1, obj: any = {}): OWMapConf {
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
    if (obj.owConf) {
        Object.keys(obj.owConf).forEach(key => {
            owConf[key] = obj.owConf[key];
        });
    }
    console.log('owConf is', owConf);
    return owConf;
};
