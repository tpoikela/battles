
import LevelFactory from '../data/level-factory';
import Constraints from './constraints';

const debug = require('debug')('bitn:Factory.World');

const RG = require('./rg');
const ConfStack = require('./conf-stack');
RG.Factory = require('./factory');

const Stairs = RG.Element.Stairs;
const ZONE_TYPES = ['City', 'Mountain', 'Dungeon', 'BattleZone'];

/* Determines the x-y sizes for different types of levels. */
const levelSizes = {
    tile: {
        Small: {x: 40, y: 20},
        Medium: {x: 60, y: 30},
        Large: {x: 80, y: 40},
        Huge: {x: 140, y: 60}
    },
    mountain: {
        Small: {x: 40, y: 20},
        Medium: {x: 60, y: 30},
        Large: {x: 80, y: 40},
        Huge: {x: 140, y: 60}
    },
    dungeon: {
        Small: {x: RG.LEVEL_SMALL_X, y: RG.LEVEL_SMALL_Y},
        Medium: {x: RG.LEVEL_MEDIUM_X, y: RG.LEVEL_MEDIUM_Y},
        Large: {x: RG.LEVEL_LARGE_X, y: RG.LEVEL_LARGE_Y},
        Huge: {x: RG.LEVEL_HUGE_X, y: RG.LEVEL_HUGE_Y}
    },
    city: {
        Small: {x: 40, y: 20},
        Medium: {x: 60, y: 30},
        Large: {x: 80, y: 40},
        Huge: {x: 140, y: 60}
    }
};

/* Used to add details like bosses and distinct room features into dungeon
 * levels. */
const DungeonFeatures = function(zoneType) {
    this._zoneType = zoneType;

    /* Adds special features to the last level of the zone. */
    this.addLastLevelFeatures = function(nLevel, level, conf) {
        const exploreElem = new RG.Element.Exploration();
        const expPoints = 10 * (nLevel + 1) * conf.maxDanger;
        exploreElem.setExp(expPoints);
        exploreElem.setData({zoneType: this._zoneType});
        level.addElement(exploreElem);

        const bossActor = this.generateBoss(nLevel, level, conf);

        if (bossActor) {
            this.addMinions(bossActor, nLevel, level, conf);
        }
        else {
            let msg = `Failed to created boss. nLevel: ${nLevel}`;
            msg += ` Level parent: ${level.getParent()}`;
            RG.debug({}, msg);
        }

    };

    this.generateBoss = (nLevel, level, conf) => {
        const parser = RG.ObjectShell.getParser();
        const bossDanger = conf.maxDanger + 2;
        const bossActor = parser.createRandomActor(
            {func: actor => (
                actor.danger <= bossDanger && actor.danger >= conf.maxDanger
            )}
        );
        if (bossActor) {
            level.addActorToFreeCell(bossActor);
            const prizeValue = conf.maxValue * 2;
            const prizeItem = parser.createRandomItem(
                {func: item => item.value <= prizeValue}
            );
            bossActor.getInvEq().addItem(prizeItem);

        }
        return bossActor;
    };

    this.addMinions = (boss, nLevel, level, conf) => {
        const parser = RG.ObjectShell.getParser();
        const bossType = boss.getType();
        const isSwarm = RG.RAND.getUniform() <= 0.5;
        let numMinions = nLevel + 1;
        let dangerMinion = conf.maxDanger;
        if (isSwarm) {
            numMinions *= 2;
            dangerMinion -= 1;
        }
        const dist = Math.round(Math.sqrt(numMinions)) + 1;
        const cells = RG.Brain.getBoxOfFreeCellsAround(boss, dist);
        RG.RAND.shuffle(cells);

        const minionFunc = actor => (
            actor.danger <= dangerMinion && actor.type === bossType
        );

        while (cells.length > 0 && numMinions > 0) {
            const currCell = cells.pop();
            --numMinions;
            const minion = parser.createRandomActor({func: minionFunc});
            if (minion) {
                const [x, y] = [currCell.getX(), currCell.getY()];
                level.addActor(minion, x, y);
            }
        }

    };

};

/* Factory object for creating worlds and zones. Uses conf object which is
 * somewhat involved. For an example, see ../data/conf.world.js. This Factory
 * does not have any procedural generation. The configuration object can be
 * generated procedurally, and the factory will then use the configuration for
 * building the world. Separation of concerns, you know.
 */
