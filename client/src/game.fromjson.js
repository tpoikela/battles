
const RG = require('./rg');
RG.Game = require('./game');

/* Object for converting serialized JSON objects to game objects. */
RG.Game.FromJSON = function() {

    let _dungeonLevel = 1;

    // Lookup table for mapping level ID to Map.Level object
    const id2level = {};
    const id2entity = {};

    // Stores connection information for stairs
    const stairsInfo = {};

    this.getDungeonLevel = function() {
        return _dungeonLevel;
    };

    /* Handles creation of restored player from JSON.*/
    this.createPlayerObj = function(obj) {
        const player = new RG.Actor.Rogue(obj.name);
        player.setIsPlayer(true);
        player.setType('player');
        this.addCompsToEntity(player, obj.components);
        this.createInventory(obj, player);
        this.createEquipment(obj, player);
        _dungeonLevel = obj.dungeonLevel;
        return player;
    };

    this.createEntity = function(obj) {
        if (obj.type) {
            let entity = null;
            switch (obj.type) {
                case 'spirit': entity = new RG.Actor.Spirit(obj.name); break;
                default: entity = new RG.Actor.Rogue(obj.name);
            }
            entity.setType(obj.type);
            this.addCompsToEntity(entity, obj.components);
            this.createInventory(obj, entity);
            this.createEquipment(obj, entity);
            this.createBrain(obj.brain, entity);
            return entity;
        }
        else {
            RG.err('FromJSON', 'createEntity',
                `obj.type null, obj: ${JSON.stringify(obj)}`);
        }
        return null;
    };

    this.addCompsToEntity = function(ent, comps) {
        for (const name in comps) {
            if (name) {
                const comp = comps[name];
                const newCompObj = new RG.Component[name]();
                for (const fname in comp) {
                    if (typeof newCompObj[fname] === 'function') {
                        newCompObj[fname](comp[fname]);
                    }
                    else {
                        const json = JSON.stringify(comp);
                        RG.err('FromJSON', 'addCompsToEntity',
                            `${fname} not function in ${name}. Comp: ${json}`);

                    }
                }
                ent.add(name, newCompObj);
            }
        }
    };

    this.createBrain = function(brainJSON, ent) {
        const type = brainJSON.type;
        const typeUc = type[0].toUpperCase() + type.substring(1);
        if (RG.Brain[typeUc]) {
            const brainObj = new RG.Brain[typeUc](ent);
            const memObj = brainObj.getMemory();
            const memJSON = brainJSON.memory;
            ent.setBrain(brainObj);
            // TODO addEnemyType called in Actor.Rogue, find better solution
            // Maybe Brain.Enemy, with hate against player?
            // And rename Brain.Rogue -> Brain.Base.
            if (memJSON) {
                memJSON.enemyTypes.forEach(type => {
                    brainObj.addEnemyType(type);
                });

                if (memJSON.lastAttackedID) {
                    memObj.setLastAttacked(memJSON.lastAttackedID);
                }
            }
            else if (type === 'rogue') {
                brainObj.getMemory().addEnemyType('player');
            }
            // TODO reconstruct memory
        }
        else {
            RG.err('FromJSON', 'createBrain',
                `Cannot find RG.Brain.${typeUc}, JSON: ${brainJSON}`);
        }
    };

    this.createItem = function(obj) {
        const item = obj;
        const typeCapitalized = this.getItemObjectType(item);
        const newObj = new RG.Item[typeCapitalized]();
        for (const func in item) {
            if (func === 'setSpirit') {
                newObj[func](this.createSpirit(item[func]));
            }
            else if (func === 'components') {
                this.addCompsToEntity(newObj, obj.components);
            }
            else {
                newObj[func](item[func]); // Use setter
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

    this.getItemObjectType = function(item) {
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
    this.createLevel = function(json) {
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
                RG.err('FromJSON', 'createLevel',
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
                RG.err('FromJSON', 'createLevel',
                    `Elem ${JSON.stringify(elem)} returned null`);
            }
        });

        // Create items
        json.items.forEach(item => {
            const itemObj = this.createItem(item.obj);
            if (itemObj !== null) {
                level.addItem(itemObj, item.x, item.y);
            }
            else {
                RG.err('FromJSON', 'createLevel',
                    `Actor ${JSON.stringify(item)} returned null`);
            }
        });

        // Duplicate level IDs are very bad
        if (!id2level.hasOwnProperty(json.id)) {
            id2level[json.id] = level;
        }
        else {
            RG.err('FromJSON', 'createLevel',
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
        return null;
    };

    this.createActor = function(actor) {
        const entity = this.createEntity(actor);
        entity.setID(actor.id);
        id2entity[entity.getID()] = entity;
        return entity;
    };

    /* Tricky one. The target level should exist before connections. The object
     * returned by this method is not complete stairs, but has placeholders for
     * targetLevel (level ID) and targetStairs (x, y coordinates).
     */
    this.createUnconnectedStairs = function(elem) {
        const x = elem.x;
        const y = elem.y;
        const id = elem.obj.srcLevel;
        const stairsId = `${id},${x},${y}`;
        const elemObj = elem.obj;
        const sObj = new RG.Element.Stairs(elemObj.isDown);
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

    this.createBaseElem = function(cell) {
        switch (cell.type) {
            case '#': // wall
            case 'wall': return RG.WALL_ELEM;
            case '.': // floor
            case 'floor': return RG.FLOOR_ELEM;
            case 'tree': return RG.TREE_ELEM;
            case 'grass': return RG.GRASS_ELEM;
            case 'stone': return RG.STONE_ELEM;
            case 'water': return RG.WATER_ELEM;
            case 'chasm': return RG.CHASM_ELEM;
            case 'road': return RG.ROAD_ELEM;
            case 'highrock': return RG.HIGH_ROCK_ELEM;
            case 'bridge': return RG.BRIDGE_ELEM;
            default: {
                RG.err('Game.fromJSON', 'createBaseElem',
                    `Unknown type ${cell.type}`);
            }
        }
        return null;
    };

    this.createGame = function(json) {
        const game = new RG.Game.Main();

        // Levels must be created before the actual world, because the World
        // object contains only level IDs
        json.levels.forEach(levelJson => {
            const level = this.createLevel(levelJson);
            if (!levelJson.parent) {
                game.addLevel(level); // remove once world is properly created
            }
        });

        Object.keys(json.places).forEach(name => {
            const place = json.places[name];
            const placeObj = this.createPlace(place);
            game.addPlace(placeObj);
        });

        // Connect levels using id2level + stairsInfo
        this.connectGameLevels(game);

        // Player created separately from other actors for now
        if (json.player) {
            const player = this.createPlayerObj(json.player);
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

        // Restore the ID counters for levels and entities, otherwise duplicate
        // IDs will appear when new levels/entities are created
        // RG.Map.Level.prototype.idCount = json.lastLevelID;
        // RG.Entity.prototype.idCount = json.lastEntityID;

        return game;
    };

    this.connectGameLevels = function(game) {
        const levels = game.getLevels();
        levels.forEach(level => {
            const stairsList = level.getStairs();

            stairsList.forEach(s => {
                const connObj = stairsInfo[s.getID()];
                const targetLevel = id2level[connObj.targetLevel];
                const targetStairsXY = connObj.targetStairs;
                const x = targetStairsXY.x;
                const y = targetStairsXY.y;
                if (targetLevel) {
                    s.setTargetLevel(targetLevel);
                    const targetStairs = targetLevel
                        .getMap().getCell(x, y).getStairs();
                    if (targetStairs) {
                        s.connect(targetStairs);
                    }
                    else {
                        RG.err('Game.FromJSON', 'connectGameLevels',
                            'Target stairs was null. Cannot connect.');
                    }
                }
                else {
                    RG.err('Game.FromJSON', 'connectGameLevels',
                        'Target level null. Cannot connect.');
                }
            });
        });
    };

    /* Assume the place is World object for now. */
    this.createPlace = function(place) {
        const fact = new RG.Factory.World();
        fact.setId2Level(id2level);
        const world = fact.createWorld(place);
        return world;
    };

};

module.exports = RG.Game.FromJSON;
