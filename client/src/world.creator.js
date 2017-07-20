
// Default configuration for creation
const defaultConf = {
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
const elevToThr = {

};

// Climate created using linear gradient, right now simply from south (high Y)
// to north (low Y, down to 0).
// 0 = zero degrees C, warm > 0, cold < 0. Determines amount of snow.
const climateToGradient = {
    Warm: 0.5,
    Medium: 0.3,
    Cold: 0.1,
    Freezing: -0.2
};

/* THe object creates the initial high-level world configuration which is used
 * to build the world containing all playable levels. */
const Creator = function() {

    this.xMax = 0;
    this.yMax = 0;

    this.conf = defaultConf;

    // Assumptions: Increase difficulty the more player travels from starting
    // position. Start is always at Math.floor(xMax/2), yMax.
    // Moving between areas is equivalent of X difficulty steps increase

    this.createWorldConf = function(conf) {
        const areas = this.createAreasConf(conf);
        const playerStart = this.getPlayerStart(areas);
        return {
            name: conf.name,
            nAreas: areas.length,
            area: areas,
            playerStart
        };
    };

    this.createAreasConf = function(conf) {
        const nAreas = worldSizeToNum[conf.worldSize];
        const areas = [];
        for (var i = 0; i < nAreas; i++) {
            const areaConf = this.createSingleAreaConf(i, conf);
            areas.push(areaConf);
        }
    };

    /* Creates configuration for single area. Assume player starts at areaNum ==
     * 0, and adjust difficulty accordingly. */
    this.createSingleAreaConf = function(areaNum, conf) {
        const areaSize = areaSizeToXY[conf.areaSize];
        const maxX = areaSize.x;
        const maxY = areaSize.y;
        const dungeons = this.createDungeonsConf(areaNum, conf);
        const city = this.createCitiesConf(areaNum, conf);
        const mountain = this.createMountainsConf(areaNum, conf);
        return {
            maxX: maxX,
            maxY: maxY,
            nDungeons: dungeons.length,
            nCities: cities.length,
            nMountains: mountains.length,
            dungeon: dungeons,
            city: cities,
            mountain: mountains
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

    this.createDungeonConf = function(conf) {
        return {
            name: '',
            nBranches: 0,
            branch: branches
        };
    };

    this.getDifficulty = function(x, y) {

    };

};


module.exports = Creator;
