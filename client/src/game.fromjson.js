
import WorldFromJSON from './world.fromjson';

const RG = require('./rg');
RG.Game = require('./game');
const OW = require('./overworld.map');
const Battle = require('./game.battle').Battle;
const Army = require('./game.battle').Army;
const debug = require('debug')('bitn:Game.FromJSON');

const IND = 0;
/* Object for converting serialized JSON objects to game objects. Note that all
 * actor/level ID info is stored between uses. If you call restoreLevel() two
 * times, all data from 1st is preserved. Call reset() to clear data. */
RG.Game.FromJSON = function() {

    let _dungeonLevel = 1;

    const _parser = RG.ObjectShell.getParser();

    // Lookup table for mapping level ID to Map.Level object
    let id2level = {};
    let id2entity = {};
    let id2EntityJson = {};

    // Stores connection information for stairs
    let stairsInfo = {};

    /* Resets internal data of this object. */
    this.reset = () => {
        id2level = {};
        id2entity = {};
        id2EntityJson = {};
        stairsInfo = {};
    };

    this.getDungeonLevel = () => _dungeonLevel;

    /* Handles creation of restored player from JSON.*/
    this.restorePlayer = function(obj) {
        const player = new RG.Actor.Rogue(obj.name);
        player.setIsPlayer(true);
        // TODO hack for now, these are restored later
        player.remove('StatsMods');
        player.remove('CombatMods');

        player.setType(obj.type);
        player.setID(obj.id);
        id2entity[obj.id] = player;
        _dungeonLevel = obj.dungeonLevel;

        RG.addCellStyle(RG.TYPE_ACTOR, obj.name, 'cell-actor-player');
        this._addEntityFeatures(obj, player);
        return player;
    };

    this.addRestoredPlayerToGame = function(player, game, json) {
        this._addRegenEvents(game, player);
        const id = json.player.levelID;
        const level = game.getLevels().find(item => item.getID() === id);
        if (level) {
            const x = json.player.x;
            const y = json.player.y;
            level.addActor(player, x, y);
            game.addPlayer(player);
        }
        else {
            RG.err('Game.FromJSON', 'addRestoredPlayerToGame',
                `Cannot find player level object with level ID ${id}`);
        }
    };

    /* Restores all data for already created entity. */
    this.restoreEntity = function(obj, entity) {
        this.createBrain(obj.brain, entity);
        this._addEntityFeatures(obj, entity);
        return entity;
    };

    this._addEntityFeatures = function(obj, entity) {
        this.addCompsToEntity(entity, obj.components);
        this.createInventory(obj, entity);
        this.createEquipment(obj, entity);
        if (obj.fovRange) {
            entity.setFOVRange(obj.fovRange);
        }
        if (obj.spellbook) {
            this.createSpells(obj, entity);
        }
    };

    /* Adds given components into Entity object. */
    this.addCompsToEntity = (ent, comps) => {
        for (const name in comps) {
            if (name) {
                const compJSON = comps[name];
                // const newCompObj = new RG.Component[name]();
                const newCompObj = this.createComponent(name, compJSON);
                ent.add(name, newCompObj);
            }
        }
    };

    /* Creates the component with given name. */
    this.createComponent = (name, compJSON) => {
        const newCompObj = new RG.Component[name]();
        for (const setFunc in compJSON) {
            if (typeof newCompObj[setFunc] === 'function') {
                const valueToSet = compJSON[setFunc];

                // valueToSet can be any of following:
                //   1. Contains create function of this object (FromJSON)
                //     - Call function then sets the result of func call
                //     - Function is called with valueToSet.value
                //   2. Sub-component given with createComp
                //     - Need to call createComponent recursively
                //   3. Can be an objRef
                //   4. Can be scalar/object literal which is set is setFunc
                if (!RG.isNullOrUndef([valueToSet])) {
                    if (valueToSet.createFunc) {
                        const createdObj =
                            this[valueToSet.createFunc](valueToSet.value);
                        newCompObj[setFunc](createdObj);
                    }
                    else if (valueToSet.createComp) {
                        const compType = valueToSet.createComp.setType;
                        // Danger of infinite recursion
                        const newSubComp = this.createComponent(compType,
                            valueToSet.createComp);
                        newCompObj[setFunc](newSubComp);
                    }
                    else if (valueToSet.objRef) {
                        const objToSet = this.getObjRef(valueToSet.objRef);
                        if (objToSet) {
                            newCompObj[setFunc](objToSet);
                        }
                        else {
                            const refJson = JSON.stringify(valueToSet.objRef);
                            const msg = `Null obj for objRef ${refJson}`;
                            RG.err('FromJSON', 'createComponent', msg);
                        }
                    }
                    else {
                        newCompObj[setFunc](valueToSet);
                    }
                }
                else {
                    const jsonStr = JSON.stringify(compJSON);
                    let msg = `valueToSet ${valueToSet}. setFunc ${setFunc} `;
                    msg += `Comp ${name}, json: ${jsonStr}`;
                    RG.err('FromJSON', 'addCompsToEntity', msg);
                }
            }
            else {
                const json = JSON.stringify(compJSON);
                RG.err('FromJSON', 'addCompsToEntity',
                    `${setFunc} not function in ${name}. Comp: ${json}`);

            }
        }
        return newCompObj;
    };

    /* Returns an object of requested type. */
    this.getObjRef = requestObj => {
        if (requestObj.type === 'entity') {
            return id2entity[requestObj.id];
        }
        else if (requestObj.type === 'level') {
            return id2level[requestObj.id];
        }
        return null;
    };

    this.createBrain = (brainJSON, ent) => {
        const type = brainJSON.type;
        if (RG.Brain[type]) {
            const brainObj = new RG.Brain[type](ent);
            ent.setBrain(brainObj);

            if (brainJSON.constraint) {
                brainObj.setConstraint(brainJSON.constraint);
            }

            // Create the memory (if any)
            const memObj = brainObj.getMemory();
            const memJSON = brainJSON.memory;
            if (memJSON) {
                memJSON.enemyTypes.forEach(type => {
                    brainObj.addEnemyType(type);
                });

                if (memJSON.lastAttackedID) {
                    const entity = id2entity[memJSON.lastAttackedID];
                    memObj.setLastAttacked(entity);
                }

                if (memJSON.enemies) {
                    memJSON.enemies.forEach(enemyID => {
                        const enemy = id2entity[enemyID];
                        if (enemy) {
                            memObj.addEnemy(enemy);
                        }
                    });
                }
                if (memJSON.friends) {
                    memJSON.friends.forEach(friendID => {
                        const friend = id2entity[friendID];
                        if (friend) {
                            memObj.addFriend(friend);
                        }
                    });
                }
            }
            else if (type === 'Rogue') {
                brainObj.getMemory().addEnemyType('player');
            }
        }
        else {
            RG.err('FromJSON', 'createBrain',
                `Cannot find RG.Brain.${type}, JSON: ${brainJSON}`);
        }
    };

    this.createSpells = (json, entity) => {
        entity._spellbook = new RG.Spell.SpellBook(entity);
        json.spellbook.spells.forEach(spell => {
            if (RG.Spell.hasOwnProperty(spell.new)) {
                const spellObj = new RG.Spell[spell.new]();
                spellObj.setPower(spell.power);
                if (spell.range) {
                    spellObj.setRange(spell.range);
                }
                // If spell has damage/duration etc dice, restore them
                if (spell.dice) {
                    const dice = [];
                    spell.dice.forEach(die => {
                        dice.push(RG.FACT.createDie(die));
                    });
                    spellObj.setDice(dice);
                }
                entity._spellbook.addSpell(spellObj);
            }
            else {
                RG.err('FromJSON', 'createSpells',
                    `No spell ${spell.new} found in RG.Spell`);
            }
        });
    };

    this.createItem = function(obj) {
        const item = obj;

        // Try to create object using ObjectShell.Parser, if it fails, fallback
        // to default constructor in RG.Item
        let newObj = null;
        if (_parser.hasItem(obj.setName)) {
            newObj = _parser.createItem(obj.setName);
        }
        else {
            const typeCapitalized = this.getItemObjectType(item);
            newObj = new RG.Item[typeCapitalized]();
        }

        for (const func in item) {
            if (func === 'setSpirit') {
                newObj[func](this.createSpirit(item[func]));
            }
            else if (func === 'components') {
                this.addCompsToEntity(newObj, obj.components);
            }
            else if (typeof newObj[func] === 'function') {
                newObj[func](item[func]); // Use setter
            }
            else {
                const json = JSON.stringify(newObj);
                RG.err('Game.FromJSON', 'createItem',
                  `${func} not func in ${json}`);
            }
        }
        return newObj;
    };

    this.createSpirit = function(obj) {
        const newObj = new RG.Actor.Spirit(obj.name);
        this.addCompsToEntity(newObj, obj.components);
        return newObj;
    };

    this.createInventory = function(obj, player) {
        if (obj.hasOwnProperty('inventory')) {
            const itemObjs = obj.inventory;
            for (let i = 0; i < itemObjs.length; i++) {
                const newObj = this.createItem(itemObjs[i]);
                player.getInvEq().addItem(newObj);
            }
        }
    };

    this.createEquipment = function(obj, player) {
        if (obj.hasOwnProperty('equipment')) {
            const equipObjs = obj.equipment;
            for (let i = 0; i < equipObjs.length; i++) {
                const newObj = this.createItem(equipObjs[i]);
                player.getInvEq().addItem(newObj);
                player.getInvEq().equipItem(newObj);
            }

        }
    };

    this.getItemObjectType = item => {
        if (item.setType === 'spiritgem') {return 'SpiritGem';}
        if (item.setType === 'goldcoin') {return 'GoldCoin';}
        if (item.setType === 'missileweapon') {return 'MissileWeapon';}
        if (!RG.isNullOrUndef([item])) {
            if (!RG.isNullOrUndef([item.setType])) {
                return item.setType.capitalize();
            }
            else {
                const itemJSON = JSON.stringify(item);
                RG.err('Game.Save', 'getItemObjectType',
                    'item.setType is undefined. item: ' + itemJSON);
            }
        }
        else {
            RG.err('Game.Save', 'getItemObjectType',
                'item is undefined');
        }
        return null;
    };

    /* Creates a Map.Level object from a json object. NOTE: This method cannot
    * connect stairs to other levels, but only create the stairs elements. */
    this.restoreLevel = function(json) {
        const level = new RG.Map.Level();
        level.setID(json.id);
        level.setLevelNumber(json.levelNumber);

        const mapObj = this.createCellList(json.map);
        level.setMap(mapObj);

        // Create actors
        json.actors.forEach(actor => {
            const actorObj = this.createActor(actor.obj);
            if (actorObj !== null) {
                level.addActor(actorObj, actor.x, actor.y);
            }
            else {
                RG.err('FromJSON', 'restoreLevel',
                    `Actor ${JSON.stringify(actor)} returned null`);
            }
        });

        // Create elements such as stairs
        json.elements.forEach(elem => {
            const elemObj = this.createElement(elem);
            if (elemObj !== null) {
                level.addElement(elemObj, elem.x, elem.y);
            }
            else {
                RG.err('FromJSON', 'restoreLevel',
                    `createElement ${JSON.stringify(elem)} returned null`);
            }
        });

        // Create items
        json.items.forEach(item => {
            const itemObj = this.createItem(item.obj);
            if (itemObj !== null) {
                level.addItem(itemObj, item.x, item.y);
            }
            else {
                RG.err('FromJSON', 'restoreLevel',
                    `Actor ${JSON.stringify(item)} returned null`);
            }
        });

        // Duplicate level IDs are very, very bad
        if (!id2level.hasOwnProperty(json.id)) {
            id2level[json.id] = level;
            debug(`Added level ${json.id} to id2level`);
        }
        else {
            RG.err('FromJSON', 'restoreLevel',
                `Duplicate level ID detected ${json.id}`);
        }
        return level;
    };

    /* Creates elements such as stairs, doors and shop. */
    this.createElement = function(elem) {
        const elemObj = elem.obj;
        const type = elemObj.type;
        if (type === 'connection') {
            return this.createUnconnectedStairs(elem);
        }
        else if (type === 'shop') {
            const shopElem = new RG.Element.Shop();
            let shopkeeper = null;
            if (!RG.isNullOrUndef([elemObj.shopkeeper])) {
                shopkeeper = id2entity[elemObj.shopkeeper];
                if (shopkeeper) {
                    shopElem.setShopkeeper(shopkeeper);
                }
                else {
                    RG.err('Game.FromJSON', 'createElement',
                        `Shopkeeper with ID ${elemObj.shopkeeper} not found`);
                }
            }
            shopElem.setCostFactor(elemObj.costFactorBuy,
                elemObj.costFactorSell);
            return shopElem;
        }
        else if (type === 'door') {
            return new RG.Element.Door(elemObj.closed);
        }
        else if (type === 'exploration') {
            const expElem = new RG.Element.Exploration();
            expElem.setExp(elemObj.setExp);
            expElem.setMsg(elemObj.setMsg);
            return expElem;

        }
        return null;
    };

    /* Creates the actor and sets entity ID refs, but does not restore all
     * entity data. */
    this.createActor = obj => {
        if (obj.type === null) {
            RG.err('FromJSON', 'restoreEntity',
                `obj.type null, obj: ${JSON.stringify(obj)}`);
        }

        let entity = null;
        switch (obj.type) {
            case 'spirit': entity = new RG.Actor.Spirit(obj.name); break;
            default: entity = new RG.Actor.Rogue(obj.name);
        }
        entity.setType(obj.type);
        entity.setID(obj.id);
        id2entity[entity.getID()] = entity;
        id2EntityJson[obj.id] = obj;
        return entity;
    };

    /* Tricky one. The target level should exist before connections. The object
     * returned by this method is not complete stairs, but has placeholders for
     * targetLevel (level ID) and targetStairs (x, y coordinates).
     */
    this.createUnconnectedStairs = elem => {
        const {x, y} = elem;
        const id = elem.obj.srcLevel;
        const stairsId = `${id},${x},${y}`;
        const elemObj = elem.obj;
        const sObj = new RG.Element.Stairs(elemObj.name);
        stairsInfo[stairsId] = {targetLevel: elemObj.targetLevel,
            targetStairs: elemObj.targetStairs};
        return sObj;
    };

    this.createCellList = function(map) {
        const mapObj = new RG.Map.CellList(map.cols, map.rows);
        map.cells.forEach((col, x) => {
            col.forEach((cell, y) => {
                const baseElem = this.createBaseElem(cell);
                mapObj.setBaseElemXY(x, y, baseElem);
                if (cell.ex) {
                    mapObj.getCell(x, y).setExplored(true);
                }
                if (cell.elements) {
                    cell.elements.forEach(elem => {
                        mapObj.setElemXY(x, y, this.createBaseElem(elem));
                    });
                }
            });
        });
        return mapObj;
    };

    this.createBaseElem = cell => {
        switch (cell.type) {
            case '#': // wall
            case 'wall': return RG.ELEM.WALL;
            case '.': // floor
            case 'floor': return RG.ELEM.FLOOR;
            case 'tree': return RG.ELEM.TREE;
            case 'grass': return RG.ELEM.GRASS;
            case 'stone': return RG.ELEM.STONE;
            case 'water': return RG.ELEM.WATER;
            case 'chasm': return RG.ELEM.CHASM;
            case 'road': return RG.ELEM.ROAD;
            case 'highrock': return RG.ELEM.HIGH_ROCK;
            case 'bridge': return RG.ELEM.BRIDGE;
            default: {
                if (RG.elemTypeToObj[cell.type]) {
                    return RG.elemTypeToObj[cell.type];
                }
                else {
                    RG.err('Game.fromJSON', 'createBaseElem',
                        `Unknown type ${cell.type}`);
                }
            }
        }
        return null;
    };

    /* Main function to call when restoring a game. When given Game.Main in
     * serialized JSON, returns the restored Game.Main object. */
    this.createGame = function(gameJSON) {
        const game = new RG.Game.Main();
        this.setGlobalConfAndObjects(game, gameJSON);

        const allLevels = [];

        const levelsToRestore = this.getLevelsToRestore(gameJSON);

        // Levels must be created before the actual world, because the World
        // object contains only level IDs
        levelsToRestore.forEach(levelJson => {
            const level = this.restoreLevel(levelJson);
            allLevels.push(level);
            if (!levelJson.parent) {
                console.log('>> Adding level ' + level.getID());
                game.addLevel(level);
            }
        });

        Object.keys(gameJSON.places).forEach(name => {
            const place = gameJSON.places[name];
            const placeObj = this.restorePlace(place);
            game.addPlace(placeObj);
        });

        if (gameJSON.overworld) {
            const overworld = this.restoreOverWorld(gameJSON.overworld);
            game.setOverWorld(overworld);
        }

        // Connect levels using id2level + stairsInfo
        this.connectGameLevels(allLevels);

        // Player created separately from other actors for now
        if (gameJSON.player) {
            const player = this.restorePlayer(gameJSON.player);
            this.addRestoredPlayerToGame(player, game, gameJSON);
        }

        // Entity data cannot be restored earlier because not all object refs
        // exist when entities are created
        this.restoreEntityData();

        const gameMaster = this.restoreGameMaster(game, gameJSON.gameMaster);
        game.setGameMaster(gameMaster);

        this.checkNumOfLevels(game, gameJSON);

        // Restore the ID counters for levels and entities, otherwise duplicate
        // IDs will appear when new levels/entities are created
        // RG.Map.Level.prototype.idCount = gameJSON.lastLevelID;
        // RG.Entity.prototype.idCount = gameJSON.lastEntityID;

        if (gameJSON.rng) {
            RG.RAND = new RG.Random();
            RG.RAND.setState(gameJSON.rng.state);
        }

        return game;
    };

    this.setGlobalConfAndObjects = (game, gameJSON) => {
        if (gameJSON.globalConf) {
            this.dbg('Setting globalConf for game: '
                + JSON.stringify(gameJSON.globalConf, null, 1));
            game.setGlobalConf(gameJSON.globalConf);
        }
        if (gameJSON.cellStyles) {
            RG.cellStyles = gameJSON.cellStyles;
        }
        if (gameJSON.charStyles) {
            RG.charStyles = gameJSON.charStyles;
        }
    };

    /* Makes all connections in given levels after they've been created as
     * Map.Level objects. */
    this.connectGameLevels = levels => {
        levels.forEach(level => {
            const stairsList = level.getConnections();

            stairsList.forEach(s => {
                const connObj = stairsInfo[s.getID()];
                const targetLevel = id2level[connObj.targetLevel];
                if (!targetLevel && this.chunkMode) {
                    s.setConnObj(connObj);
                    return;
                }

                const targetStairsXY = connObj.targetStairs;
                if (!targetStairsXY) {
                    console.log(JSON.stringify(level, null, 1));
                    console.log(connObj);
                    console.log('Parent: ' + level.getParent().getName());
                    console.log(JSON.stringify(s));
                }

                const x = targetStairsXY.x;
                const y = targetStairsXY.y;
                if (targetLevel) {
                    s.setTargetLevel(targetLevel);
                    const targetStairs = targetLevel
                        .getMap().getCell(x, y).getConnection();
                    if (targetStairs) {
                        s.connect(targetStairs);
                    }
                    else {
                        RG.err('Game.FromJSON', 'connectGameLevels',
                            'Target stairs was null. Cannot connect.');
                    }
                }
                else {
                    // this.reportMissingLevel(connObj);
                    const id = connObj.targetLevel;
                    RG.err('Game.FromJSON', 'connectGameLevels',
                        `Target level ${id} null. Cannot connect.`);
                }
            });
        });
    };

    this.restoreGameMaster = function(game, json) {
        const gameMaster = game.getGameMaster();
        const battles = {};
        Object.keys(json.battles).forEach(id => {
            const battle = this.restoreBattle(json.battles[id]);
            battles[id] = battle;
            game.addLevel(battle.getLevel());
        });
        gameMaster.battles = battles;
        if (json.battlesDone) {
            gameMaster.battlesDone = json.battlesDone;
        }
        return gameMaster;
    };

    this.restoreBattle = function(json) {
        const battle = new Battle(json.name);
        const battleLevel = id2level[json.level];
        battle.setLevel(battleLevel);
        battle.setStats(json.stats);
        battle.finished = json.finished;
        const armies = [];
        json.armies.forEach(armyJSON => {
            armies.push(this.restoreArmy(armyJSON));
        });
        battle.setArmies(armies);

        // Need to remove the event listeners if battle over
        if (battle.finished) {
            debug(`${json.name} finished. rm listeners`);
            RG.POOL.removeListener(battle);
            armies.forEach(army => {
                RG.POOL.removeListener(army);
            });
        }
        return battle;
    };

    this.restoreArmy = function(json) {
        const army = new Army(json.name);
        json.actors.forEach(id => {
            if (id2entity[id]) {
                army.addActor(id2entity[id]);
            }
        });
        army.setDefeatThreshold(json.defeatThreshold);

        return army;
    };

    /* Assume the place is World object for now. */
    this.restorePlace = place => {
        const worldJSON = new WorldFromJSON(id2level);
        return worldJSON.createWorld(place);
    };

    this.restoreOverWorld = json => {
        const ow = new OW.Map();
        ow.setMap(json.baseMap);
        ow._features = json.features;
        ow._featuresByXY = json.featuresByXY;
        ow._vWalls = json.vWalls;
        ow._hWalls = json.hWalls;
        ow._biomeMap = json.biomeMap;
        ow._explored = json.explored;
        const coordMap = new RG.OverWorld.CoordMap();
        for (const p in json.coordMap) {
            if (json.coordMap.hasOwnProperty(p)) {
                coordMap[p] = json.coordMap[p];
            }
        }
        ow.coordMap = coordMap;
        return ow;
    };

    this.restoreEntityData = function() {
        Object.keys(id2EntityJson).forEach(id => {
            const obj = id2EntityJson[id];
            const entity = id2entity[id];
            this.restoreEntity(obj, entity);
        });
    };

    this.reportMissingLevel = function(connObj) {
        let msg = `connObj: ${JSON.stringify(connObj)}`;
        Object.keys(id2level).forEach(id => {
            msg += `\n\t${id}`;
        });
        console.log(msg + '\n');
    };

    /* Re-schedules the HP/PP regeneration for an actor */
    this._addRegenEvents = (game, actor) => {
        // Add HP regeneration
        const regenPlayer = new RG.Time.RegenEvent(actor,
            20 * RG.ACTION_DUR);
        game.addEvent(regenPlayer);

        // Add PP regeneration (if needed)
        if (actor.has('SpellPower')) {
            const regenPlayerPP = new RG.Time.RegenPPEvent(actor,
                30 * RG.ACTION_DUR);
            game.addEvent(regenPlayerPP);
        }

    };

    this.dbg = msg => {
        if (debug.enabled) {
          const indStr = ' '.repeat(IND);
          debug(`${indStr}FromJSON: ${msg}`);
        }
    };

    this.getLevelsToRestore = gameJSON => {
        let levels = [];
        if (gameJSON.levels) {return gameJSON.levels;}
        Object.keys(gameJSON.places).forEach(name => {
            const place = gameJSON.places[name];
            if (place.area) {
                place.area.forEach(area => {
                    area.tiles.forEach((tileCol, x) => {
                        tileCol.forEach((tile, y) => {
                            if (area.tilesLoaded[x][y]) {
                                levels = levels.concat(tile.levels);
                            }
                        });
                    });
                });
            }
        });
        return levels;
    };

    /* Given a list of JSON World.AreaTiles, creates the objects and level
     * connections, and attaches them to area in current game. */
    this.createTiles = function(game, jsonTiles) {
        const allLevels = game.getLevels();
        this.addLevels(allLevels);

        // Levels must be created before the actual world, because the World
        // object contains only level IDs
        let levelsJson = [];
        jsonTiles.forEach(json => {
            levelsJson = levelsJson.concat(json.levels);
        });
        const restoredLevels = [];

        levelsJson.forEach(json => {
            const level = this.restoreLevel(json);
            restoredLevels.push(level);
            allLevels.push(level);
        });

        // Connect levels using id2level + stairsInfo
        this.connectGameLevels(restoredLevels);

        // Entity data cannot be restored earlier because not all object refs
        // exist when entities are created
        this.restoreEntityData();

        const area = game.getCurrentWorld().getCurrentArea();
        const fact = new RG.Factory.World();
        fact.setId2Level(id2level);

        jsonTiles.forEach(json => {
            const [tx, ty] = [json.x, json.y];
            const tile = new RG.World.AreaTile(tx, ty, area);

            const tileLevel = id2level[json.level];
            tile.setLevel(tileLevel);
            game.addLevel(tileLevel);

            const jsonCopy = JSON.parse(JSON.stringify(json));
            area.getTiles()[tx][ty] = tile;
            tileLevel.setParent(area);
            fact.createZonesFromTile(area, jsonCopy, tx, ty);
        });

    };

    this.addLevels = levels => {
        levels.forEach(level => {
            id2level[level.getID()] = level;
            debug('FromJSON added level ' + level.getID());
        });
    };

    this.connectTileLevels = (levels, conns) => {
        conns.forEach(conn => {
            const stairsId = conn.getID();
            const targetLevel = conn.getTargetLevel();
            stairsInfo[stairsId] = {
                targetLevel,
                targetStairs: conn.getTargetStairs()
            };
        });
        this.addLevels(levels);
        this.connectConnections(conns);
    };

    this.connectConnections = conns => {
        conns.forEach(s => {
            const connObj = stairsInfo[s.getID()];
            const targetLevel = id2level[connObj.targetLevel];

            const targetStairsXY = connObj.targetStairs;
            const {x, y} = targetStairsXY;
            if (targetLevel) {
                s.setTargetLevel(targetLevel);
                const targetStairs = targetLevel
                    .getMap().getCell(x, y).getConnection();
                if (targetStairs) {
                    s.connect(targetStairs);
                }
                else {
                    RG.err('Game.FromJSON', 'connectConnections',
                        'Target stairs was null. Cannot connect.');
                }
            }
            else {
                const id = connObj.targetLevel;
                RG.err('Game.FromJSON', 'connectConnections',
                    `Target level ${id} null. Cannot connect.`);
            }
        });
    };

    // 'Integrity' check that correct number of levels restored
    this.checkNumOfLevels = (game, gameJSON) => {
        const nLevels = game.getLevels().length;
        if (gameJSON.levels) {
            if (nLevels !== gameJSON.levels.length) {
                const exp = gameJSON.levels.length;
                RG.err('Game.FromJSON', 'checkNumOfLevels',
                    `Exp. ${exp} levels, after restore ${nLevels}`);
            }
        }
    };

    // decorateObjThisFuncs(this);
};

/*
function decorateObjThisFuncs(obj) {
    if (debug.enabled) {
      for (const prop in obj) {
        if (obj.hasOwnProperty(prop)) {
          if (typeof obj[prop] === 'function' && prop !== 'dbg') {
            const func = () => {
              ++IND;
              console.log('IND is now ' + IND);
              const result = obj[prop].apply(obj, arguments);
              --IND;
              console.log('IND is now ' + IND);
              return result;
            };
            obj[prop] = func;
          }
        }
      }
    }
}
*/

module.exports = RG.Game.FromJSON;