RG.Factory.World = function() {
    const _verif = new RG.Verify.Conf('Factory.World');
    this.factZone = new RG.Factory.Zone();

    // Creates all zones when the area is created if true. Setting it to true
    // makes creation of game very slow, as the full game is built in one go
    this.createAllZones = true;
    this.worldElemByID = {}; // Stores world elements by ID

    this.presetLevels = {};

    this._conf = new ConfStack();

    // Can be used to pass already created levels to different zones. For
    // example, after restore game, no new levels should be created
    this.id2level = {};
    this.id2levelSet = false;
    this.id2entity = {};

    //----------------------------------------------------------------------
    // FUNCTIONS
    //----------------------------------------------------------------------

    this.setPresetLevels = function(levels) {
        this.presetLevels = levels;
    };

    /* If id2level is set, factory does not construct any levels. It uses
     * id2level as a lookup table instead. This is mainly used when restoring a
     * saved game. */
    this.setId2Level = function(id2level) {
        this.id2level = id2level;
        this.id2levelSet = true;
    };

    /* Pushes the hier name and configuration on the stack. Config can be
    * queried with getConf(). */
    this.pushScope = function(conf) {
        this._conf.pushScope(conf);
    };

    /* Removes given config and the name it contains from stacks. Reports an
    * error if removed name does not match the name in conf. */
    this.popScope = function(conf) {
        this._conf.popScope(conf);
    };

    /* Initializes the global configuration such as level size. */
    this.setGlobalConf = function(conf = {}) {
        const levelSize = conf.levelSize || 'Medium';
        const sqrPerActor = conf.sqrPerActor || RG.ACTOR_MEDIUM_SQR;
        const globalConf = {};
        globalConf.levelSize = levelSize;
        globalConf.dungeonX = levelSizes.dungeon[levelSize].x;
        globalConf.dungeonY = levelSizes.dungeon[levelSize].y;
        globalConf.sqrPerActor = sqrPerActor;
        globalConf.sqrPerItem = conf.sqrPerItem || RG.LOOT_MEDIUM_SQR;
        globalConf.set = true;
        this._conf.setGlobalConf(globalConf);
        this.debug('globalConf set to ' + JSON.stringify(globalConf));
    };

    this.getGlobalConf = function() {
        return this._conf.getGlobalConf();
    };

    /* Returns a config value. */
    this.getConf = function(keys) {
        return this._conf.getConf(keys);
    };

    /* Returns the full hierarchical name of the zone. */
    this.getHierName = () => this._conf.getScope().join('.');

    /* Creates a world using given configuration. */
    this.createWorld = function(conf) {
        _verif.verifyConf('createWorld', conf, ['name', 'nAreas']);
        if (!this.getGlobalConf().set) {
            this.setGlobalConf({});
        }
        if (conf.hasOwnProperty('createAllZones')) {
            this.createAllZones = conf.createAllZones;
            this.debug('createAllZones set to ' + this.createAllZones);
        }
        this.pushScope(conf);
        const world = new RG.World.Top(conf.name);
        world.setConf(conf);
        for (let i = 0; i < conf.nAreas; i++) {
            const areaConf = conf.area[i];
            const area = this.createArea(areaConf);
            if (areaConf.zonesCreated) { // Only during restore game
                this.restoreCreatedZones(world, area, areaConf);
            }
            world.addArea(area);
            this.addWorldID(areaConf, area);
        }
        this.popScope(conf);
        this.addWorldID(conf, world);
        return world;
    };


    /* Creates an area which can be added to a world. */
    this.createArea = function(conf) {
        _verif.verifyConf('createArea', conf,
            ['name', 'maxX', 'maxY']);
        this.pushScope(conf);

        const hierName = this.getHierName();

        let areaLevels = null;
        if (this.id2levelSet) {
            areaLevels = this.getAreaLevels(conf);
        }
        else {
            areaLevels = this.getPresetLevels(hierName);
            if (!areaLevels || areaLevels.length === 0) {
                areaLevels = null;
            }
        }

        const area = new RG.World.Area(conf.name, conf.maxX, conf.maxY,
            conf.cols, conf.rows, areaLevels);
        area.setConf(conf);
        area.setHierName(this.getHierName());

        // When player enters a given area tile, create zones for that tile
        if (this.createAllZones) {
            this._createAllZones(area, conf);
            area.markAllZonesCreated();
        }
        else {
            this.debug('Skipping the zone creating due to createZones=false');
        }
        this.popScope(conf);
        return area;
    };

    this.restoreCreatedZones = (world, area, areaConf) => {
        Object.keys(areaConf.zonesCreated).forEach(xy => {
            const [xStr, yStr] = xy.split(',');
            const [x, y] = [parseInt(xStr, 10), parseInt(yStr, 10)];
            if (areaConf.zonesCreated[xy]) {
                this.debug(`\tRestoring created zones for tile ${x},${y}`);
                this.createZonesForTile(world, area, x, y);
            }
        });
    };

    /* Creates zones for given area tile x,y with located in area areaName. */
    this.createZonesForTile = function(world, area, x, y) {
        // Setup the scope & conf stacks
        if (!area.tileHasZonesCreated(x, y)) {
            this.populateAreaLevel(area, x, y);
            this.debug(`Creating Area ${x},${y} zones`);
            const worldConf = world.getConf();
            this.pushScope(worldConf);
            const areaConf = area.getConf();
            this.pushScope(areaConf);

            this._createAllZones(area, areaConf, x, y);
            area.markTileZonesCreated(x, y);

            // Cleanup the scope & conf stacks
            this.popScope(areaConf);
            this.popScope(worldConf);
        }
        else {
            this.debug(`Area ${x},${y} zones already created`);
        }
    };

    this.populateAreaLevel = function(area, x, y) {
        console.log(`Populating area [${x}][${y}]`);
        const playerX = Math.floor(area.getSizeX() / 2);
        const playerY = area.getSizeY() - 1;
        const parser = RG.ObjectShell.getParser();

        const level = area.getTileXY(x, y).getLevel();

        const xDiff = Math.abs(playerX - x);
        const yDiff = playerY - y;

        const itemsPerLevel = 7 + xDiff + 2 * yDiff;
        const actorsPerLevel = (yDiff + 1) * 10 + 2 * xDiff;

        const fact = new RG.Factory.Base();
        fact.setParser(parser);

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
        fact.addNRandItems(level, parser, itemConf);

        let maxDanger = yDiff + xDiff;
        if (maxDanger < 2) {maxDanger = 2;}

        const actorConf = {
            actorsPerLevel, maxDanger
        };
        fact.addNRandActors(level, parser, actorConf);

        console.log(`Populating area [${x}][${y}] FINISHED`);

    };

    this._createAllZones = function(area, conf, tx = -1, ty = -1) {
        this.debug(`_createAllZones ${tx}, ${ty}`);
        if (!conf.tiles) {
            this.createZonesFromArea(area, conf, tx, ty);
        }
        else {
            if (tx < 0 || ty < 0) {
                RG.err('Factory', 'createAllZones',
                    'Cannot use -1 to create all tiles here');
            }
            const areaTileConf = conf.tiles[tx][ty];
            this.createZonesFromTile(area, areaTileConf, tx, ty);
        }
    };

    this.createZonesFromArea = function(area, conf, tx = -1, ty = -1) {
        ZONE_TYPES.forEach(type => {
            const typeLc = type.toLowerCase();
            const createFunc = 'create' + type;
            let nZones = 0;
            if (Array.isArray(conf[typeLc])) {
                nZones = conf[typeLc].length;
            }
            this.debug(`\tnZones (${type}) is now ${nZones}`);

            for (let i = 0; i < nZones; i++) {
                const zoneConf = conf[typeLc][i];
                const {x, y} = zoneConf;

                // If tx,ty given, create only zones for tile tx,ty
                // Otherwise, create zones for all tiles
                if ((tx === -1 || tx === x) && (ty === -1 || ty === y)) {
                    const zone = this[createFunc](zoneConf);
                    zone.setTileXY(x, y);
                    area.addZone(type, zone);
                    this.addWorldID(zoneConf, zone);
                    if (!this.id2levelSet) {
                        this.createAreaZoneConnection(area, zone, zoneConf);
                    }
                }
            }

        });
    };

    /* Used when 'tiles' exists inside areaConf. Usually when restoring a saved
     * game. */
    this.createZonesFromTile = function(area, areaTileConf, tx, ty) {
        ZONE_TYPES.forEach(type => {
            const typeLc = type.toLowerCase();
            let nZones = 0;
            if (Array.isArray(areaTileConf[typeLc])) {
                nZones = areaTileConf[typeLc].length;
            }
           this.debug(`\t[${tx}][${ty}]: nZones (${type}) is now ${nZones}`);
            for (let i = 0; i < nZones; i++) {
                console.log(`Creating zone ${i} for tile [${tx}][${ty}`);
                const zoneConf = areaTileConf[typeLc][i];
                const createFunc = 'create' + type;
                const {x, y} = zoneConf;

                // If tx,ty given, create only zones for tile tx,ty
                // Otherwise, create zones for all tiles
                if ((tx === -1 || tx === x) && (ty === -1 || ty === y)) {
                    const zone = this[createFunc](zoneConf);
                    zone.setTileXY(x, y);
                    area.addZone(type, zone);
                    this.addWorldID(zoneConf, zone);
                    if (!this.id2levelSet) {
                        this.createAreaZoneConnection(area, zone, zoneConf);
                    }
                }
            }

        });
    };

    /* Used when creating area from existing levels. Uses id2level lookup table
     * to construct 2-d array of levels.*/
    this.getAreaLevels = function(conf) {
        const levels = [];
        if (conf.tiles) {
            conf.tiles.forEach((tileCol) => {
                const levelCol = [];
                tileCol.forEach((tile) => {
                    const level = this.id2level[tile.level];
                    if (level) {
                        levelCol.push(level);
                    }
                    else {
                        RG.err('Factory.World', 'getAreaLevels',
                            `No level ID ${tile.level} in id2level`);
                    }
                });
                levels.push(levelCol);
            });
        }
        else {
            RG.err('Factory.World', 'getAreaLevels',
                'conf.tiles null/undefined, but id2levelSet true');

        }
        return levels;
    };

    this.createDungeon = function(conf) {
        _verif.verifyConf('createDungeon', conf,
            ['name', 'nBranches']);
        this.pushScope(conf);

        const dungeon = new RG.World.Dungeon(conf.name);
        dungeon.setHierName(this.getHierName());

        if (conf.nBranches !== conf.branch.length) {
            const len = conf.branch.length;
            RG.err('Factory.World', 'createDungeon',
                `Branch number mismatch [] = ${len}, n: ${conf.nBranches}`);
        }

        for (let i = 0; i < conf.nBranches; i++) {
            const branchConf = conf.branch[i];
            const branch = this.createBranch(branchConf);
            dungeon.addBranch(branch);
            this.addWorldID(branchConf, branch);
        }

        if (conf.entrance) {
            dungeon.setEntrance(conf.entrance);
        }

        // Connect branches according to configuration
        if (!this.id2levelSet) {
            if (conf.nBranches > 1) {
                if (conf.connectLevels) {
                    conf.connectLevels.forEach(conn => {
                        if (conn.length === 4) {
                            // conn has len 4, spread it out
                            dungeon.connectSubZones(...conn);
                        }
                        else {
                            RG.err('Factory.World', 'createDungeon',
                                'Each connection.length must be 4.');
                        }
                    });
                }
                else {
                    RG.err('Factory.World', 'createDungeon',
                        'nBranches > 1, but no conf.connectLevels.');
                }
            }
        }

        this.popScope(conf);
        return dungeon;
    };

    /* Creates one dungeon branch and all levels inside it. */
    this.createBranch = function(conf) {
        _verif.verifyConf('createBranch', conf,
            ['name', 'nLevels']);
        this.pushScope(conf);

        const branch = new RG.World.Branch(conf.name);
        const hierName = this.getHierName();
        branch.setHierName(hierName);

        const presetLevels = this.getPresetLevels(hierName);

        for (let i = 0; i < conf.nLevels; i++) {
            const maxDanger = this.getConf('maxDanger');
            const maxValue = this.getConf('maxValue');

            const levelConf = {
                x: this.getConf('dungeonX'),
                y: this.getConf('dungeonY'),
                sqrPerActor: this.getConf('sqrPerActor'),
                sqrPerItem: this.getConf('sqrPerItem'),
                maxValue: maxValue || 20 * (i + 1),
                maxDanger: maxDanger || 2,
                nLevel: i
            };

            const dungeonType = this.getConf('dungeonType');
            if (dungeonType) {
                levelConf.dungeonType = dungeonType;
            }

            this.setLevelConstraints(levelConf);

            // First try to find a preset level
            let level = this.getFromPresetLevels(i, presetLevels);

            // If preset not found, either restore or create a new one
            if (!level) {
                if (conf.levels) { // Restore level
                    level = this.id2level[conf.levels[i]];
                }
                else {
                    level = this.factZone.createDungeonLevel(levelConf);
                    // For creating 'fixed' items and actors
                    this.addFixedFeatures(i, level, branch);
                    const dungFeat = new DungeonFeatures('dungeon');
                    if (i === (conf.nLevels - 1)) {
                        dungFeat.addLastLevelFeatures(i, level, levelConf);
                    }
                }
            }

            branch.addLevel(level);
        }

        // Do connecting only if not restoring the branch
        if (!this.id2levelSet) {
            branch.connectLevels();
            if (conf.hasOwnProperty('entranceLevel')) {
                branch.addEntrance(conf.entranceLevel);
            }
        }
        else if (conf.hasOwnProperty('entrance')) {
            branch.setEntranceLocation(conf.entrance);
        }

        this.popScope(conf);
        return branch;
    };

    /* Returns a level from presetLevels if any exist for the current level
     * number. */
    this.getFromPresetLevels = function(i, presetLevels) {
        let level = null;
        if (presetLevels.length > 0) {
            const levelObj = presetLevels.find(lv => lv.nLevel === i);
            if (levelObj) {
                level = levelObj.level;
            }
        }
        return level;
    };

    const _errorOnFunc = val => {
        if (typeof val === 'function') {
            RG.err('Factory', '_errorOnFunc',
                `Function constraint not supported anymore: ${val.toString}`);
        }
    };

    /* Sets the randomization constraints for the level based on current
     * configuration. */
    this.setLevelConstraints = function(levelConf) {
        const constraint = this.getConf('constraint');
        const constrFact = new Constraints();
        if (constraint) {
            const hierName = this.getHierName();
            if (constraint.actor) {
                _errorOnFunc(constraint.actor);
                levelConf.actor = constrFact.getConstraints(constraint.actor);
                const str = constraint.actor.toString();
                this.debug(`Found actor constraint for ${hierName}: ${str}`);
            }
            if (constraint.item) {
                _errorOnFunc(constraint.item);
                levelConf.item = constrFact.getConstraints(constraint.item);
                const str = constraint.item.toString();
                this.debug(`Found item constraint for ${hierName}: ${str}`);
            }
            if (constraint.food) {
                _errorOnFunc(constraint.food);
                levelConf.food = constrFact.getConstraints(constraint.food);
                const str = constraint.food.toString();
                this.debug(`Found food constraint for ${hierName}: ${str}`);
            }
            if (constraint.gold) {
                _errorOnFunc(constraint.gold);
                levelConf.gold = constrFact.getConstraints(constraint.gold);
                const str = constraint.gold.toString();
                this.debug(`Found gold constraint for ${hierName}: ${str}`);
            }
            if (constraint.shop) {
                const shopFunc = [];
                constraint.shop.forEach(con => {
                    shopFunc.push(constrFact.getConstraints(con));
                });
                levelConf.shopFunc = shopFunc;
                const str = JSON.stringify(constraint.shop);
                this.debug(`Found shop constraint for ${hierName}: ${str}`);
            }
        }

        const groupType = this.getConf('groupType');
        const cityType = this.getConf('cityType');
        const quarterType = this.getConf('quarterType');
        const alignment = this.getConf('alignment');
        const wallType = this.getConf('wallType');
        const floorType = this.getConf('floorType');
        if (groupType) {levelConf.groupType = groupType;}
        if (cityType) {levelConf.cityType = cityType;}
        if (quarterType) {levelConf.cityType = quarterType;}
        if (alignment) {levelConf.alignment = alignment;}
        if (wallType) {levelConf.wallType = wallType;}
        if (floorType) {levelConf.floorType = floorType;}
    };

    /* Adds fixed features such as stairs, actors and items into the level. */
    this.addFixedFeatures = function(nLevel, level, zone) {
        const create = this.getConf('create');

        // Actor creation
        if (create && create.actor) {
            const createActors = create.actor;
            createActors.forEach(createActor => {
                if (createActor.nLevel === nLevel) {
                    const actorName = createActor.name;
                    if (createActor.hasOwnProperty('target') &&
                        zone.getName() === createActor.target) {
                        this.factZone.addActorToLevel(actorName, level);
                    }
                    else {
                        this.factZone.addActorToLevel(actorName, level);
                    }
                }
            });
        }

        // Stairs creation
        if (create && create.stairs) {
            const createStairs = create.stairs;
            createStairs.forEach(sConf => {
                if (sConf.nLevel === nLevel) {
                    const {x, y, isDown} = sConf;
                    const name = isDown ? 'stairsDown' : 'stairsUp';
                    const stairs = new Stairs(name, level);
                    level.addStairs(stairs, x, y);
                }
            });
        }
    };

    /* Returns preset levels (if any) for the current zone. */
    this.getPresetLevels = function(hierName) {

        // First check the configuration
        const presetLevels = this.getConf('presetLevels');
        if (presetLevels) {
            const names = Object.keys(presetLevels);
            foundKey = names.find(item => {
                return new RegExp(item + '$').test(hierName);
            });
            if (foundKey) {
                return presetLevels[foundKey];
            }
        }

        // Then check the global preset levels
        const keys = Object.keys(this.presetLevels);
        let foundKey = keys.find(item => new RegExp(item + '$').test(hierName));
        if (foundKey) {
            return this.presetLevels[foundKey];
        }

        return [];
    };

    this.createMountain = function(conf) {
        _verif.verifyConf('createMountain', conf, ['name', 'nFaces', 'face']);
        this.pushScope(conf);

        const mountain = new RG.World.Mountain(conf.name);
        mountain.setHierName(this.getHierName());

        if (conf.nFaces !== conf.face.length) {
            const len = conf.face.length;
            RG.err('Factory.World', 'createMountain',
                `Face number mismatch [] = ${len}, n: ${conf.nFaces}`);
        }

        // Create the faces of the mountain
        for (let i = 0; i < conf.nFaces; i++) {
            const faceConf = conf.face[i];
            const mountainFace = this.createMountainFace(faceConf);
            mountain.addSubZone(mountainFace);
            this.addWorldID(faceConf, mountainFace);
        }

        // Create the mountain summits
        for (let i = 0; i < conf.nSummits; i++) {
            const summitConf = conf.summit[i];
            const mountainSummit = this.createSummit(summitConf);
            mountain.addSubZone(mountainSummit);
            this.addWorldID(summitConf, mountainSummit);
        }

        if (!this.id2levelSet) {
            if (conf.nFaces > 1 || conf.nFaces === 1 && conf.nSummits > 0) {
                if (conf.connectLevels) {
                    conf.connectLevels.forEach(conn => {
                        if (conn.length === 4) {
                            // conn has len 4, spread it out
                            mountain.connectSubZones(...conn);
                        }
                        else {
                            RG.err('Factory.World', 'createMountain',
                                'Each connection.length must be 4.');
                        }
                    });

                    // TODO verify that levels are passable
                }
                else {
                    RG.err('Factory.World', 'createMountain',
                        'nFaces > 1, but no conf.connectLevels.');
                }
            }
        }

        this.popScope(conf);
        return mountain;
    };

    this.createMountainFace = function(conf) {
        if (this.id2levelSet) {
            _verif.verifyConf('createMountainFace', conf, ['name', 'nLevels']);
        }
        else {
            _verif.verifyConf('createMountainFace',
                conf, ['name', 'nLevels', 'x', 'y']);
        }

        const faceName = conf.name;
        this.pushScope(conf);
        const face = new RG.World.MountainFace(faceName);
        const mLevelConf = { x: conf.x, y: conf.y};

        this.setLevelConstraints(mLevelConf);

        for (let i = 0; i < conf.nLevels; i++) {
            let level = null;
            if (!this.id2levelSet) {
                level = this.factZone.createMountainLevel(mLevelConf);
            }
            else {
                const id = conf.levels[i];
                level = this.id2level[id];
            }
            face.addLevel(level);
        }

        this._addEntranceToSubZone(face, conf);
        this.popScope(conf);
        return face;
    };

    /* Creates a subzone for mountain summit. Creates the levels contained in
     * that subzone. */
    this.createSummit = function(conf) {
        _verif.verifyConf('createSummit', conf, ['name', 'nLevels']);
        this.pushScope(conf);
        const summit = new RG.World.MountainSummit(conf.name);

        const summitLevelConf = Object.assign({}, conf);
        this.setLevelConstraints(summitLevelConf);

        for (let i = 0; i < conf.nLevels; i++) {
            let level = null;
            if (!this.id2levelSet) {
                level = this.factZone.createSummitLevel(summitLevelConf);
                const dungFeat = new DungeonFeatures('mountain');
                if (i === (conf.nLevels - 1)) {
                    dungFeat.addLastLevelFeatures(i, level, summitLevelConf);
                }
            }
            else {
                const id = conf.levels[i];
                level = this.id2level[id];
            }
            summit.addLevel(level);
        }

        this._addEntranceToSubZone(summit, conf);
        this.popScope(conf);
        return summit;
    };

    this._addEntranceToSubZone = function(subZone, conf) {
        if (conf.hasOwnProperty('entranceLevel')) {
            subZone.addEntrance(conf.entranceLevel);
        }
        else if (conf.hasOwnProperty('entrance')) {
            subZone.setEntranceLocation(conf.entrance);
        }
    };

    /* Creates a City and all its sub-zones. */
    this.createCity = function(conf) {
        _verif.verifyConf('createCity',
            conf, ['name', 'nQuarters']);
        this.pushScope(conf);

        const city = new RG.World.City(conf.name);
        city.setHierName(this.getHierName());

        if (conf.nQuarters !== conf.quarter.length) {
            const len = conf.quarter.length;
            RG.err('Factory.World', 'createCity',
                `Quarter number mismatch [] = ${len}, n: ${conf.nQuarters}`);
        }

        for (let i = 0; i < conf.nQuarters; i++) {
            const qConf = conf.quarter[i];
            const quarter = this.createCityQuarter(qConf);
            city.addSubZone(quarter);
            this.addWorldID(qConf, quarter);
        }

        // Connect city quarters according to configuration
        if (!this.id2levelSet) {
            if (conf.nQuarters > 1) {
                if (conf.connectLevels) {
                    conf.connectLevels.forEach(conn => {
                        if (conn.length === 4) {
                            // conn has len 4, spread it out
                            // city.connectSubZones(...conn);
                            city.abutQuarters(...conn);
                        }
                        else {
                            RG.err('Factory.World', 'createCity',
                                'Each connection.length must be 4.');
                        }
                    });
                }
                else {
                    let msg = 'nQuarters > 1, but no conf.connectLevels.';
                    msg += `cityConf: ${JSON.stringify(conf)}`;
                    RG.err('Factory.World', 'createCity', msg);
                }
            }
        }

        this.popScope(conf);
        return city;
    };

    /* Createa CityQuarter which can be added to a city. */
    this.createCityQuarter = function(conf) {
        _verif.verifyConf('createCityQuarter',
            conf, ['name', 'nLevels']);
        this.pushScope(conf);

        const quarter = new RG.World.CityQuarter(conf.name);
        const hierName = this.getHierName();
        quarter.setHierName(hierName);

        const presetLevels = this.getPresetLevels(hierName);

        // const randType = RG.RAND.arrayGetRand(RG.SHOP_TYPES);
        const cityLevelConf = {
            x: conf.x || 80, y: conf.y || 40,
            nShops: conf.nShops || 1,
            shopFunc: conf.shop ||
                [item => (item.value <= (50 + 50 * conf.nLevels))]
        };
        if (conf.nShops === 0) {cityLevelConf.nShops = 0;}

        // This bunch of data must be passed in conf because featFact does not
        // have access to it via getConf
        this.setLevelConstraints(cityLevelConf);

        for (let i = 0; i < conf.nLevels; i++) {
            let level = this.getFromPresetLevels(i, presetLevels);

            if (!level) {

                if (!this.id2levelSet) {
                    level = this.factZone.createCityLevel(i, cityLevelConf);
                    this.addFixedFeatures(i, level, quarter);
                }
                else {
                    const id = conf.levels[i];
                    level = this.id2level[id];
                }
            }
            else if (level.stub) {
                const levelFact = new LevelFactory(this);
                level = levelFact.create(level.new, level.args);
                if (!level) {
                    RG.err('Factory', 'createCityQuarter',
                        'Stub found but cannot create level');
                }
                if (debug.enabled) {
                    this.debug('Creating level from stub ' +
                        JSON.stringify(level.stub));
                }
            }
            else {
                this.debug(`cityQuarter ${hierName} ${i} from preset level`);
            }

            // Need to add the shops to the quarter
            if (!this.id2levelSet) {
                if (level.shops) {
                    level.shops.forEach(shop => {
                        quarter.addShop(shop);
                    });
                }
            }
            quarter.addLevel(level);
        }

        if (!this.id2levelSet) {
            quarter.connectLevels();
        }

        if (conf.hasOwnProperty('entranceLevel')) {
            quarter.addEntrance(conf.entranceLevel);
        }
        else if (conf.hasOwnProperty('entrance')) {
            quarter.setEntranceLocation(conf.entrance);
        }

        // Only during restore game
        if (conf.hasOwnProperty('shops')) {
            conf.shops.forEach(shop => {
                const shopObj = new RG.World.Shop();
                shopObj.setLevel(this.id2level[shop.level]);
                shopObj.setCoord(shop.coord);
                shopObj._isAbandoned = shop.isAbandoned;
                if (!shop.isAbandoned) {
                    const keeper = this.id2entity[shop.shopkeeper];
                    if (keeper) {
                        shopObj.setShopkeeper(keeper);
                    }
                    else {
                        const id = shop.shopkeeper;
                        const ids = Object.keys(this.id2entity);
                        const str = `Possible IDs: ${ids}`;
                        RG.err('Factory', 'createCityQuarter',
                            `Cannot find shopkeeper ID ${id}. ${str}`);
                    }
                }
                quarter.addShop(shopObj);
            });
        }

        this.popScope(conf);
        return quarter;
    };

    this.createBattleZone = conf => {
        this.pushScope(conf);
        const battleZone = new RG.World.BattleZone(conf.name);
        if (!this.id2levelSet) {
            RG.err('Factory', 'createBattleZone',
                'Can create BattleZones only during restore');
        }
        for (let i = 0; i < conf.nLevels; i++) {
            const id = conf.levels[i];
            const level = this.id2level[id];
            if (level) {
                battleZone.addLevel(level);
            }
            else {
                RG.err('Factory', 'createBattleZone',
                    `Cannot find level ID ${id} for BattleZone`);
            }
        }
        this.popScope(conf);
        return battleZone;
    };

    /* Creates a connection between an area and a zone such as city, mountain
     * or dungeon. Unless configured, connects the zone entrance to a random
     * location in the area. */
    this.createAreaZoneConnection = (area, zone, conf) => {
        _verif.verifyConf('createAreaZoneConnection', conf, ['x', 'y']);
        this.debug('Creating area-zone connections');

        const x = conf.x;
        const y = conf.y;
        const tile = area.getTileXY(x, y);
        const tileLevel = tile.getLevel();
        debugPrintConfAndTile(conf, tileLevel, ' CALL 1');

        const [tileSX, tileSY] = this.getTileStairsXY(tileLevel, conf);

        if (typeof zone.getEntrances === 'function') {
            const entrances = zone.getEntrances();
            if (entrances.length > 0) {
                let entryStairs = entrances[0];
                const entryLevel = entryStairs.getSrcLevel();
                const zoneType = zone.getType();

                this.debug('Connecting area-zone by entrance');

                let conns = null;
                if (zoneType === 'city' || zoneType === 'mountain') {

                    if (debug.enabled) {
                        conns = entryLevel.getConnections();
                        this.debug(`conn length before: ${conns.length}`);
                    }

                    const zoneStairs = this.createNewZoneConnects(zone,
                        entryLevel);
                    entryStairs = this.getEntryStairs(entryLevel, entryStairs,
                        zoneStairs);
                }

                let name = '';
                if (zoneType === 'city') {name = 'town';}
                else if (zoneType === 'mountain') {name = 'mountain';}
                else {
                    const isDown = !entryStairs.isDown();
                    name = isDown ? 'stairsDown' : 'stairsUp';
                }

                debugPrintConfAndTile(conf, tileLevel, ' CALL 2');
                const tileStairs = new Stairs(name, tileLevel, entryLevel);
                try {
                    tileLevel.addStairs(tileStairs, tileSX, tileSY);
                    tileStairs.connect(entryStairs);
                }
                catch (e) {
                    console.log('Given conf: ' + JSON.stringify(conf));
                    throw e;
                }

                this.debugPrintCityConns(zoneType, entryLevel);
            }
            else if (!conf.hasOwnProperty('connectToAreaXY')) {
                const msg = `No entrances in ${zone.getHierName()}.`;
                RG.err('Factory.World', 'createAreaZoneConnection',
                    `${msg}. Cannot connect to tile.`);
            }
        }
        else { // No entrance for zone, error out
            RG.err('Factory.World', 'createAreaZoneConnection',
                'No getEntrances method for zone.');
        }

        // Make extra connections between the area and zone. This is useful
        // if city/dungeon needs to have 2 or more entrances
        if (conf.hasOwnProperty('connectToXY')) {
            // Obsolete feature
            RG.err('Factory.World', 'createAreaZoneConnection',
              'Deprecated! connectToXY not supported. Use connectToAreaXY');
        }
        else if (conf.hasOwnProperty('connectToAreaXY')) {
            const connectionsXY = conf.connectToAreaXY;
            connectionsXY.forEach(conn => {
                this.processConnObject(conn, zone, tileLevel);
            });
        }

    };

    /* Returns x,y coord for stairs placed on the tile level. */
    this.getTileStairsXY = (level, conf) => {
        let [tsX, tsY] = [conf.levelX, conf.levelY];
        const isNull = RG.isNullOrUndef([tsX, tsY]);
        if (isNull) {
            const freeAreaCell = level.getEmptyRandCell();
            tsX = freeAreaCell.getX();
            tsY = freeAreaCell.getY();
        }

        let cell = level.getMap().getCell(tsX, tsY);
        let watchdog = 100;
        while (cell.hasConnection()) {
            const freeAreaCell = level.getEmptyRandCell();
            tsX = freeAreaCell.getX();
            tsY = freeAreaCell.getY();
            cell = level.getMap().getCell(tsX, tsY);
            if (--watchdog <= 0) {break;}
        }

        return [tsX, tsY];
    };

    this.getEntryStairs = (entryLevel, entryStairs, zoneStairs) => {
        // Connection OK, remove the stairs, otherwise use the
        // existing entrance
        if (zoneStairs.length > 0) {
            const sX = entryStairs.getX();
            const sY = entryStairs.getY();

            // Stairs could've been removed by zone edge connection
            if (entryLevel.getElements().indexOf(entryStairs) >= 0) {
                if (!entryLevel.removeElement(entryStairs, sX, sY)) {
                    RG.err('Factory.World', 'createAreaZoneConnection',
                        'Cannot remove entryStairs');
                }
            }
            return zoneStairs;
        }
        return entryStairs;
    };

    /* Processes each 'connectToAreaXY' object. Requires current zone and tile
     * level we are connecting to. Connection type depends on the type of zone.
     */
    this.processConnObject = (conn, zone, tileLevel) => {
        const nLevel = conn.nLevel;
        const x = conn.levelX;
        const y = conn.levelY;
        const name = conn.name;
        this.debug(`Processing connection obj ${name}: ${x},${y}`);

        const zoneLevel = zone.findLevel(name, nLevel);
        if (zoneLevel) {

            // Create new stairs for zone, unless connect obj has stairs
            // property.
            let zoneStairs = conn.stairs || null;

            // zoneStairs is either Element.Stairs or object telling
            // where stairs are found
            if (zoneStairs && !RG.isNullOrUndef([zoneStairs.getStairs])) {
                const stairsIndex = zoneStairs.getStairs;
                zoneStairs = zoneLevel.getStairs()[stairsIndex];
                if (!zoneStairs) {
                    let msg = `zoneStairs null, index: ${stairsIndex}`;
                    msg += `\tPoss: ${JSON.stringify(zoneLevel.getStairs())}`;
                    RG.err('Factory.World', 'processConnObject', msg);
                }
                else {
                    this.debug('conn found via getStairs connObject');
                }
            }

            if (!zoneStairs) {
                zoneStairs = this.createNewZoneConnects(zone, zoneLevel);
            }
            else if (typeof zoneStairs.getSrcLevel !== 'function') {
                const json = JSON.stringify(zoneStairs);
                RG.err('Factory.World', 'processConnObject',
                    `zoneStairs not a proper stairs object ${json}`);
            }

            // Create stairs for tileLevel and connect them to the zone
            // stairs
            let name = 'stairsDown'; // Default for dungeon
            if (zone.getType() === 'city') {name = 'town';}
            else if (zone.getType() === 'mountain') {name = 'mountain';}
            const tileStairs = new Stairs(name, tileLevel, zoneLevel);
            tileLevel.addStairs(tileStairs, x, y);

            // zoneStairs can be either a single connection or an array of
            // connections (for example for a city)
            try {
                tileStairs.connect(zoneStairs);
            }
            catch (e) {
                console.error(e);
                const jsonStr = JSON.stringify(zoneLevel, null, 1);
                let msg = `zoneLevel: ${jsonStr}`;
                msg += `\n\tzoneStairs: ${JSON.stringify(zoneStairs)}`;
                RG.err('Factory.World', 'createAreaZoneConnection',
                    msg);
            }
        }
        else {
            let msg = `connectToAreaXY: ${JSON.stringify(conn)}`;
            msg += `zone: ${JSON.stringify(zone)}`;
            RG.err('Factory.World', 'createAreaZoneConnection',
                `No level found. ${msg}`);
        }
    };

    /* Creates the actual connection objects such as stairs or passages, and
     * adds them into the zone level. Returns the created objects for connecting
     * them into the tile level. */
    this.createNewZoneConnects = (zone, zoneLevel) => {
        let zoneStairs = null;
        if (zone.getType() === 'dungeon') {
            this.debug('Creating dungeon connection');
            const freeCell = zoneLevel.getFreeRandCell();
            const zoneX = freeCell.getX();
            const zoneY = freeCell.getY();
            zoneStairs = new Stairs('stairsUp', zoneLevel);
            zoneLevel.addStairs(zoneStairs, zoneX, zoneY);
        }
        else if (zone.getType() === 'city') {
            this.debug('Creating new city edge connection');
            let allEdgeExits = [];
            RG.CARDINAL_DIR.forEach(dir => {
                if (!RG.World.edgeHasConnections(zoneLevel, dir)) {
                    const exits = RG.World.addExitsToEdge(zoneLevel,
                        'passage', dir);
                    if (exits.length > 0) {
                        allEdgeExits = allEdgeExits.concat(exits);
                    }
                }
            });
            zoneStairs = allEdgeExits;
            // Connection failed, resort to single point connection
            if (zoneStairs.length === 0) {
                zoneLevel.getMap().debugPrintInASCII();

                // XXX this one is shaky
                const freeCell = zoneLevel.getFreeRandCell();
                const zoneX = freeCell.getX();
                const zoneY = freeCell.getY();
                zoneStairs = new Stairs('stairsUp', zoneLevel);
                zoneLevel.addStairs(zoneStairs, zoneX, zoneY);
                zoneStairs = [zoneStairs];

                this.debug('City edge connection failed. Added stairs');
            }
        }
        else if (zone.getType() === 'mountain') {
            this.debug('Creating new mountain south connection');
            zoneStairs = RG.World.addExitsToEdge(zoneLevel,
                'passage', 'south', true);
        }
        return zoneStairs;
    };

    this.debugPrintCityConns = (zoneType, entryLevel) => {
        if (debug.enabled && zoneType === 'city') {
            const conns = entryLevel.getConnections();
            let jsonStr = JSON.stringify(conns[0], null, 1);
            if (conns.length > 1) {
                jsonStr += JSON.stringify(conns[conns.length - 1], null, 1);
            }
            this.debug(`First/last conn: ${jsonStr}`);
            this.debug(`conn length after: ${conns.length}`);
        }
    };

    /* Adds a world ID to the given element. */
    this.addWorldID = function(conf, worldElem) {
      if (!RG.isNullOrUndef([conf.id])) {
          worldElem.setID(conf.id);
      }
      this.worldElemByID[worldElem.getID()] = worldElem;
    };

    /* Used for printing debug messages only. Can be enabled with
     * DEBUG= env var. */
    this.debug = msg => {
        if (debug.enabled) {
            let scope = this.getHierName();
            if (!scope) {scope = 'EMPTY';}
            debug(`|${scope}| ${msg}`);
        }
    };
};

function debugPrintConfAndTile(conf, tileLevel, tag) {
    if (conf.name === 'Iron hills') {
        RG.diag(tag + ' Creating iron hills connection now');
        const tConns = tileLevel.getConnections();
        const mConns = tConns.filter(c => c.getName() === 'mountain');
        RG.diag('\t## Ex. conns: ' + JSON.stringify(mConns));
        if (mConns.length > 0) {
            const target = mConns[0].getTargetLevel();
            RG.diag('\t## Parent: ' + target.getParent().getName());
        }
    }
}

module.exports = RG.Factory.World;
