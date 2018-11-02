
/* THis file contains code to generate castles of different types
 * and contents.
 */

const RG = require('./rg');
const ROT = require('../../lib/rot');
const Element = require('./element');
const LevelGenerator = require('./level-generator');
const Level = require('./level');
const DungeonPopulate = require('./dungeon-populate');
const Castle = require('../data/tiles.castle');
const LevelSurroundings = require('./level-surroundings');
const {FactoryItem} = require('./factory.items');
const Placer = require('./placer');
const Random = require('./random');

const RNG = Random.getRNG();
const Room = ROT.Map.Feature.Room;

/* This class is used to generate different dungeon levels. */
const CastleGenerator = function() {
    LevelGenerator.call(this);
    this.addDoors = true;
    this.shouldRemoveMarkers = true;
};
RG.extend2(CastleGenerator, LevelGenerator);

const GOLD_VAULT_CHANCE = 0.10;

const re = {
    corridor: /(corridor|corner)/,
    entrance: /entrance/,
    storeroom: /storeroom/,
    vault: /vault/
};

const markers = {
    corridor: 'C',
    room: 'R',
    entrance: 'E',
    storeroom: 'S',
    vault: 'V'
};

CastleGenerator.getOptions = function() {
    return {
        addItems: true,
        roomCount: -1,
        cellsAround: {
            N: 'wallmount',
            S: 'tree',
            E: 'grass',
            W: 'snow',
            NW: 'water',
            SE: 'water'
        },
        surroundX: 10,
        surroundY: 10,
        maxValue: 100
    };
};

/* Returns a fully populated castle-level. */
CastleGenerator.prototype.create = function(cols, rows, conf) {
    let castleLevel = this.createLevel(cols, rows, conf);
    conf.preserveMarkers = false;
    this.removeMarkers(castleLevel, conf);

    if (conf.addItems) {
        this.addItemsToCastle(castleLevel, conf);
    }

    if (conf.cellsAround) {
        castleLevel = this.createCastleSurroundings(castleLevel, conf);
    }

    // TODO populate level with actors based on conf
    return castleLevel;
};

/* Returns a castle level without populating it. */
CastleGenerator.prototype.createLevel = function(cols, rows, conf) {
    const levelConf = Object.assign({
        dungeonType: 'castle',
        preserveMarkers: true,
        wallType: 'wallcastle'
        }, conf
    );
    const mapgen = new RG.Map.Generator();

    // Determine direction of castle exit
    const gateFunc = getGateDirFunction(conf);
    if (gateFunc) {
        levelConf.startRoomFunc = gateFunc;
    }

    const mapObj = mapgen.createCastle(cols, rows, levelConf);

    const level = new Level(cols, rows);
    level.setMap(mapObj.map);
    this.addMarkersFromTiles(level, mapObj.tiles);

    this.createDoorsAndLevers(level);
    return level;
};

CastleGenerator.prototype.addItemsToCastle = function(level, conf) {
    // Storerooms contain better loot
    const extras = level.getExtras();
    const storerooms = extras.storeroom;
    const {maxValue} = conf;
    const itemFunc = item => ((
        (item.value <= (2 * maxValue)) && (item.value >= maxValue)
    ));
    const itemConf = {
        func: itemFunc, maxValue, nItems: 1
    };
    const factItem = new FactoryItem();
    storerooms.forEach(room => {
        const items = factItem.generateItems(itemConf);
        Placer.addPropsToRoom(level, room, items);
    });

    // One of the storerooms can contain gold as well
    if (RG.isSuccess(GOLD_VAULT_CHANCE)) {
        const goldRoom = RNG.arrayGetRand(storerooms);
        const wealth = RNG.getUniformInt(1, 6);
        const goldItems = factItem.generateGold({nGold: 5, nLevel: wealth});
        Placer.addPropsToRoom(level, goldRoom, goldItems);
    }

    const normalRooms = extras.room;
    itemConf.nItems = normalRooms.length;
    const items = factItem.generateItems(itemConf);
    items.forEach(item => {
        const room = RNG.arrayGetRand(normalRooms);
        Placer.addPropsToRoom(level, room, [item]);
    });
};

