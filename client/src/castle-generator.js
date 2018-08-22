
/* THis file contains code to generate castles of different types
 * and contents.
 */

const RG = require('./rg');
const ROT = require('../../lib/rot');
RG.Element = require('./element');
const LevelGenerator = require('./level-generator');
const Level = require('./level');
const DungeonPopulate = require('./dungeon-populate');

const Room = ROT.Map.Feature.Room;

/* This class is used to generate different dungeon levels. */
const CastleGenerator = function() {
    LevelGenerator.call(this);
    this.addDoors = true;
    this.shouldRemoveMarkers = true;
};
RG.extend2(CastleGenerator, LevelGenerator);

/* Returns a fully populated castle-level. */
CastleGenerator.prototype.create = function(cols, rows, conf) {
    const level = this.createLevel(cols, rows, conf);
    conf.preserveMarkers = false;
    this.removeMarkers(level, conf);
    return level;
};

/* Returns a castle level without populating it. */
CastleGenerator.prototype.createLevel = function(cols, rows, conf) {
    const levelConf = Object.assign({
        dungeonType: 'castle', preserveMarkers: true}, conf);
    const mapgen = new RG.Map.Generator();
    const mapObj = mapgen.createCastle(cols, rows, levelConf);

    const level = new Level(cols, rows);
    level.setMap(mapObj.map);
    this.markNonCorridors(level, mapObj.tiles);

    this.createDoorsAndLevers(level);
    return level;
};

CastleGenerator.prototype.markNonCorridors = function(level, tiles) {
    const extras = {
        storeRooms: [],
        rooms: []
    };
    level.setExtras(extras);

    const reStoreRoom = /storeroom/;
    const reNonRoom = /(corridor|corner)/;
    Object.values(tiles).forEach(tile => {
        if (reStoreRoom.test(tile.name)) {
            const bbox = RG.Geometry.convertBbox(tile);
            const cells = level.getMap().getFreeInBbox(bbox);
            cells.forEach(cell => {
                const [x, y] = cell.getXY();
                const marker = new RG.Element.Marker('S');
                marker.setTag('storeroom');
                level.addElement(marker, x, y);
            });
            const room = new Room(bbox.ulx, bbox.uly, bbox.lrx, bbox.lry);
            extras.storeRooms.push(room);
        }
        else if (!reNonRoom.test(tile.name)) {
            const bbox = RG.Geometry.convertBbox(tile);
            const cells = level.getMap().getFreeInBbox(bbox);
            cells.forEach(cell => {
                const [x, y] = cell.getXY();
                const marker = new RG.Element.Marker('R');
                marker.setTag('room');
                level.addElement(marker, x, y);
            });
        }
    });
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
                const door = new RG.Element.LeverDoor();
                map.getCell(x, y).removeProps(RG.TYPE_ELEM);
                level.addElement(door, x, y);
                doorPos[cell.getKeyXY()] = door;
            }
            else if (cell.hasMarker('lever')) {
                const lever = new RG.Element.Lever();
                map.getCell(x, y).removeProps(RG.TYPE_ELEM);
                level.addElement(lever, x, y);
                levers.push(lever);
            }
            else if (cell.hasMarker('door')) {
                const door = new RG.Element.Door();
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
    extras.storeRooms.forEach(room => {
        const cPoint = room.getCenter();
        dungPopul.addPointGuardian(level, cPoint, maxDanger);
    });
};

module.exports = CastleGenerator;
