/* Contains code for better city level generation. */

const RG = require('./rg');
const LevelGenerator = require('./level-generator');
const MapGenerator = require('./map.generator');
const DungeonPopulate = require('./dungeon-populate');

const RNG = RG.Random.getRNG();

/* Object for the city generator. */
const CityGenerator = function() {
    LevelGenerator.call(this);
    this.addDoors = true;
    this.shouldRemoveMarkers = true;
};
RG.extend2(CityGenerator, LevelGenerator);

CityGenerator.options = {
    village: {
        actorsPerLevel: 30,
        maxDanger: 3,
        itemsPerLevels: 6
    },
    capital: {

    },
    stronghold: {

    },
    fort: {

    }
};

CityGenerator.prototype.create = function(cols, rows, conf) {
    const level = this.createLevel(cols, rows, conf);

    this.populateCityLevel(level, conf);
    // TODO populate level with actors based on conf
    return level;
};

/* Returns a castle level without populating it. */
CityGenerator.prototype.createLevel = function(cols, rows, conf) {
    const mapGen = new MapGenerator();
    let mapObj = null;

    if (conf.hasWall) {
        mapObj = mapGen.createTownWithWall(cols, rows, conf);
    }
    else {
        mapObj = mapGen.createTownBSP(cols, rows, conf);
    }

    const level = new RG.Map.Level();
    level.setMap(mapObj.map);

    level.addExtras('houses', mapObj.houses);
    this.createHouseElements(level);
    this.fillUnusedAreas(level, mapObj.unused);
    return level;
};

CityGenerator.prototype.createHouseElements = function(level) {
    const houses = level.getExtras().houses;
    for (let i = 0; i < houses.length; i++) {
        const doorXY = houses[i].door;
        const door = new RG.Element.Door(true);
        level.addElement(door, doorXY[0], doorXY[1]);
        console.log('Adding door to', doorXY);
    }
};

CityGenerator.prototype.fillUnusedAreas = function(level, areas) {
    const map = level.getMap();
    const elems = [RG.ELEM.GRASS, RG.ELEM.TREE, RG.ELEM.WATER];
    areas.forEach(area => {
        const baseElem = RNG.arrayGetRand(elems);
        let {w, h} = area;
        const {x, y} = area;
        w -= 2; // Without this, areas overlap with houses
        h -= 2;
        for (let i = x; i <= x + w; i++) {
            for (let j = y; j <= y + h; j++) {
                map.setBaseElemXY(i, j, baseElem);
            }
        }
    });
};

CityGenerator.prototype.populateCityLevel = function(level, conf) {
    let houses = level.getExtras().houses;
    const dungPopul = new DungeonPopulate(conf);
    const shopHouses = dungPopul.createShops(level, conf);
    houses = houses.filter(house => shopHouses.indexOf(house) < 0);
    const trainerHouses = dungPopul.createTrainers(level, conf);
    houses = houses.filter(house => trainerHouses.indexOf(house) < 0);
    level.addExtras('houses', houses);
    console.log('Creating townsfolk now');
    this.createTownsfolk(level, conf);
    console.log('shopHouses are', shopHouses);
    console.log('trainerHouses are', trainerHouses);
};

CityGenerator.prototype.createTownsfolk = function(level, conf) {
    const dungPopul = new DungeonPopulate(conf);
    const houses = level.getExtras().houses;
    houses.forEach(house => {
        dungPopul.populateHouse(level, house, conf);
    });
};

module.exports = CityGenerator;
