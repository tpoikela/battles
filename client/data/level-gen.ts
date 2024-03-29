
/* This file contains code to generate the configuration for different types of
 * levels. Used in the overworld generation in overworld.js after the overworld
 * Map.Level has been created. */

import RG from '../src/rg';
import {Names} from './name-gen';
import {WorldConf} from '../src/world.creator';
import * as IF from '../src/interfaces';
import {Random} from '../src/random';

const RAND = Random.getRNG();

export class LevelGen {

    // DUNGEON GENERATION
    public static getDungeonConf (dungeonName: string): IF.DungeonConf {
        let dungeonType = getDungeonType(dungeonName);
        const nLevels = getNumLevels(dungeonType);
        const constraint = getConstraint(dungeonType);
        const [dungeonX, dungeonY] = getDungeonSizeXY(dungeonName);

        dungeonType = dungeonType.toLowerCase();
        const obj: IF.DungeonConf = {
            name: dungeonName,
            maxDanger: RG.MAX_DANGER,
            maxRarity: 1,
            dungeonX, dungeonY, dungeonType,
            nBranches: 1, // TODO multi-branch dungeons
            branch: [
                {name: dungeonName, nLevels, entranceLevel: 0,
                    maxDanger: RG.MAX_DANGER}
            ]
        };

        if (constraint) {
            obj.constraint = constraint;
        }

        return obj;
    }

    public static getMountainConf(mountainName: string): IF.MountainConf {
        const nLevels = 1;
        const [x, y] = getMountainSizeXY(mountainName);
        const conf = {
            name: mountainName,
            nFaces: nLevels,
            maxDanger: RG.MAX_DANGER,
            maxRarity: 1,
            face: [{
                    name: mountainName, nLevels, entranceLevel: 0, x, y,
                    maxDanger: RG.MAX_DANGER,
            }],
            nSummits: 1,
            summit: [{
                name: 'Summit', nLevels: 1, cols: 80, rows: 50,
                maxDanger: RG.MAX_DANGER,
            }],
            connectLevels: [
                [mountainName, 'Summit', 0, 0] as IF.LevelConnection
            ]
        };
        return conf;
    }

    public static getCityConf(cityName: string, conf): IF.CityConf {
        let cityType = Names.getGenericPlaceName('city');
        if (conf.type === 'fort') {
            cityType = 'Fort';
        }
        else if (conf.capital) {
            cityType = 'Capital';
        }
        else if (conf.type === 'stronghold') {
            cityType = 'Stronghold';
        }
        else if (conf.type === 'village') {
            cityType = Names.getVillageType();
        }
        const nQuarters = getNumQuarters(cityType);
        const quarters: IF.QuarterConf[] = getQuarterConf(nQuarters, conf);
        const connect = WorldConf.createQuarterConnections(quarters);
        const obj: IF.CityConf = {
            name: cityName,
            nQuarters,
            quarter: quarters,
            maxDanger: RG.MAX_DANGER,
            maxRarity: 1,
        };

        if (connect) {obj.connectLevels = connect;}
        return obj;
    }

}

const getNumLevels = function(name: string): number {
    switch (name) {
        case 'Cave': return 1;
        case 'Crypt': return 2;
        case 'Dungeon': return 3;
        case 'Labyrinth': return 1;
        default: return 3;
    }
};

const getDungeonSizeXY = function(name: string): [number, number] {
    const mediumSize: [number, number] = [80, 40];
    switch (name) {
        case 'Cave': return [80, 50];
        case 'Cavern': return [200, 200];
        case 'Grotto': return [120, 60];
        case 'Lair': return [200, 150];

        case 'Cells': return [100, 50];
        case 'Dungeon': return [100, 50];

        case 'Labyrinth': return [100, 100];
        case 'Maze': return [80, 50];

        case 'Crypt': return mediumSize;
        case 'Tombs': return [100, 100];
        case 'Catacombs': return [140, 60];

        default: return mediumSize;
    }

};

/* Returns generation constraints based on the level name. */
const getConstraint = function(name: string): null | IF.ConstraintMap {
    switch (name) {
        case 'Cave': return {
            actor: [{
              op: 'eq', prop: 'type',
              value: ['animal', 'goblin', 'beast']
            }]
        };
        case 'Crypt': return {
            actor: [{op: 'eq', prop: 'type', value: 'undead'}]
        };
        default: return null;
    }
};

const getDungeonType = function(name: string): string {
    switch (name) {
        case 'Grotto': return 'Cave';
        case 'Cavern': return 'Cave';
        case 'Lair': return 'Cave';
        case 'Catacombs': return 'Crypt';
        case 'Tombs': return 'Crypt';
        case 'Cells': return 'Dungeon';
        default: return name;
    }
};

const getMountainSizeXY = function(name: string): [number, number] {
    switch (name) {
        default: return [80, 240];
    }
};


//---------------------------------------------------------------------------
// CITY GENERATION
//---------------------------------------------------------------------------

const getNumQuarters = (cityType) => {
    switch (cityType) {
        case 'Hamlet': return 1;
        case 'Village': return 1;
        case 'Town': return 2;
        case 'Fort': return 1;
        case 'Stronghold': return RAND.getUniformInt(2, 4);
        case 'Capital': return RAND.getUniformInt(3, 5);
        default: return 1;
    }
};

const getRandomShopType = () => RAND.arrayGetRand(RG.SHOP_TYPES);

/* Adds shop generation constraints for the quarter. */
const addShopConstraints = (qConf, conf) => {
    const maxValue = conf.maxValue || 100;
    const shopTypeConf = conf.shopType || 'random';
    const qName = conf.name;

    if (qName === 'Market' || qName === 'Bazaar') {
        const nShops = RAND.getUniformInt(1, 3);
        qConf.nShops = nShops;
        qConf.constraint.shop = [];
        for (let i = 0; i < nShops; i++) {
            let shopType = getRandomShopType();

            // Optionally allow first shopType to be given
            if (shopTypeConf !== 'random' && i === 0) {
                shopType = shopTypeConf;
            }
            const shopConstr = [
                {op: 'eq', prop: 'type', value: shopType},
                {op: 'lte', prop: 'value', value: maxValue}
            ];
            qConf.constraint.shop.push(shopConstr);
        }
    }
    else {
        qConf.nShops = 1;
    }
};

/* Returns the configuration for city quarters. */
const getQuarterConf = (nQuarters: number, conf): IF.QuarterConf[] => {
    const quarters = [];
    for (let i = 0; i < nQuarters; i++) {
        const qName = Names.getGenericPlaceName('quarter');
        const qConf: IF.QuarterConf = {
            name: qName,
            nLevels: 1,
            constraint: {},
            maxDanger: RG.MAX_DANGER,
        };
        if (i === 0) {
            qConf.entranceLevel = 0;
        }

        addShopConstraints(qConf, conf);
        // TODO add any other special features based on the type
        quarters.push(qConf);
    }
    return quarters;
};
