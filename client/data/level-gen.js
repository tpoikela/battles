
/* This file contains code to generate the configuration for different types of
 * levels. Used in the overworld generation in overworld.js after the overworld
 * Map.Level has been created. */

const RG = require('../src/rg');
RG.Names = require('./name-gen');
const WorldConf = require('../src/world.creator');

const LevelGen = {};

const getNumLevels = function(name) {
    switch (name) {
        case 'Cave': return 1;
        case 'Crypt': return 2;
        case 'Dungeon': return 3;
        case 'Labyrinth': return 1;
        default: return 3;
    }
};

const getDungeonSizeXY = function(name) {
    const mediumSize = [RG.LEVEL_MEDIUM_X, RG.LEVEL_MEDIUM_Y];
    switch (name) {
        case 'Cave': return [80, 50];
        case 'Cavern': return [200, 200];
        case 'Grotto': return [120, 60];
        case 'Lair': return [200, 150];

        case 'Cells': return [100, 50];
        case 'Dungeon': return [100, 50];

        case 'Labyrinth': return [100, 100];

        case 'Crypt': return mediumSize;
        case 'Tombs': return [100, 100];
        case 'Catacombs': return [RG.LEVEL_HUGE_X, RG.LEVEL_HUGE_Y];

        default: return mediumSize;
    }

};

/* Returns generation constraints based on the level name. */
const getConstraint = function(name) {
    switch (name) {
        case 'Cave': return {
            actor: {op: 'eq', prop: 'type', value: ['animal', 'goblin']}
        };
        case 'Crypt': return {
            actor: {op: 'eq', prop: 'type', value: 'undead'}
        };
        default: return null;
    }
};

const getDungeonType = function(name) {
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

const getMountainSizeXY = function(name) {
    switch (name) {
        default: return [80, 240];
    }
};

//---------------------------------------------------------------------------
// DUNGEON GENERATION
//---------------------------------------------------------------------------

LevelGen.getDungeonConf = dungeonName => {
    let dungeonType = getDungeonType(dungeonName);
    const nLevels = getNumLevels(dungeonType);
    const constraint = getConstraint(dungeonType);
    const [dungeonX, dungeonY] = getDungeonSizeXY(dungeonName);

    dungeonType = dungeonType.toLowerCase();
    const obj = {
        name: dungeonName,
        dungeonX, dungeonY, dungeonType,
        nBranches: 1, // TODO multi-branch dungeons
        branch: [
            {name: dungeonName, nLevels, entranceLevel: 0}
        ]
    };

    if (constraint) {
        obj.constraint = constraint;
    }

    return obj;
};

//---------------------------------------------------------------------------
// MOUNTAIN GENERATION
//---------------------------------------------------------------------------

LevelGen.getMountainConf = mountainName => {
    const nLevels = 1;
    const [x, y] = getMountainSizeXY(mountainName);
    const conf = {
        name: mountainName,
        nFaces: nLevels,
        face: [
            {name: mountainName, nLevels, entranceLevel: 0, x, y}
        ],
        nSummits: 1,
        summit: [
            {name: 'Summit', nLevels: 1, cols: 80, rows: 50}
        ],
        connectLevels: [
            [mountainName, 'Summit', 0, 0]
        ]
    };
    return conf;
};

//---------------------------------------------------------------------------
// CITY GENERATION
//---------------------------------------------------------------------------

const getNumQuarters = (cityType) => {
    switch (cityType) {
        case 'Hamlet': return 2;
        case 'Village': return 1;
        case 'Town': return 2;
        case 'Fort': return 2;
        case 'Stronhold': return RG.RAND.getUniformInt(2, 4);
        case 'Capital': return RG.RAND.getUniformInt(3, 5);
        default: return 1;
    }
};

const getRandomShopType = () => RG.RAND.arrayGetRand(RG.SHOP_TYPES);

/* Adds shop generation constraints for the quarter. */
const addShopConstraints = (qConf, conf) => {
    const maxValue = conf.maxValue || 100;
    const shopTypeConf = conf.shopType || 'random';
    const qName = conf.name;

    if (qName === 'Market' || qName === 'Bazaar') {
        const nShops = RG.RAND.getUniformInt(1, 3);
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
const getQuarterConf = (nQuarters, conf) => {
    const quarters = [];
    for (let i = 0; i < nQuarters; i++) {
        const qName = RG.Names.getGenericPlaceName('quarter');
        const qConf = {
            name: qName,
            nLevels: 1,
            constraint: {}
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

LevelGen.getCityConf = (cityName, conf) => {
    let cityType = RG.Names.getGenericPlaceName('city');
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
        cityType = RG.Names.getVillageType();
    }
    const nQuarters = getNumQuarters(cityType);
    const quarters = getQuarterConf(nQuarters, conf);
    const connect = WorldConf.createQuarterConnections(quarters);
    const obj = {
        name: cityName,
        nQuarters,
        quarter: quarters
    };

    if (connect) {obj.connectLevels = connect;}
    return obj;
};

module.exports = LevelGen;
