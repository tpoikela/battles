
/* NOTE: This file is unused at the moment. It has been replaced by overworld
*  generation, which is less random. */

const RG = require('./rg');
RG.Random = require('./random');

const RNG = RG.Random.getRNG();
const Names = require('../data/name-gen');

// Default configuration for creation
const defaultConf = {
    seed: 0,
    // Direct impact on low-level stuff
    difficulty: 'Medium',
    items: 'Medium',
    monsters: 'Medium',

    worldSize: 'Medium',
    areaSize: 'Medium',

    // World generation params
    climate: 'Medium',
    elevation: 'Medium',
    mountainSize: 'Medium',
    excavation: 'Medium',
    dungeonSize: 'Medium',
    forestation: 'Medium',
    population: 'Medium',
    citySize: 'Medium',
    size: 'Medium',
    water: 'Sparse'
};

// Maps sizes such as Small or Medium to numbers
const worldSizeToNum = {
    Small: 1,
    Medium: 2,
    Large: 4,
    Huge: 8
};

const featureScaleCoeff = {
    Small: 0.7,
    Medium: 1.0,
    High: 1.3,
    Huge: 1.7
};

// Maps sizes such as Small or Medium to numbers
const areaSizeToXY = {
    Small: {x: 3, y: 3},
    Medium: {x: 5, y: 5},
    Large: {x: 5, y: 7},
    Huge: {x: 7, y: 9}
};

// Elevation created using noise, map to thresholds. We need
/* const elevToThr = {

}; */

// Climate created using linear gradient, right now simply from south (high Y)
// to north (low Y, down to 0).
// 0 = zero degrees C, warm > 0, cold < 0. Determines amount of snow.
// At low-level, this can be achieved with snow ratio from 0 -> 1.
/* const climateToGradient = {
    Warm: 0.5,
    Medium: 0.3,
    Cold: 0.1,
    Freezing: -0.2
};*/

const WorldConf = {};

WorldConf.featCoeff = 0.3;

const getUniformInt = (min, max) => RNG.getUniformInt(min, max);

WorldConf.getBaseConf = type => {
    let feat = null;
    switch (type) {
        case 'branch': feat = WorldConf.createSingleBranchConf(); break;
        case 'city': {
            feat = {
                name: 'city', nQuarters: 1,
                quarter: [WorldConf.createSingleQuarterConf()]
            };
            break;
        }
        case 'dungeon': {
            feat = {
                name: 'dungeon', nBranches: 1,
                branch: [WorldConf.createSingleBranchConf()]
            };
            break;
        }
        case 'face': feat = WorldConf.createSingleFaceConf(); break;
        case 'mountain': {
            feat = {
                name: 'mountain', nFaces: 1,
                face: [WorldConf.createSingleFaceConf()]
            };
            break;
        }
        case 'quarter': feat = WorldConf.createSingleQuarterConf(); break;
        default: console.log('No legal featureType given');
    }
    return feat;
};

/* Connects all city quarters together. */
WorldConf.createQuarterConnections = feats => {
    if (feats.length === 1) {return null;}
    const connections = [];
    for (let i = 1; i < feats.length; i++) {
        const q0 = feats[i - 1];
        const q1 = feats[i];

        let l0 = RNG.getWeightedLinear(q0.nLevels - 1);
        const l1 = 0; // TODO add some randomization

        if (RG.isNullOrUndef([l0])) {
            l0 = q0.nLevels - 1;
        }
        const connect = [q0.name, q1.name, l0, l1];
        connections.push(connect);
    }
    return connections;
};

/* Creates mountain face connections. */
WorldConf.createFaceConnections = (type, feats) => {
    if (feats.length === 1) {return null;}
    const connections = [];
    for (let i = 1; i < feats.length; i++) {
        const f0 = feats[i - 1];
        const f1 = feats[i];

        let l0 = RNG.getWeightedLinear(f0.nLevels - 1);
        const l1 = 0; // TODO add some randomization

        if (RG.isNullOrUndef([l0])) {
            l0 = f0.nLevels - 1;
        }

        const connect = [f0.name, f1.name, l0, l1];
        connections.push(connect);
    }
    return connections;
};

/* Loops through feature list and connects them together. The connections
 * depend on the type parameter. */
