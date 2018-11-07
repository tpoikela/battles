/* Contains code for generating different types of houses. This builds on
 * top of houses tiles that use Template.templ.
 */

const RG = require('./rg');
const TemplateLevel = require('./template.level');
const {Houses5x5} = require('../data/tiles.houses');

const RNG = RG.Random.getRNG();

const WALL = '#';
const FLOOR = ':';
const DOOR = '+';

const House = function(map) {
    this.coord = {};
    this.map = RG.copy2D(map);
    this.trimEmpty();
    this.x = 0;
    this.y = 0;
    // Note that w,h take into account also empty space
    this.w = map.length;
    this.h = map[0].length;

    let totalX = 0;
    let totalY = 0;
    RG.forEach2D(map, (x, y, val) => {
        if (!this.coord[val]) {this.coord[val] = [];}
        this.coord[val].push([x, y]);
        if (val === FLOOR) {
            totalX += x;
            totalY += y;
        }
        else if (val === DOOR) {
            this.door = [x, y];
        }
    });

    this.floor = this.coord[FLOOR];
    this.walls = this.coord[WALL];

    const numFloor = Object.values(this.coord[WALL]).length;
    this.cX = Math.round(totalX / numFloor);
    this.cY = Math.round(totalY / numFloor);
    this.numFloor = numFloor;
};

House.prototype.getCenter = function() {
    return [this.cX, this.cY];
};

/* Returns the bounding box taken by this house. */
House.prototype.getBbox = function() {
    return {
        ulx: this.x, uly: this.y,
        lrx: this.x + this.w - 1,
        lry: this.y + this.h - 1
    };
};

/* Remove empty rows from the house map. */
House.prototype.trimEmpty = function() {

};

/* Adjusts the house coordinates based on new x,y of the house. */
House.prototype.adjustCoord = function(x, y) {
    const dX = x - this.x;
    const dY = y - this.y;
    this.x = x;
    this.y = y;
    Object.keys(this.coord).forEach(key => {
        const coord = this.coord[key];
        coord.forEach(xy => {
            xy[0] += dX;
            xy[1] += dY;
        });
    });
    this.cX += dX;
    this.cY += dY;
    this.door = [this.door[0] + dX, this.door[1] + dY];
};

const HouseGenerator = function() {
    // For a 5x5 house tiles
    this.baseSizeX = 2 + 1;
    this.baseSizeY = 2 + 1;

};

HouseGenerator.prototype.createHouse = function(conf) {
    const {cols, rows} = conf;
    const {fullHouse} = conf;
    const params = this.getGenParams(cols, rows);
	const {genParamsX, genParamsY} = params;
    let {tilesX, tilesY} = params;

    if (!Number.isInteger(tilesX) || !Number.isInteger(tilesY)) {
        // Could not solve good value for tile sizes
        if (tilesX > 1) {tilesX = Math.floor(tilesX);}
        else {return null;}

        if (tilesY > 1) {tilesY = Math.floor(tilesY);}
        else {return null;}
    }

    const templ = new TemplateLevel(tilesX, tilesY);

	templ.setFiller(Houses5x5.tiles.filler);
	templ.setTemplates(Houses5x5.templates.all);

	templ.setGenParams({x: genParamsX, y: genParamsY});

    templ.roomCount = -1; // Any number of tiles OK
    if (fullHouse) {
        templ.roomCount = tilesX * tilesY;
        templ.roomCount -= 1; // Entrance
    }
	templ.setStartRoomFunc(Houses5x5.startRoomFunc);
	templ.create();

    // RG.printMap(templ.map);
    return new House(templ.map);
};

/* Returns the params needed to generate the house such as number of
 * tiles and generator params. */
HouseGenerator.prototype.getGenParams = function(cols, rows) {
    const sizeX = this.baseSizeX;
    const sizeY = this.baseSizeY;
	let x0 = RNG.getUniformInt(1, 3);
	let x2 = RNG.getUniformInt(1, 3);

    let currSizeX = sizeX + x0 + x2;
    let watchdogX = 100;
    while (cols % currSizeX !== 0) {
        x0 = RNG.getUniformInt(1, 3);
        x2 = RNG.getUniformInt(1, 3);
        currSizeX = sizeX + x0 + x2;
        if (--watchdogX === 0) {break;}
    }
    const tilesX = cols / currSizeX;
    const genParamsX = [x0, 1, x2];

	let y0 = RNG.getUniformInt(1, 3);
	let y2 = RNG.getUniformInt(1, 3);
    let currSizeY = sizeY + y0 + y2;
    let watchdogY = 100;
    while (rows % currSizeY !== 0) {
        y0 = RNG.getUniformInt(1, 3);
        y2 = RNG.getUniformInt(1, 3);
        currSizeY = sizeY + y0 + y2;
        if (--watchdogY === 0) {break;}
    }
    const tilesY = rows / currSizeY;
    const genParamsY = [y0, 1, y2];

    return {
        tilesX, tilesY, genParamsX, genParamsY
    };
};


module.exports = {House, HouseGenerator};
