
const RG = require('./rg');

/* This file contains verification functions for game logic. */

RG.Verify = {};

RG.Verify.Conf = function(objName) {
    const _name = objName;

    /* Verifies that configuration contains all required keys.*/
    this.verifyConf = (funcName, conf, required) => {
        let ok = true;
        let errorMsg = '';
        required.forEach(req => {
            if (!conf.hasOwnProperty(req)) {
                ok = false;
                errorMsg += ` Missing: ${req}`;
            }
            else if (RG.isNullOrUndef([conf[req]])) {
                ok = false;
                errorMsg += ` Undef/null value in: ${req}`;
            }
        });
        if (!ok) {
            RG.err(_name, 'verifyConf', `${funcName} ${errorMsg}`);
        }
        return ok;
    };

};

module.exports = RG.Verify;