WorldConf.createBranchConnections = (type, feats) => {
    if (feats.length === 1) {return null;}
    const connections = [];
    for (let i = 1; i < feats.length; i++) {
        const br0 = feats[i - 1];
        const br1 = feats[i];

        let l0 = RNG.getWeightedLinear(br0.nLevels - 1);
        const l1 = 0; // TODO add some randomization

        if (RG.isNullOrUndef([l0])) {
            l0 = br0.nLevels - 1;
        }

        const connect = [br0.name, br1.name, l0, l1];
        connections.push(connect);
    }
    return connections;
};

/* Sets x,y distance for given feature from the starting tile. */
WorldConf.setDistFromStart = (featConf, areaConf) => {
    const startX = Math.floor(areaConf.maxX / 2);
    const startY = areaConf.maxY;
    featConf.distX = Math.abs(featConf.x - startX);
    featConf.distY = Math.abs(featConf.y - startY);
    featConf.distSqr = Math.sqrt(
        Math.pow(featConf.distX, 2) + Math.pow(featConf.distY, 2)
    );
};

/* Create object for player position. */
WorldConf.getPlayerStart = (firstArea, conf) => {
    const maxY = firstArea.maxY - 1;
    const midX = Math.floor(firstArea.maxX / 2);
    return {
        place: conf.name, // rename to area.name
        x: midX, y: maxY
    };
};

/* Given areaConf, return x,y position where the feature can be added. */
WorldConf.getXYInArea = areaConf => ({
    x: getUniformInt(0, areaConf.maxX - 1),
    y: getUniformInt(0, areaConf.maxY - 1)
});

/* Returns more branches for dungeons further
 * from starting position. */
WorldConf.getNumBranches = (dungeonConf, conf) => {
    switch (conf.dungeonSize) {
        case 'Small': return 1;
        case 'Medium': return getUniformInt(1, 2);
        case 'Large': return getUniformInt(1, 3);
        case 'Huge': return getUniformInt(1, 4);
        default: return 1;
    }
};

WorldConf.getNumQuarters = (cityConf, conf) => {
    switch (conf.citySize) {
        case 'Small': return 1;
        case 'Medium': return getUniformInt(1, 2);
        case 'Large': return getUniformInt(1, 3);
        case 'Huge': return getUniformInt(1, 4);
        default: return 1;
    }
};

WorldConf.getNumFaces = (mountConf, conf) => {
    switch (conf.mountainSize) {
        case 'Small': return 1;
        case 'Medium': return getUniformInt(1, 2);
        case 'Large': return getUniformInt(1, 3);
        case 'Huge': return getUniformInt(1, 4);
        default: return 1;
    }
};

/* Returns the number of levels generated for given feature. */
WorldConf.getNumLevels = type /* , featConf, conf */ => {
    switch (type) {
        case 'dungeon': {
            return getUniformInt(1, 10);
        }
        case 'city': {
            return getUniformInt(1, 3);
        }
        case 'mountain': {
            return getUniformInt(1, 3);
        }
        default: return 1;
    }
};

/* Scales the number of features based on the corresponding value in conf.
 * */
WorldConf.scaleNumFeatures = (type, conf) => {
    switch (type) {
        case 'dungeon': {
            return featureScaleCoeff[conf.excavation];
        }
        case 'mountain': {
            return featureScaleCoeff[conf.elevation];
        }
        case 'city': {
            return featureScaleCoeff[conf.population];
        }
        default: RG.err('Creator', 'scaleNumFeatures',
            `Unknown feat type ${type}`);
    }
    return 1.0;
};

/* Given feature type (dungeon, city, mountain), returns
* the number of features that should be generated. */
WorldConf.getNumFeatures = (type, areaConf, conf) => {
    let nFeatures = (areaConf.maxX + 1) * (areaConf.maxY + 1);
    nFeatures = Math.ceil(nFeatures * WorldConf.scaleNumFeatures(type, conf));
    // TODO based on type/conf, adjust the number
    nFeatures = RNG.getNormal(nFeatures, WorldConf.featCoeff * nFeatures);
    return nFeatures;
};

//------------------
// DUNGEONS
//------------------

