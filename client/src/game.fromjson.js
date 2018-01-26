
const RG = require('./rg');
RG.Game = require('./game');

const OW = require('./overworld.map');
const Battle = require('./game.battle').Battle;
const Army = require('./game.battle').Army;
const GameMaster = require('./game.master');

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
        player.setType('player');
        player.setID(obj.id);
        id2entity[obj.id] = player;
        _dungeonLevel = obj.dungeonLevel;

        this._addEntityFeatures(obj, player);
        return player;
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
                const newCompObj = new RG.Component[name]();
                for (const fname in compJSON) {
                    if (typeof newCompObj[fname] === 'function') {
                        const valueToSet = compJSON[fname];
                        if (valueToSet.createFunc) {
                            const createdObj =
                                this[valueToSet.createFunc](valueToSet.value);
                            newCompObj[fname](createdObj);
                        }
                        else {
                            newCompObj[fname](valueToSet);
                        }
                    }
                    else {
                        const json = JSON.stringify(compJSON);
                        RG.err('FromJSON', 'addCompsToEntity',
                            `${fname} not function in ${name}. Comp: ${json}`);

                    }
                }
                ent.add(name, newCompObj);
            }
        }
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
        if (/stairs/.test(type)) {
            return this.createUnconnectedStairs(elem);
        }
        else if (type === 'passage') {
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
        const x = elem.x;
        const y = elem.y;
        const id = elem.obj.srcLevel;
        const stairsId = `${id},${x},${y}`;
        const elemObj = elem.obj;
        const sObj = new RG.Element.Stairs(elemObj.isDown);
        stairsInfo[stairsId] = {targetLevel: elemObj.targetLevel,
            targetStairs: elemObj.targetStairs};
        sObj.setType(elemObj.type);
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

    this.createGame = function(json) {
        const game = new RG.Game.Main();
        if (json.globalConf) {
            game.setGlobalConf(json.globalConf);
        }

        // Levels must be created before the actual world, because the World
        // object contains only level IDs
        json.levels.forEach(levelJson => {
            const level = this.restoreLevel(levelJson);
            if (!levelJson.parent) {
                game.addLevel(level); // remove once world is properly created
            }
        });

        Object.keys(json.places).forEach(name => {
            const place = json.places[name];
            const placeObj = this.restorePlace(place);
            game.addPlace(placeObj);
        });

        if (json.overworld) {
            const overworld = this.restoreOverWorld(json.overworld);
            game.setOverWorld(overworld);
        }

        // 'Integrity' check that correct number of levels restored
        const nLevels = game.getLevels().length;
        if (nLevels !== json.levels.length) {
            const exp = json.levels.length;
            RG.err('Game.FromJSON', 'createGame',
                `Exp. ${exp} levels, after restore ${nLevels}`);
        }

        // Connect levels using id2level + stairsInfo
        this.connectGameLevels(game);

        // Player created separately from other actors for now
        if (json.player) {
            const player = this.restorePlayer(json.player);
            const id = json.player.levelID;
            const level = game.getLevels().find(item => item.getID() === id);
            if (level) {
                const x = json.player.x;
                const y = json.player.y;
                level.addActor(player, x, y);
                game.addPlayer(player);
            }
            else {
                RG.err('Game.FromJSON', 'createGame',
                    `Cannot find player level object with level ID ${id}`);
            }
        }

        // Entity data cannot be restored earlier because not all object refs
        // exist when entities are created
        this.restoreEntityData();

        const gameMaster = this.restoreGameMaster(json.gameMaster);
        game.setGameMaster(gameMaster);

        // Restore the ID counters for levels and entities, otherwise duplicate
        // IDs will appear when new levels/entities are created
        // RG.Map.Level.prototype.idCount = json.lastLevelID;
        // RG.Entity.prototype.idCount = json.lastEntityID;

        return game;
    };

    /* Connects all game levels together after they've been created as Map.Level
     * objects. */
    this.connectGameLevels = game => {
        const levels = game.getLevels();
        levels.forEach(level => {
            const stairsList = level.getConnections();

            stairsList.forEach(s => {
                const connObj = stairsInfo[s.getID()];
                const targetLevel = id2level[connObj.targetLevel];
                const targetStairsXY = connObj.targetStairs;
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

    this.restoreGameMaster = function(json) {
        const gameMaster = new GameMaster();
        const battles = {};
        Object.keys(json.battles).forEach(id => {
            const battle = this.restoreBattle(json.battles[id]);
            battles[id] = battle;
        });
        gameMaster.battles = battles;
        return gameMaster;
    };

    this.restoreBattle = function(json) {
        const battle = new Battle(json.name);
        battle.setLevel(id2level[json.level]);
        battle.setStats(json.stats);
        const armies = [];
        json.armies.forEach(armyJSON => {
            armies.push(this.restoreArmy(armyJSON));
        });
        battle.setArmies(armies);
        return battle;
    };

    this.restoreArmy = function(json) {
        const army = new Army(json.name);
        json.actors.forEach(id => {
            army.addActor(id2entity[id]);
        });

        return army;
    };

    /* Assume the place is World object for now. */
    this.restorePlace = place => {
        const fact = new RG.Factory.World();
        fact.setId2Level(id2level);
        const world = fact.createWorld(place);
        return world;
    };

    this.restoreOverWorld = json => {
        const ow = new OW.Map();
        ow.setMap(json.baseMap);
        ow._features = json.features;
        ow._featuresByXY = json.featuresByXY;
        ow._vWalls = json.vWalls;
        ow._hWalls = json.hWalls;
        ow._biomeMap = json.biomeMap;
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

};

module.exports = RG.Game.FromJSON;
