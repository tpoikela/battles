
const RG = require('./rg.js');
const debug = require('debug')('bitn:ConfStack');

/* An Object for managing configuration/scope stacks when creating a world. */
const ConfStack = function() {

    this.globalConf = {};
    this.scope = [];
    this.confStack = [];

    this.setGlobalConf = function(conf) {
        this.globalConf = conf;
    };

    this.getGlobalConf = function() {
        return this.globalConf;
    };

    this.getScope = function() {
        return this.scope;
    };

    /* Pushes the hier name and configuration on the stack. Config can be
    * queried with getConf(). */
    this.pushScope = function(conf) {
        this.scope.push(conf.name);
        this.confStack.push(conf);
        this.debug('Pushed scope: ' + conf.name);
    };

    /* Removes given config and the name it contains from stacks. Reports an
    * error if removed name does not match the name in conf. */
    this.popScope = function(conf) {
        const name = conf.name;
        const poppedName = this.scope.pop();
        if (poppedName !== name) {
            RG.err('Factory.ConfStack', 'popScope',
                `Popped: ${poppedName}, Expected: ${name}`);
        }
        else {
            const currConf = this.confStack.pop();
            this.debug('Popped scope: ' + currConf.name);
        }
    };

    /* Returns a config value. */
    this.getConf = function(keys) {
        // First travel the config stack from the top
        for (let i = this.confStack.length - 1; i >= 0; i--) {
            this.debug(i + ' looking for ' + keys);
            if (this.confStack[i].hasOwnProperty(keys)) {
                return this.confStack[i][keys];
            }
        }

        // If nothing found, try the global configuration
        if (this.globalConf.hasOwnProperty(keys)) {
            return this.globalConf[keys];
        }

        return null;
    };

    this.debug = function(msg) {
        if (debug.enabled) {
            RG.diag(msg);
        }
    };

};

module.exports = ConfStack;