CastleGenerator.prototype.addMarkersFromTiles = function(level, tiles) {
    const extras = {
        corridor: [],
        entrance: [],
        room: [],
        storeroom: [],
        vault: []
    };
    level.setExtras(extras);

    Object.values(tiles).forEach(tile => {
        if (re.storeroom.test(tile.name)) {
            this.addToExtras(level, tile, 'storeroom');
        }
        else if (re.vault.test(tile.name)) {
            this.addToExtras(level, tile, 'vault');
        }
        else if (re.entrance.test(tile.name)) {
            this.addToExtras(level, tile, 'entrance');
        }
        else if (re.corridor.test(tile.name)) {
            this.addToExtras(level, tile, 'corridor');
        }
        else {
            this.addToExtras(level, tile, 'room');
        }
    });
};


CastleGenerator.prototype.addToExtras = function(level, tile, name) {
    const bbox = RG.Geometry.convertBbox(tile);
    const cells = level.getMap().getFreeInBbox(bbox);
    cells.forEach(cell => {
        const [x, y] = cell.getXY();
        const marker = new Element.Marker(markers[name]);
        marker.setTag(name);
        level.addElement(marker, x, y);
    });
    const room = new Room(bbox.ulx, bbox.uly, bbox.lrx, bbox.lry);
    const extras = level.getExtras();
    extras[name].push(room);
};

/* Links (and first creates) levers and lever doors based on markers. */
CastleGenerator.prototype.createDoorsAndLevers = function(level) {
    const map = level.getMap();
    const cells = map.getCells();
    const doorPos = {};
    const levers = [];

    cells.forEach(cell => {
        if (cell.hasElements()) {

            const [x, y] = cell.getXY();
            if (cell.hasMarker('leverdoor')) {
                const door = new Element.LeverDoor();
                map.getCell(x, y).removeProps(RG.TYPE_ELEM);
                level.addElement(door, x, y);
                doorPos[cell.getKeyXY()] = door;
            }
            else if (cell.hasMarker('lever')) {
                const lever = new Element.Lever();
                map.getCell(x, y).removeProps(RG.TYPE_ELEM);
                level.addElement(lever, x, y);
                levers.push(lever);
            }
            else if (cell.hasMarker('door')) {
                const door = new Element.Door();
                map.getCell(x, y).removeProps(RG.TYPE_ELEM);
                level.addElement(door, x, y);
            }
        }
    });

    // Finally connect lever to its door
    levers.forEach(lever => {
        const [x, y] = lever.getXY();
        const xyAround = RG.Geometry.getBoxAround(x, y, 1);
        xyAround.forEach(xy => {
            const keyXY = xy[0] + ',' + xy[1];
            if (doorPos[keyXY]) {
                let door = map.getCell(xy[0], xy[1]).getPropType('leverdoor');
                if (door) {door = door[0];}
                else {
                    RG.err('CastleGenerator', 'createDoorsAndLevers',
                    `No door found for lever@${x},${y}`);
                }
                lever.addTarget(door);
            }
        });

    });

};

CastleGenerator.prototype.populateStoreRooms = function(level, conf) {
    const dungPopul = new DungeonPopulate();
    if (conf.actorFunc) {
        dungPopul.setActorFunc(conf.actorFunc);
    }
    const maxDanger = conf.maxDanger;
    const extras = level.getExtras();
    if (extras.storeroom) {
        extras.storeroom.forEach(room => {
            const cPoint = room.getCenter();
            dungPopul.addPointGuardian(level, cPoint, maxDanger);
        });
    }
};

CastleGenerator.prototype.createCastleSurroundings = function(level, conf) {
    const levelSurround = new LevelSurroundings();
    return levelSurround.surround(level, conf);
};

/* Returns the function to generate castle cased based on surrounding
 * cells. */
function getGateDirFunction(conf) {
    if (conf.cellsAround) {
        const {cellsAround} = conf;
        if (!cellBlocked(cellsAround.N)) {
            return Castle.startRoomFuncNorth;
        }
        else if (!cellBlocked(cellsAround.S)) {
            return Castle.startRoomFuncSouth;
        }
        else if (!cellBlocked(cellsAround.E)) {
            return Castle.startRoomFuncEast;
        }
        else if (!cellBlocked(cellsAround.W)) {
            return Castle.startRoomFuncWest;
        }
    }
    return null;
}

function cellBlocked(type) {
    switch (type) {
        case 'wallmount': return true;
        case 'water': return true;
        default: return false;
    }
}

module.exports = CastleGenerator;
