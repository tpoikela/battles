
const RG = require('./rg');

/* This file contains verification functions for game logic. */

RG.Verify = {};

/* Verifies that all stairs are properly connected. */
RG.Verify.verifyStairsConnections = function(game, msg) {
    const levels = game.getLevels();
    const stairsLists = levels.map(lv => lv.getStairs());
    stairsLists.forEach(sList => {
        sList.forEach(s => {
            if (typeof s.isConnected !== 'function') {
                RG.err('verify.js', 'verifyStairsConnections',
                    'stairs not correct type: ' + JSON.stringify(s));
            }
            else if (!s.isConnected()) {
                let errMsg = '|' + msg + '| stairs: ' + JSON.stringify(s);

                const srcLevel = s.getSrcLevel();
                if (!srcLevel) {
                    errMsg += ' srcLevel missing,';
                }
                else {
                    const srcLevel = s.getSrcLevel();
                    errMsg += ' srcLevel parent ' + srcLevel.getParent() + ',';
                }

                const targetLevel = s.getTargetStairs();
                if (!targetLevel) {
                    errMsg += ' targetLevel missing,';
                }
                else {
                    errMsg += ' targetLevel parent: ' + targetLevel.getParent();
                }

                if (!s.getTargetStairs()) {
                    errMsg += ' targetStairs missing';
                }
                RG.err('verify.js', 'verifyConnections', errMsg);
            }
        });
    });
};

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
