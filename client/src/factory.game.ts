
import RG from './rg';

import * as Component from './component';
import * as Time from './time';
import * as Verify from './verify';
import * as World from './world';
import {ActorClass} from './actor-class';
import {ActorsData} from '../data/actors';
import {ActorMods} from '../data/actor-mods';
import {DebugGame} from '../data/debug-game';
import {Disposition, IDispTable} from './disposition';
import {Entity} from './entity';
import {EventPool} from '../src/eventpool';
import {FactoryBase} from './factory';
import {FactoryItem} from './factory.items';
import {FactoryWorld} from './factory.world';
import {FromJSON} from './game.fromjson';
import {GameMain} from './game';
import {Geometry} from './geometry';
import {Builder} from './builder';
import {OWMap} from './overworld.map';
import {ObjectShell} from './objectshellparser';
import {OverWorld, CoordMap} from './overworld';
import {Random} from './random';
import {TerritoryMap} from '../data/territory-map';
//rm import {Texts} from '../data/texts';
import {Territory} from './territory';
import {WorldConf} from './world.creator';
import {Level} from './level';
import {SentientActor} from './actor';
//rm import {Names} from '../data/name-gen';

type Parser = import('./objectshellparser').Parser;

import * as IF from './interfaces';

import {ACTOR_CLASSES} from '../src/actor-class';
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
export class FactoryGame {

