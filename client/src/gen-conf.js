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
        }
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