/* Creates configuration for all dungeons based on the (area)conf. */
WorldConf.createDungeonsConf = (areaConf, conf) => {
    const nDungeons = WorldConf.getNumFeatures('dungeon', areaConf, conf);
    const dungeons = [];
    for (let i = 0; i < nDungeons; i++) {
        const dungeon = WorldConf.createSingleDungeonConf(areaConf, conf);
        dungeons.push(dungeon);
    }
    return dungeons;
};


/* Creates conf for a single dungeon. */
WorldConf.createSingleDungeonConf = (areaConf, conf) => {
    const xy = WorldConf.getXYInArea(areaConf);
    const dungeonConf = Object.assign({}, areaConf);
    dungeonConf.x = xy.x;
    dungeonConf.y = xy.y;

    WorldConf.setDistFromStart(dungeonConf, areaConf);

    const branches = WorldConf.createBranchesConf(dungeonConf, conf);
    const connect = WorldConf.createBranchConnections('branch', branches);

    const obj = {
        name: Names.getGenericPlaceName('dungeon'),
        x: xy.x,
        y: xy.y,
        nBranches: branches.length,
        branch: branches
    };
    if (connect) {obj.connectLevels = connect;}
    return obj;
};

/* Creates branches config for dungeon. This include entrance and branch
 * connections. */
WorldConf.createBranchesConf = (dungeonConf, conf) => {
    const nBranches = WorldConf.getNumBranches(dungeonConf, conf);
    const branches = [];
    for (let i = 0; i < nBranches; i++) {
        const branch = WorldConf.createSingleBranchConf();
        branches.push(branch);

        // For now, entrance is always from level 0 of br 0
        if (i === 0) {
            branch.entranceLevel = 0;
        }
    }
    return branches;
};

WorldConf.createSingleBranchConf = () => {
    const nLevels = WorldConf.getNumLevels('dungeon');
    return {
        dungeonX: 80,
        dungeonY: 28,
        sqrPerItem: 40,
        sqrPerActor: 40,
        maxDanger: 2,
        maxValue: 100,
        dungeonType: 'digger',
        name: Names.getGenericPlaceName('branch'),
        nLevels
    };
};

//---------------------
// CITIES
//---------------------

/* THis function decide on the structure of quarter, nHouses, shops etc. */
WorldConf.createSingleQuarterConf = () => {
    const nLevels = WorldConf.getNumLevels('city');
    return {
        nLevels,
        name: Names.getGenericPlaceName('quarter')
    };
};

//------------
// MOUNTAINS
//------------

WorldConf.createSingleFaceConf = () => {
    const nLevels = WorldConf.getNumLevels('mountain');
    return {
        x: 100,
        y: 200,
        name: Names.getGenericPlaceName('face'),
        nLevels
    };
};

/* The object creates the initial high-level world configuration which is used
 * to build the world containing all playable levels.
 * NOTE: To keep the code shorter, 'conf' refers always to the global
 * configuration. It's always the last param for each function.
 */