    public static getOwConf(mult = 1, obj: any = {}): IF.OWMapConf {
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
            nTilesY: yMult * mult * 4,
            verify: true
        };
        if (obj.owConf) {
            Object.keys(obj.owConf).forEach(key => {
                owConf[key] = obj.owConf[key];
            });
        }
        return owConf;
    }

    public static getGameConf() {
        return {
            cols: 60,
            rows: 30,
            levels: 2,

            seed: new Date().getTime(),

            playerLevel: 'Medium',
            levelSize: 'Medium',
            playerClass: ACTOR_CLASSES[0],
            playerRace: RG.ACTOR_RACES[0],

            sqrPerActor: 120,
            sqrPerItem: 120,
            playMode: 'OverWorld',
            loadedPlayer: null,
            loadedLevel: null,
            playerName: 'Player',
            world: WorldConf,
            /*
            xMult: 2,
            yMult: 3
            */
            xMult: 1,
            yMult: 1
        };
    }

    public callbacks: {[key: string]: (...args: any[]) => void};

    protected _verif: Verify.Conf;
    protected _parser: Parser;
    protected presetLevels: {[key: string]: Level};
    protected _factBase: FactoryBase;
    protected timePrev: number;
    protected prevMsg: string;

    constructor() {
        // FactoryBase.call(this);
        this._verif = new Verify.Conf('Factory.Game');
        this._parser = ObjectShell.getParser();
        this.presetLevels = {};
        this.callbacks = {};
        this._factBase = new FactoryBase();
    }

    /* Restores a game from JSON representation. */
    public restoreGame(json): GameMain {
        const fromJSON = new FromJSON();
        const game = new GameMain();
        return fromJSON.createGame(game, json);
    }

    /* Creates the game based on the selection. Main method that you want to
     * call. */
    public createNewGame(conf: IF.IFactoryGameConf): GameMain {
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
            case 'World':
                return this.createFullWorld(conf, game, player);
            case 'OverWorld':
                return this.createOverWorldGame(conf, game, player);
            case 'Quests':
                return this.createQuestsDebugGame(conf, game, player);
            case 'Sandbox':
                return this.createSandboxGame(conf, game, player);
            default:
                return this.createEmptyGame(conf, game, player);
        }
    }

    /* This is used mainly with the level Editor, to play test the created
     * levels with a player. */
    public createEmptyGame(obj, game: GameMain, player: SentientActor): GameMain {
        // Add given levels to the game
        if (obj.levels) {
            obj.levels.forEach((level: Level) => {
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
    }

    /* Creates a player actor and starting inventory unless a game has been
     * restored, and obj contains obj.loadedPlayer. */
    public createPlayerUnlessLoaded(obj): SentientActor {
        let player = obj.loadedPlayer;
        if (RG.isNullOrUndef([player])) {
            this._verif.verifyConf('createPlayerUnlessLoaded', obj,
                ['playerLevel', 'playerRace', 'playerName']);
            const expLevel = obj.playerLevel;
            const pConf = confPlayerStats[expLevel];

            player = this._factBase.createPlayer(obj.playerName, {
                att: pConf.att, def: pConf.def, prot: pConf.prot
            });

            player.setType(obj.playerRace);
            player.add(new Component.Health(pConf.hp));
            this.addActorClass(obj, player);

            this.addRaceStuff(obj, player);
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
    }

    /* Can be used to add player HP/PP regeneration events into the
     * scheduler of the game engine. */
    public createPlayerRegenEvents(game: GameMain, player: SentientActor) {
        // Add HP/PP regeneration
        if (!player.has('Regeneration')) {
            const regen = new Component.Regeneration();
            regen.setMaxWaitPP(RG.PLAYER_PP_REGEN_PERIOD);
            regen.setMaxWaitHP(RG.PLAYER_HP_REGEN_PERIOD);
            regen.setHP(1);
            regen.setPP(1);
            player.add(regen);
        }
    }

    /* Adds the actor class to player, and creates starting equipment. */
    public addActorClass(obj, player: SentientActor) {
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
    }

    public addRaceStuff(obj, player: SentientActor) {
        const {playerRace} = obj;
        if (!ActorMods[playerRace]) {return;}
        const raceMods = (ActorMods[playerRace] as IF.IActorMods).player;
        // First add generic items for the given race
        const items = raceMods.startingItems;
        const eqs = raceMods.equipment;
        FactoryItem.addItemsToActor(player, items);
        FactoryItem.equipItemsToActor(player, eqs);

        // Then add some flavor with specific race-actor class, if applicable
        // Each race could have 1-2 preferred classes to get better items
        const {playerClass} = obj;
        if (raceMods.hasOwnProperty(playerClass)) {
            const mods = raceMods[playerClass];
            const classItems = mods.startingItems;
            const classEqs = mods.equipment;
            if (classItems) {
                FactoryItem.addItemsToActor(player, classItems);
            }
            if (classEqs) {
                FactoryItem.equipItemsToActor(player, classEqs);
            }
        }
    }

    public setCallback(name: string, cb: (...args: any[]) => void) {
        this.callbacks[name] = cb;
    }

    public createOverWorldGame(obj: IF.IFactoryGameConf, game, player) {
        const owMult = obj.owMultiplier || 1;
        const owConf: IF.OWMapConf = FactoryGame.getOwConf(owMult, obj);
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

        if (!overworld.hasTerrMap()) {
            this.progress('Generating territory for clans/races...');
            const terrMap = this.createTerritoryMap(overworld, obj.playerRace,
                playerX, playerY);
            overworld.setTerrMap(terrMap);
            this.progress('DONE');
        }

        this.progress('Creating Overworld Level Map...');
        const worldAndConf = OverWorld.createOverWorldLevel(
          overworld, owConf);
        const [worldLevel, worldConf]: [Level, IF.WorldConf] = worldAndConf;
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

        this.modifyConfForHometown(worldConf, player, playerLevel);
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

        let enterMsg = 'You have decided to venture outside your home village.';
        enterMsg += ' You feel there is something drawing you towards the North.';
        RG.gameMsg(enterMsg);
        this.progress('DONE');

        const endTime = new Date().getTime();
        const totalDur = endTime - startTime;
        this.progress('World generation took ' + totalDur + ' ms.');
        // RG.Verify.verifyStairsConnections(game, 'Factory.Game');
        // this.progress('Stairs connections verified');
        return game;
    }

    public progress(msg: string): void {
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
    }

    /* Places player into a free cell surrounded by other free cells. */
    public placePlayer(player: SentientActor, level: Level): void {
        // Check if the location has already been set
        const [pX, pY] = player.getXY();
        if (pX >= 0 && pY >= 0) {
            level.addActor(player, pX, pY);
            return;
        }

        const freeCells = level.getMap().getFree();
        const freeLUT: {[key: string]: boolean} = {};
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

        if (found && cell) {
            level.addActor(player, cell.getX(), cell.getY());
        }
        else {
            level.addActorToFreeCell(player);
        }
    }

    public createTerritoryMap( ow, playerRace, playerX, playerY) {
        return TerritoryMap.create(ow, playerRace, [playerX, playerY]);
    }

    /* Matches each zone with territory map, and adds some generation
     * constraints.
     */
    public mapZonesToTerritoryMap(terrMap, worldConf: IF.WorldConf): void {
        const uniqueActors = ActorsData.filter(shell => shell.base === 'UniqueBase');
        const uniqueCreated = {};
        let uniquesAdded = 0;

        const disposition = this.getDisposition();

        const terrMapXY = terrMap.getMap();
        const citiesConf: IF.CityConf[] = worldConf.area[0].city;
        citiesConf.forEach((cityConf: IF.CityConf) => {
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
                            cityConf.hasUniques = true;
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
                    // TODO could add some enslaved actors
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
    }

    public getDisposition(): IDispTable {
        const dispos = new Disposition(RG.ALL_RACES, {});
        dispos.randomize();
        return dispos.getTable();
    }

    public getAreaXYFromOWTileXY(owX: number, owY: number) {
        const coordMap = new OverWorld.CoordMap({xMap: 10, yMap: 10});
        return coordMap.getAreaXYFromOWTileXY(owX, owY);
    }

/* Creates the starting home village for the player. */
    public modifyConfForHometown(
        worldConf: IF.WorldConf, player, level: Level
    ): void {
        // Extract fee cell for home town, not adjacent to connection

        const areaConf: IF.AreaConf = worldConf.area[0]!;
        const homeConf: IF.CityConf = areaConf.city!.find((cityConf: IF.CityConf) => (
            cityConf.tags && cityConf.tags.indexOf('hometown') >= 0
        ));

        if (!homeConf) {
            console.log(JSON.stringify(areaConf.city, null, 1));
            RG.err('FactoryGame', 'modifyConfForHometown',
                'Unable to find city conf with "hometown" tag.');
            return;
        }

        homeConf.friendly = true;
        homeConf.quarter[0].create = {
            actor: [
                {name: 'chicken', num: 15, nLevel: 0}
            ]
        };
        player.setXY(homeConf.levelX, homeConf.levelY);
        if (!homeConf.constraint) {
            RG.err('FactoryGame', 'modifyConfForHometown',
                'No homeConf.constraint found. Something went wrong in ow generation');
            return;
        }
        homeConf.constraint.actor = [
            {op: 'eq', prop: 'type', value: [player.getType()]},
            {op: 'neq', prop: 'base', value: ['WinterBeingBase']}
        ];
        homeConf.constraint.shop = [{op: '<=', prop: 'value', value: 50}];

        if (!homeConf.quarter[0].create) {homeConf.quarter[0].create = {};}
        homeConf.quarter[0].create = Object.assign(homeConf.quarter[0].create,
            {actor: [{name: 'chicken', num: 15, nLevel: 0}]});

        homeConf.name += ', home town of ' + player.getName();
        /*
        const homeConf: IF.CityConf = {
            name: uniqName + ', home town of ' + player.getName(),
            x: playerX, y: playerY,
            levelX: lX, levelY: lY,
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
                ],
                cellsAround: Geometry.getCellsAround(level.getMap(), cell)
            },
            quarter: [{
                name: 'Town Square',
                nLevels: 1,
                entranceLevel: 0,
                nShops: 1,
                create: {
                    actor: [
                        {name: 'chicken', num: 15, nLevel: 0}
                    ]
                },
            }],
            addComp: [
                {comp: 'Lore', func: {
                    addEntry: {topic: 'mainQuest', respMsg: Texts.mainQuest}
                }}
            ]
        };
        */

        // player.setXY(lX, lY);
        // areaConf.city!.push(homeConf);
        // console.log('Creating player hometown with conf', JSON.stringify(homeConf, null, 1));
    }

/* Creates the procgen constraints for given area level. This is used in
 * FactoryWorld when populating the levels with items/actors. */
    public createAreaLevelConstraints(worldConf, terrMap: Territory) {
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
    }

/* Given x,y for AreaTile, finds all rivals occupying at least one ow tile
 * tile that AreaTile, and returns them as array. */
    public getConstrWeightsForAreaXY(aX: number, aY: number, terrMap: Territory) {
        const terrMapXY: string[][] = terrMap.getMap();
        const coordMap = new CoordMap({xMap: 10, yMap: 10});

        const bbox = coordMap.getOWTileBboxFromAreaTileXY(aX, aY);
        const cells: string[] = Geometry.getCellsInBbox(terrMapXY, bbox);
        const hist = Geometry.histArrayVals(cells);
        let types = Object.keys(hist);
        types = types.filter(type => (type !== '#' && type !== '.'));

        const weights = {};
        types.forEach(typeChar => {
            const actualType = terrMap.getName(typeChar);
            weights[actualType] = hist[typeChar];
        });
        return weights;
    }

    public createFullWorld(obj, game, player) {
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
    }

/* Creates all preset levels specified in the world configuration. */
    public processPresetLevels(conf) {
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
    }

    public createPresetLevels(arr) {
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
            RG.setAllExplored(level);
            return {
                nLevel: presetItem.nLevel,
                level
            };
        });
    }

/* Can be used to create a short debugging game for testing.*/
    public createArenaDebugGame(obj, game, player) {
        return new DebugGame(this, this._parser).createArena(obj, game, player);
    }

    public createQuestsDebugGame(obj, game, player) {
        const dbgGame = new DebugGame(this, this._parser);
        return dbgGame.createQuestsDebug(obj, game, player);
    }

    public createDebugBattle(obj, game, player) {
        const arenaGame = new DebugGame(this, this._parser);
        return arenaGame.createDebugBattle(obj, game, player);
    }

    public createOneDungeonAndBoss(obj, game, player) {
        const arenaGame = new DebugGame(this, this._parser);
        return arenaGame.createOneDungeonAndBoss(obj, game, player);
    }

    public createSandboxGame(obj, game, player) {
        const dbgGame = new DebugGame(this, this._parser);
        return dbgGame.createSandboxGame(obj, game, player);
    }

} // class FactoryGame
