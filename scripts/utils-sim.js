/* This file contains utility functions/object for game simlation. */

const cmdLineArgs = require('command-line-args');

const UtilsSim = {};

UtilsSim.optDefs = [
    {name: 'args', alias: 'a', multiple: true, type: String,
        descr: 'Arbitrary args'},
    {name: 'class', alias: 'c', type: String, descr: 'Class of actor'},
    {name: 'debug', alias: 'd', type: Boolean, descr: 'Run in debug mode'},
    {name: 'file', type: String, descr: 'File input to do whatever'},
    {name: 'frame_period', type: Number, descr: 'Print every Nth frame'},
    {name: 'help', alias: 'h', type: Boolean, descr: 'Prints help message'},
    {name: 'load', type: Boolean, descr: 'Load game from the file'},
    {name: 'loadturn', type: Number, descr: 'Turn to load (optional)'},
    {name: 'maxturns', type: Number, descr: 'Turns to simulate'},
    {name: 'name', type: String, descr: 'Name of the character' },
    {name: 'nomsg', type: Boolean, descr: 'Disables game messages'},
    {name: 'nosave', type: Boolean, descr: 'Disables save during simulation'},
    {name: 'quiet', alias: 'q', type: Boolean, descr: 'No output to STDOUT'},
    {name: 'race', alias: 'r', type: String, descr: 'Race of actor'},
    {name: 'save_period', type: Number, descr: 'Save internal in turns'},
    {name: 'seed', type: Number, descr: 'Seed for the RNGs'},
    {name: 'verbosity', alias: 'v', type: String, descr: 'Verbosity level' }
];

/* Lazy method for getting options. Call this directly if you want to parse the
 * standard args for simulation. */
UtilsSim.getOpts = function() {
    const optDefs = UtilsSim.optDefs;
    let opts = cmdLineArgs(optDefs);
    opts = UtilsSim.getDefaults(opts);
    if (opts.help) {
        UtilsSim.usage(optDefs);
    }
    return opts;
};

UtilsSim.usage = function(optDefs) {
    optDefs.forEach(opt => {
        let type = opt.type.toString();
        type = (/(\w+)\(\)/).exec(type)[1];

        const ind = opt.name.length >= 6 ? '\t' : '\t\t';
        const str = `--${opt.name}:${ind}<${type}>\t${opt.descr}`;
        console.log(str);
    });
};

UtilsSim.getDefaults = function(opt) {
    const obj = Object.assign({}, opt);
    obj.name = obj.name || 'Player';
    obj.maxturns = obj.maxturns || 1000;
    obj.framePeriod = obj.frame_period || 1;
    obj.seed = obj.seed || 0;
    return obj;
};

UtilsSim.useBrowser = function() {
    return typeof window !== 'undefined';
};

UtilsSim.Log = function(opts) {
    const verb = opts.verbosity;
    this.verb = UtilsSim.VMEDIUM;

    if (UtilsSim.useBrowser()) {
        this.mountElem = document.querySelector('#mount-point');
    }

    if (UtilsSim[verb]) {
        this.verb = UtilsSim[verb];
    }
    else if (opts.verbosity) {
        console.warn(`No verbosity ${verb} found in UtilsSim`);
    }

    this.log = (...args) => {
        if (!opts.quiet) {
            if (this.mountElem) {
                this.mountElem.textContent = [...args];
            }
            else {
                console.log(...args);
            }

        }
    };

    this.info = (verb, ...args) => {
        if (verb <= this.verb) {
            if (this.mountElem) {
                this.mountElem.textContent = [...args];
            }
            else {
                console.log(...args);
            }
        }
    };
};

// Verbosity levels
UtilsSim.VNONE = 10;
UtilsSim.VLOW = 20;
UtilsSim.VMEDIUM = 50;
UtilsSim.VHIGH = 50;
UtilsSim.VALL = 100;
UtilsSim.VDEBUG = 150;

module.exports = UtilsSim;
