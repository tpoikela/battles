
/* This file contains code to generate the configuration for different types of
 * levels. */

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

/* Returns generation constraints based on the level name. */
const getConstraint = function(name) {
    switch (name) {
        case 'Cave': return {
            actor: actor => actor.type === 'animal' || actor.type === 'goblin'
        };
        case 'Crypt': return {
            actor: actor => actor.type === 'undead'
        };
        default: return null;
    }
};

const convertToImplemented = function(name) {
    switch (name) {
        case 'Grotto': return 'Cave';
        case 'Cavern': return 'Cave';
        case 'Catacombs': return 'Crypt';
        case 'Tombs': return 'Crypt';
        case 'Cells': return 'Dungeon';
        default: return name;
    }
};

//---------------------------------------------------------------------------
// DUNGEON GENERATION
//---------------------------------------------------------------------------

LevelGen.getDungeonConf = dungeonName => {
    const usedName = convertToImplemented(dungeonName);
    // const brName = RG.Names.getGenericPlaceName('branch');
    const nLevels = getNumLevels(usedName);
    const constraint = getConstraint(usedName);
    const obj = {
        name: dungeonName,
        dungeonType: usedName.toLowerCase(),
        nBranches: 1,
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
        qConf.shop = [];
        for (let i = 0; i < nShops; i++) {
            let shopType = getRandomShopType();

            // Optionally allow first shopType to be given
            if (shopTypeConf !== 'random' && i === 0) {
                shopType = shopTypeConf;
            }
            const shopFunc = (item) => (
                item.type === shopType && item.value <= maxValue
            );
            qConf.push(shopFunc);
        }
    }
};

/* Returns the configuration for city quarters. */
const getQuarterConf = (nQuarters, conf) => {
    const quarters = [];
    for (let i = 0; i < nQuarters; i++) {
        const qName = RG.Names.getGenericPlaceName('quarter');
        const qConf = {
            name: qName,
            nLevels: 1
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
    const nQuarters = getNumQuarters(cityType, conf);
    const quarters = getQuarterConf(nQuarters, conf);
    const connect = WorldConf.createQuarterConnections(quarters);
    const obj = {
        name: cityName,
        nQuarters,
        quarter: quarters
    };

    if (connect) {obj.connect = connect;}
    return obj;
};

module.exports = LevelGen;
