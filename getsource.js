/**
 * A custom module for importing/exporting modules in CommonJS style. Should
 * work with both Node and browsers (Tested only FF 38.0.5)
 *
 * For browser, you must include <script src="/path/to/getsource.js"></script>
 * as first js-file.
 *
 * In your source file, you can do:
 *
 * var GS = require("./path/to/getsource.js");
 *
 * // To import
 * var Stuff = GS.getSource("Stuff", "./path/to/Stuff.js");
 * Stuff.SubMod = GS.getSource(["Stuff", "SubMod"], "./path/to/StuffSubMod.js");
 *
 * // To export
 * GS.exportSource(module, exports, ["Stuff"], [Stuff]);
 * GS.exportSource(module, exports, ["Stuff", "SubMod"], [Stuff, Stuff.SubMod]);
 */

var GS = {
    errorIfNullOrUndef: function(keys, objs) {
        for (var i = 0; i < objs.length; i++) {
            if (objs[i] === null || typeof objs[i] === "undefined") {
                throw new Error("Object not well-defined: " + keys[i]);
            }
        }
    },
};

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
var exportSource = function(module, exports, keys, objs) {
    GS.errorIfNullOrUndef(keys, objs);

    var nLast = objs.length - 1;
    var lastObj = objs[nLast];

    var assignToExports = function(keys, objs) {
        var fullVar = "";
        for (var i = 0; i < keys.length; i++) {
            fullVar += keys[i];
            if (/[a-zA-Z_0-9.]+/.test(fullVar)) {
                var cmd = "exports." + fullVar + " = objs[i]";
                eval(cmd);
                fullVar += ".";
            }
            else {
                throw new Error("Illegal var name. Must contain only [a-zA-Z0-9_].");
            }
        }
    };

    if (typeof exports !== 'undefined' ) {
        if (typeof lastObj !== 'undefined' && module.exports ) {
            exports = module.exports = lastObj;
        }
        assignToExports(keys, objs);
    }
    else {
        if (keys.length == 1) {
            window[keys[0]] = lastObj;
        }
        else if (keys.length == 2) {
            window[keys[0]][keys[1]] = lastObj;
        }
        else if (keys.length == 3) {
            window[keys[0]][keys[1]][keys[2]] = lastObj;
        }
        else {
            throw new Error("Too many names. Only up to 3 are supported.");
        }
    }
};

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

// Redefine require(...), but for the browser only. After this file is included
// using <script src=...>, it can be required in any file.
if (typeof window !== 'undefined') {
    var has_require = typeof require !== 'undefined';

    if (!has_require) {
        var require = function(modName) {
            if (sourceRe.test(modName)) {
                return GS;
            }
            else throw new Error("Only ../getsource.js is supported for browsers. Got " + modName);
        };
    }

}

