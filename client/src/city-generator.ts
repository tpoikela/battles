/* Contains code for better city level generation. */

import RG from './rg';
import {LevelGenerator} from './level-generator';
import {MapGenerator} from './map.generator';
import {DungeonPopulate} from './dungeon-populate';
import {Random} from './random';

const RNG = Random.getRNG();

/* Object for the city generator. */
export class CityGenerator {

    public static options: {[key: string]: any};

    public addDoors: boolean;
    public shouldRemoveMarkers: boolean;

    constructor() {
        LevelGenerator.call(this);
        this.addDoors = true;
        this.shouldRemoveMarkers = true;
    }

    create(cols, rows, conf) {
        const level = this.createLevel(cols, rows, conf);

        this.populateCityLevel(level, conf);
        // TODO populate level with actors based on conf
        return level;
    }

    /* Returns a castle level without populating it. */
    createLevel(cols, rows, conf) {
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
    }

    createHouseElements(level) {
        const houses = level.getExtras().houses;
        for (let i = 0; i < houses.length; i++) {
            const doorXY = houses[i].door;
            const door = new RG.Element.Door(true);
            level.addElement(door, doorXY[0], doorXY[1]);
        }
    }

    fillUnusedAreas(level, areas) {
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
    }

    populateCityLevel(level, conf) {
        let houses = level.getExtras().houses;
        const dungPopul = new DungeonPopulate(conf);

        const shopHouses = dungPopul.createShops(level, conf);
        houses = houses.filter(house => shopHouses.indexOf(house) < 0);

        const trainerHouses = dungPopul.createTrainers(level, conf);
        houses = houses.filter(house => trainerHouses.indexOf(house) < 0);

        level.addExtras('houses', houses);
        this.createTownsfolk(level, conf);
    }

    createTownsfolk(level, conf) {
        const dungPopul = new DungeonPopulate(conf);
        const houses = level.getExtras().houses;
        houses.forEach(house => {
            dungPopul.populateHouse(level, house, conf);
        });
    }
}

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

module.exports = CityGenerator;
