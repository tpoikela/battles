
var GS = {};

var getSource = function(keys, fname) {
    var has_require = typeof require !== 'undefined';

    if (typeof window !== 'undefined') {
        if (typeof keys === "object") {
            if (keys.length === 1)
                var src = window[keys[0]];
            else if (keys.length === 2)
                var src = window[keys[0]][keys[1]];
            else if (keys.length === 3)
                var src = window[keys[0]][keys[1]][keys[2]];
            else if (keys > 3) {
                throw new Error("Too many nested names. Cannot import.");
            }
        }
        else {
            var src = window[keys];
        }
    }

    if (typeof src === 'undefined' ) {
        if (has_require) {
          src = require(fname);
        }
        else throw new Error('Module ' + keys + ' not found');
    }

    return src;
};

GS.getSource = getSource;

/** At the moment, a bit of a hack. Max. names hardcoded to 3 hierarchicals, ie.
 * A.B.C will still work, but A.B.C.D is too much.*/
var exportSource = function(keys) {

    console.log("RG" + RG);

    var evalVar = function (keys) {
        var varName = "";
        for (var i = 0; i < keys.length; i++) {
            varName += keys[i] + ".";
        }

        varName = varName.replace(/\.$/, "");
        return eval(varName);
    };

    var assignToExports = function(keys) {
        var fullVar = "";
        for (var i = 0; i < keys.length; i++) {
            fullVar += keys[i];
            console.log("Full var is now " + fullVar);
            eval("exports." + fullVar) = eval(fullVar);
            fullVar += ".";
        }
    };


    var evaledVar = evalVar(keys);
    if (typeof exports !== 'undefined' ) {
        if (keys.length === 1) {
            if (typeof evaledVar !== 'undefined' && module.exports ) {
                exports = module.exports = evaledVar;
            }
            assignToExports(keys);
        }
        else if (keys.length === 2) {
            if (typeof evaledVar !== 'undefined' && module.exports ) {
                exports = module.exports = evaledVar;
            }
            assignToExports(keys);

        }
        else if (keys.length === 3) {
            if (typeof evaledVar !== 'undefined' && module.exports ) {
                exports = module.exports = evaledVar;
            }
            assignToExports(keys);
        }
    }
    else {
        if (keys.length == 1) {
            window[keys[0]] = evaledVar;
        }
        else if (keys.length == 2) {
            window[keys[0]][keys[1]] = evaledVar;
        }
        else if (keys.length == 3) {
            window[keys[0]][keys[1]][keys[2]] = evaledVar;
        }
        else {
            throw new Error("Too many names. Only up to 3 are supported.");
        }
    }
}

GS.exportSource = exportSource;

// Export for Node or to browser window
if (typeof exports !== 'undefined') {
    exports = module.exports = GS;
}
else {
    window.getSource = getSource;
    window.exportSource = exportSource;
}

var sourceRe = new RegExp("getsource");

// Redefine require(...) but for browser only
if (typeof window !== 'undefined') {
    console.log("XXX got here");
    var has_require = typeof require !== 'undefined';

    if (!has_require) {
        console.log("Oh no. Has no require");
        var require = function(modName) {
            console.log("Called fake require. Oh no!");
            if (sourceRe.test(modName)) {
                return GS;
            }
            else throw new Error("Only ../getsource.js is supported for browsers.");
        };
    }

};