WorldConf.Creator = function() {


    // Assumptions: Increase difficulty the more player travels from starting
    // position. Start is always at Math.floor(xMax/2), yMax.
    // Moving between areas is equivalent of X difficulty steps increase

    /* Main function. You should call this to get a full configuration to create
     * the world. This conf should be given to Factory.World. */
    this.createWorldConf = function(conf) {
        if (!conf.name) {
            RG.err('Creator', 'createWorldConf',
                'conf.name must be specified.');
        }

        // Assign user conf over default first
        Object.keys(defaultConf).forEach(key => {
            if (!conf.hasOwnProperty(key)) {
                conf[key] = defaultConf[key];
            }
        });

        this.rand = new RG.Random();
        this.rand.setSeed(conf.seed);

        const areas = this.createAreasConf(conf);
        const playerStart = WorldConf.getPlayerStart(areas[0], conf);
        return {
            name: conf.name,
            nAreas: areas.length,
            area: areas,
            playerStart
        };
    };

    //---------------
    // AREAS
    //---------------

    this.createAreasConf = function(conf) {
        const nAreas = worldSizeToNum[conf.worldSize];
        const areas = [];
        for (let i = 0; i < nAreas; i++) {
            const areaConf = this.createSingleAreaConf(i, conf);
            areas.push(areaConf);
        }
        return areas;
    };

    /* Creates configuration for single area. Assume player starts at areaNum ==
     * 0, and adjust difficulty accordingly. */
    this.createSingleAreaConf = function(areaNum, conf) {
        const areaSize = areaSizeToXY[conf.areaSize];
        const maxX = areaSize.x;
        const maxY = areaSize.y;

        // Need to pass this info other functions to determine number of
        // features and difficulty
        const areaConf = {
            maxX, maxY, areaNum
        };

        // Finally, get config for different sub-features in the world
        const dungeons = WorldConf.createDungeonsConf(areaConf, conf);
        const cities = this.createCitiesConf(areaConf, conf);
        const mountains = this.createMountainsConf(areaConf, conf);

        return {
            name: this.getName('area'),
            maxX,
            maxY,
            nDungeons: dungeons.length,
            nCities: cities.length,
            nMountains: mountains.length,
            dungeon: dungeons,
            city: cities,
            mountain: mountains
        };
    };


    //---------------
    // CITIES
    //---------------

    this.createCitiesConf = function(areaConf, conf) {
        const nCities = WorldConf.getNumFeatures('city', areaConf, conf);
        const cities = [];
        for (let i = 0; i < nCities; i++) {
            const city = this.createSingleCityConf(areaConf, conf);
            cities.push(city);
        }
        return cities;
    };

    this.createSingleCityConf = function(areaConf, conf) {
        const xy = WorldConf.getXYInArea(areaConf);
        const cityConf = Object.assign({}, areaConf);
        cityConf.x = xy.x;
        cityConf.y = xy.y;

        WorldConf.setDistFromStart(cityConf, areaConf);

        const quarters = this.createQuartersConf(cityConf, conf);
        const connect = WorldConf.createQuarterConnections(quarters);

        const obj = {
            name: '',
            x: xy.x,
            y: xy.y,
            nQuarters: quarters.length,
            quarter: quarters
        };
        if (connect) {obj.connectLevels = connect;}
        return obj;
    };

    /* Creates the config for quarters of single city. */
    this.createQuartersConf = (cityConf, conf) => {
        const nQuarters = WorldConf.getNumQuarters(cityConf, conf);
        const quarters = [];
        for (let i = 0; i < nQuarters; i++) {
            const quarter = WorldConf.createSingleQuarterConf();
            if (i === 0) {
                quarter.entranceLevel = 0;
            }
            quarters.push(quarter);
        }
        return quarters;
    };


    //---------------
    // MOUNTAINS
    //---------------

    this.createMountainsConf = function(areaConf, conf) {
        const nMountains = WorldConf.getNumFeatures('mountain', areaConf, conf);
        const mountains = [];
        for (let i = 0; i < nMountains; i++) {
            const mountain = this.createSingleMountainConf(areaConf, conf);
            mountains.push(mountain);
        }
        return mountains;
    };

    this.createSingleMountainConf = function(areaConf, conf) {
        const xy = WorldConf.getXYInArea(areaConf);
        const mountConf = Object.assign({}, areaConf);
        mountConf.x = xy.x;
        mountConf.y = xy.y;

        WorldConf.setDistFromStart(mountConf, areaConf);

        const faces = this.createFacesConf(mountConf, conf);
        const connect = WorldConf.createFaceConnections('mountain', faces);

        const obj = {
            name: '',
            x: xy.x,
            y: xy.y,
            nFaces: faces.length,
            face: faces
        };
        if (connect) {obj.connectLevels = connect;}
        return obj;
    };

    this.createFacesConf = (mountConf, conf) => {
        const nFaces = WorldConf.getNumFaces(mountConf, conf);
        const faces = [];
        for (let i = 0; i < nFaces; i++) {
            const face = WorldConf.createSingleFaceConf();
            faces.push(face);

            // For now, entrance is always from level 0 of br 0
            if (i === 0) {
                face.entranceLevel = 0;
            }
        }
        return faces;
    };

    //----------------------------
    // NAME GEN FUNCTIONS
    // For debugging, names are stupid for now
    //----------------------------

    this.nCreated = {};
    this.getName = function(type) {
        if (!this.nCreated.hasOwnProperty(type)) {
            this.nCreated[type] = 0;
        }
        this.nCreated[type] += 1;
        return `${type} ${this.nCreated[type]}`;
    };

};

module.exports = WorldConf;
