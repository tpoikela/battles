
const RG = require('./rg.js');
RG.Random = require('./random');

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
    excavation: 'Medium',
    forestation: 'Medium',
    population: 'Medium',
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

/* The object creates the initial high-level world configuration which is used
 * to build the world containing all playable levels.
 * NOTE: To keep the code shorter, 'conf' refers always to the global
 * configuration. It's always the last param for each function.
 */
const Creator = function() {

    this.featCoeff = 0.3;

    // Assumptions: Increase difficulty the more player travels from starting
    // position. Start is always at Math.floor(xMax/2), yMax.
    // Moving between areas is equivalent of X difficulty steps increase

    this.createWorldConf = function(conf) {
        // Assign user conf over default first
        Object.keys(defaultConf).forEach(key => {
            if (!conf.hasOwnProperty(key)) {
                conf[key] = defaultConf[key];
            }
        });

        this.rand = new RG.Random();
        this.rand.setSeed(conf.seed);

        const areas = this.createAreasConf(conf);
        const playerStart = this.getPlayerStart(areas, conf);
        return {
            name: conf.name,
            nAreas: areas.length,
            area: areas,
            playerStart
        };
    };

    /* Create object for player position. */
    this.getPlayerStart = function(areas, conf) {
        const firstArea = areas[0];
        const maxY = firstArea.maxY;
        const midX = Math.floor(firstArea.maxX);
        return {
            place: conf.name, // rename to area.name
            x: midX, y: maxY
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
        const dungeons = this.createDungeonsConf(areaConf, conf);
        const cities = this.createCitiesConf(areaConf, conf);
        const mountains = this.createMountainsConf(areaConf, conf);

        return {
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
    // DUNGEONS
    //---------------

    // :w
    this.createDungeonsConf = function(areaConf, conf) {
        const nDungeons = this.getNumFeatures('dungeon', areaConf, conf);
        const dungeons = [];
        for (let i = 0; i < nDungeons; i++) {
            const dungeon = this.createSingleDungeonConf(areaConf, conf);
            dungeons.push(dungeon);
        }
        return dungeons;
    };

    /* Creates conf for a single dungeon. */
    this.createSingleDungeonConf = function(areaConf, conf) {
        const xy = this.getXYInArea(areaConf);
        const dungeonConf = Object.assign({}, areaConf);
        dungeonConf.x = xy.x;
        dungeonConf.y = xy.y;

        const branches = this.createBranchesConf(dungeonConf, conf);
        const connect = this.createBranchConnections('branch', branches);

        const obj = {
            name: this.getName('dungeon'),
            x: xy.x,
            y: xy.y,
            nBranches: branches.length,
            branch: branches
        };
        if (connect) {obj.connect = connect;}
        return obj;
    };

    /* Creates branches config for dungeon. This include entrance and branch
     * connections. */
    this.createBranchesConf = function(dungeonConf, conf) {
        const nBranches = this.getNumBranches(dungeonConf, conf);
        const branches = [];
        for (let i = 0; i < nBranches; i++) {
            const branch = this.createSingleBranchConf(dungeonConf, conf);
            branches.push(branch);

            // For now, entrance is always from level 0 of br 0
            if (i === 0) {
                branch.entranceLevel = 0;
            }
        }
        return branches;
    };

    this.createSingleBranchConf = function(dungeonConf, conf) {
        const nLevels = this.getNumLevels('dungeon', dungeonConf, conf);
        return {
            name: this.getName('branch'),
            nLevels
        };
    };

    //---------------
    // CITIES
    //---------------

    this.createCitiesConf = function(areaConf, conf) {
        const nCities = this.getNumFeatures('city', areaConf, conf);
        const cities = [];
        for (let i = 0; i < nCities; i++) {
            const city = this.createSingleCityConf(areaConf, conf);
            cities.push(city);
        }
        return cities;
    };

    this.createSingleCityConf = function(areaConf, conf) {
        const xy = this.getXYInArea(areaConf);
        const cityConf = Object.assign({}, areaConf);
        cityConf.x = xy.x;
        cityConf.y = xy.y;

        const quarters = this.createQuartersConf(cityConf, conf);
        const connect = this.createQuarterConnections('quarter', quarters);

        const obj = {
            name: '',
            x: xy.x,
            y: xy.y,
            nQuarters: quarters.length,
            quarter: quarters
        };
        if (connect) {obj.connect = connect;}
        return obj;
    };

    /* Creates the config for quarters of single city. */
    this.createQuartersConf = function(cityConf, conf) {
        const nQuarters = this.getNumQuarters(cityConf, conf);
        const quarters = [];
        for (let i = 0; i < nQuarters; i++) {
            const quarter = this.createSingleQuarterConf(cityConf, conf);
            if (i === 0) {
                quarter.entranceLevel = 0;
            }
            quarters.push(quarter);
        }
        return quarters;
    };

    /* THis function decide on the structure of quarter, nHouses, shops etc. */
    this.createSingleQuarterConf = function(cityConf, conf) {
        const nLevels = this.getNumLevels('city', cityConf, conf);
        return {
            nLevels,
            name: this.getName('quarter')
        };
    };

    /* Connects all city quarters together. */
    this.createQuarterConnections = function(type, feats) {
        if (feats.length === 1) {return null;}
        const connections = [];
        for (let i = 1; i < feats.length; i++) {
            const br0 = feats[i - 1];
            const br1 = feats[i];
            const l0 = this.rand.getWeightedLinear(br0.nLevels - 1);
            const l1 = 0; // TODO add some randomization
            const connect = [br0.name, br1.name, l0, l1];
            connections.push(connect);
        }
        return connections;
    };

    //---------------
    // MOUNTAINS
    //---------------

    this.createMountainsConf = function(areaConf, conf) {
        const nMountains = this.getNumFeatures('mountain', areaConf, conf);
        const mountains = [];
        for (let i = 0; i < nMountains; i++) {
            const mountain = this.createSingleMountainConf(areaConf, conf);
            mountains.push(mountain);
        }
        return mountains;
    };

    this.createSingleMountainConf = function(areaConf, conf) {
        const xy = this.getXYInArea(areaConf);
        const mountConf = Object.assign({}, areaConf);
        mountConf.x = xy.x;
        mountConf.y = xy.y;

        const faces = this.createFacesConf(mountConf, conf);
        const connect = this.createFaceConnections('mountain', faces);

        const obj = {
            name: '',
            x: xy.x,
            y: xy.y,
            nFaces: faces.length,
            face: faces
        };
        if (connect) {obj.connect = connect;}
        return obj;
    };

    this.createFacesConf = function(mountConf, conf) {
        const nFaces = this.getNumFaces(mountConf, conf);
        const faces = [];
        for (let i = 0; i < nFaces; i++) {
            const face = this.createSingleFaceConf(mountConf, conf);
            faces.push(face);

            // For now, entrance is always from level 0 of br 0
            if (i === 0) {
                face.entranceLevel = 0;
            }
        }
        return faces;
    };

    this.createSingleFaceConf = function(mountConf, conf) {
        const nLevels = this.getNumLevels('mountain', mountConf, conf);
        return {
            x: 100,
            y: 200,
            name: this.getName('face'),
            nLevels
        };
    };

    /* this.getDifficulty = function(x, y) {

    }; */

    /* Returns the number of features that should be generated. */
    this.getNumFeatures = function(type, areaConf, conf) {
        let nFeatures = (areaConf.maxX + 1) * (areaConf.maxY + 1);
        // TODO based on type/conf, adjust the number
        nFeatures = this.rand.getNormal(nFeatures, this.featCoeff * nFeatures);
        return nFeatures;
    };

    /* Given areaConf, return x,y position where the feature can be added. */
    this.getXYInArea = function(areaConf) {
        return {
            x: this.rand.getUniformInt(0, areaConf.maxX),
            y: this.rand.getUniformInt(0, areaConf.maxY)
        };
    };

    /* Returns more branches for dungeons further
     * from starting position. */
    this.getNumBranches = function(dungeonConf, conf) {
        return 1;
    };

    this.getNumQuarters = function(cityConf, conf) {
        return 1;
    };

    this.getNumFaces = function(mountConf, conf) {
        return 1;
    };

    this.getNumLevels = function(type, featConf, conf) {
        switch (type) {
            case 'dungeon': return this.rand.getUniformInt(1, 10);
            case 'city': return this.rand.getUniformInt(1, 3);
            case 'mountain': return this.rand.getUniformInt(1, 3);
            default: return 1;
        }
    };

    //-------------------
    // CONNECTING STUFF
    //-------------------

    /* Loops through feature list and connects them together. The connections
     * depend on the type parameter. */
    this.createBranchConnections = function(type, feats) {
        if (feats.length === 1) {return null;}
        const connections = [];
        for (let i = 1; i < feats.length; i++) {
            const br0 = feats[i - 1];
            const br1 = feats[i];
            const l0 = this.rand.getWeightedLinear(br0.nLevels - 1);
            const l1 = 0; // TODO add some randomization
            const connect = [br0.name, br1.name, l0, l1];
            connections.push(connect);
        }
        return connections;
    };


    /* Creates mountain face connections. */
    this.createFaceConnections = function(type, feats) {
        if (feats.length === 1) {return null;}
        const connections = [];
        for (let i = 1; i < feats.length; i++) {
            const f0 = feats[i - 1];
            const f1 = feats[i];
            const l0 = this.rand.getWeightedLinear(f0.nLevels - 1);
            const l1 = 0; // TODO add some randomization
            const connect = [f0.name, f1.name, l0, l1];
            connections.push(connect);
        }
        return connections;
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


module.exports = Creator;
