/* Contains code for better city level generation. */

import RG from './rg';
import {LevelGenerator, ILevelGenOpts} from './level-generator';
import {MapGenerator} from './map.generator';
import {DungeonPopulate} from './dungeon-populate';
import {LevelSurroundings} from './level-surroundings';
import {Random} from './random';
import {Level} from './level';
import {ELEM} from '../data/elem-constants';
import {ElementDoor} from './element';

import {TShellFunc, ConstBaseElem} from './interfaces';

const RNG = Random.getRNG();

export interface CityOpts extends ILevelGenOpts {
    hasWall: boolean; // Create a wall around the city
    nShops: number;
    shopFunc: TShellFunc[];
    shopType: string | string[];
}
type PartialCityOpts = Partial<CityOpts>;

/* Object for the city generator. */
export class CityGenerator extends LevelGenerator {

    public static options: {[key: string]: any};

    public static getOptions(): CityOpts {
        const opts = LevelGenerator.getOptions() as CityOpts;
        opts.hasWall = false;
        opts.nShops = 1;
        opts.shopFunc = [() => true];
        opts.shopType = ['potion'];
        return opts;
    }

    public addDoors: boolean;

    constructor() {
        super();
        this.addDoors = true;
        this.shouldRemoveMarkers = true;
    }

    public create(cols: number, rows: number, conf: PartialCityOpts): Level {
        let level = this.createLevel(cols, rows, conf);
        if (conf.cellsAround) {
            level = this.createCitySurroundings(level, conf);
        }
        this.populateCityLevel(level, conf);

        this.removeMarkers(level, conf);
        // TODO populate level with actors based on conf
        return level;
    }

    /* Returns a castle level without populating it. */
    public createLevel(cols, rows, conf): Level {
        const mapGen = new MapGenerator();
        let mapObj = null;

        if (conf.hasWall) {
            mapObj = mapGen.createTownWithWall(cols, rows, conf);
        }
        else {
            mapObj = mapGen.createTownBSP(cols, rows, conf);
        }

        const level = new Level();
        level.setMap(mapObj.map);

        level.addExtras('houses', mapObj.houses);
        this.createHouseElements(level);
        this.fillUnusedAreas(level, mapObj.unused);
        return level;
    }

    public createHouseElements(level: Level): void {
        const houses = level.getExtras().houses;
        for (let i = 0; i < houses.length; i++) {
            const doorXY = houses[i].door;
            const door = new ElementDoor(true);
            level.addElement(door, doorXY[0], doorXY[1]);
        }
    }

    public fillUnusedAreas(level: Level, areas): void {
        const map = level.getMap();
        const elems: ConstBaseElem[] = [ELEM.GRASS, ELEM.TREE, ELEM.WATER];
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

    public populateCityLevel(level: Level, conf): void {
        let houses = level.getExtras().houses;
        const dungPopul = new DungeonPopulate(conf);

        const shopHouses = dungPopul.createShops(level, conf);
        houses = houses.filter(house => shopHouses.indexOf(house) < 0);

        const trainerHouses = dungPopul.createTrainers(level, conf);
        houses = houses.filter(house => trainerHouses.indexOf(house) < 0);

        level.addExtras('houses', houses);
        this.createTownsfolk(level, conf);
    }

    public createTownsfolk(level: Level, conf): void {
        const dungPopul = new DungeonPopulate(conf);
        const houses = level.getExtras().houses;
        houses.forEach(house => {
            dungPopul.populateHouse(level, house, conf);
        });
    }

    public createCitySurroundings(level: Level, conf): Level {
        const levelSurround = new LevelSurroundings();
        const newLevel = levelSurround.surround(level, conf);
        newLevel.setExtras(level.getExtras());
        levelSurround.scaleExtras(newLevel);
        return newLevel;
    }
}

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
