/* THis file serves mainly as documentation purposes for different configuration
 * objects used in generation of features.
 */

const ConfGen = {};

ConfGen.Level = {
    create: () => ({
        itemsPerLevel: -1,
        actorsPerLevel: -1,
        maxDanger: -1,
        maxValue: -1,
        func: () => true
    })
};

ConfGen.Zone = {
    create: () => ({
        name: '',
        owX: -1, owY: -1,
        x: -1, y: -1,
        levelX: -1, levelY: -1,
        constraint: {
            actor: [],
            item: [],
            shop: [],
            food: [],
            gold: []
        },

        friendly: false // Is it friendly city/village?

        // Some of these based of zone type
        // nQuarters: , quarter: []
        // nBranches: , branch: []
        // nSummits: , summit: []
        // nFaces: , face: []
    })
};

ConfGen.AreaConstraint = {
    create: () => ({
        constraint: {
            // for each area tile, separate constraints can be passed using
            // [x + ',' + y] of the tile as first key:
            ['1' + ',' + '-1']: {
                actor: [],
                item: []
            }

        }
    })
};

ConfGen.SubZone = {
    create: () => ({
        name: '',
        nLevels: -1,
        constraint: { /* See ConfGen.Zone */}
    })
};

ConfGen.Area = {
    create: () => ({
        name: '',
        maxX: -1, maxY: -1,
        nCities: -1,
        nDungeons: -1,
        nMountains: -1,
        city: [], // ConfGen.Zone*
        mountain: [], // ConfGen.Zone*
        dungeon: [] // ConfGen.Zone*
    })
};

ConfGen.World = {
    create: () => ({
        name: '',
        nAreas: -1,
        area: [] // ConfGen.Area*
    })
};

/* Validates the configuration of specific type against template
 * found in this file.
 */
ConfGen.validate = function(type, givenConf) {
    const templ = ConfGen[type].create();
    const data = {
        missing: [],
        scope: []
    };
    return validateObject(data, templ, givenConf);
};

function validateObject(data, templ, givenConf) {
    let ok = true;
    Object.keys(templ).forEach(key => {
        if (givenConf.hasOwnProperty(key)) {
            data.missing.push(key);
            ok = false;
        }
        else if (typeof templ[key] !== typeof givenConf[key]) {
            ok = false;
        }
        else {
            const templVal = templ[key];
            const givenVal = givenConf[key];
            if (Array.isArray(templVal)) {
                // TODO
            }
            else if (typeof templVal === 'object') {
                data.scope.push(key);
                validateObject(data, templVal, givenVal);
                data.scope.pop();
            }

        }
    });
    return ok;
}

module.exports = ConfGen;
