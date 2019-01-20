
import RG from './rg';

type Level = import('./level').Level;
type Cell = import('./map.cell').Cell;

interface IConfData {
    [key: string]: any;
}

/* This file contains verification functions for game logic. */

/* Verifies that all stairs are properly connected. */
export const verifyStairsConnections = function(game, msg) {
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

export class Conf {

    private _name: string;

    constructor(objName: string) {
        this._name = objName;
    }

    /* Verifies that configuration contains all required keys.*/
    public verifyConf(funcName: string, conf: IConfData, required: string[]) {
        let ok = true;
        let errorMsg = '';
        required.forEach(req => {
            if (!this.verifyReq(conf, req)) {
                ok = false;
                errorMsg += ` Missing: ${req}`;
            }
            else if (reqHasNullValue(conf, req)) {
                ok = false;
                errorMsg += ` Undef/null value in: ${req}`;
            }
        });
        if (!ok) {
            RG.err(this._name, 'verifyConf', `${funcName} ${errorMsg}`);
        }
        return ok;
    }

    /* Verifies that a requirement is met, ie it exists. */
    public verifyReq(conf: IConfData, req: string) {
        const allReqs = req.split('|');
        let ok = false;
        allReqs.forEach(givenReq => {
            if (conf.hasOwnProperty(givenReq)) {
                if (!ok) {
                    ok = true;
                }
                else {
                    const confJSON = JSON.stringify(conf);
                    const msg = `Req ${req} is mutex. Conf: ${confJSON}`;
                    RG.err(this._name, 'verifyReq', msg);
                }
            }
        });
        return ok;
    }


}

/* Returns true if a requirement has a null value. */
function reqHasNullValue(conf: IConfData, req: string): boolean {
    const allReqs = req.split('|');
    const ok = allReqs.length > 0;
    let hasNull = false;
    for (const givenReq of allReqs) {
        if (conf.hasOwnProperty(givenReq)) {
            if (RG.isNullOrUndef([conf[givenReq]])) {
                hasNull = true;
            }
        }
    }
    return !ok && hasNull;
}

export const verifySaveData = function(data, failFast = true) {
    traverseObj(data, failFast);
};

const stack = [];
export function traverseObj(obj: any, failFast?: boolean, maxStack = 30) {
    const allErrors = [];
    for (const prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            stack.push(prop);
            if (stack.length < maxStack) {
                if (typeof obj[prop] === 'object') {
                    traverseObj(obj[prop]);
                }
                else if (typeof obj[prop] === 'function') {
                    let msg = `Error. Func in ${JSON.stringify(stack)}`;
                    msg += `\n\tProp: ${prop}`;
                    msg += `\n\tValue: ${obj[prop].toString()}`;
                    if (failFast) {
                        throw new Error(msg);
                    }
                    else {
                        allErrors.push(msg);
                    }
                }
                else if (typeof obj[prop] === 'string') {
                    if (/function/.test(obj[prop])) {
                        let msg = `function in string <<${obj[prop]}>>\n`;
                        msg += `\tStack is ${stack.join('.')}`;
                        throw new Error(msg);
                    }

                }
            }
            stack.pop();
        }
    }
    if (allErrors.length > 0) {
        const msg = allErrors.join('\n');
        throw new Error(msg);
    }
}

/* Checks that cell items match the level cache of items. */
export function verifyLevelCache(level: Level) {
    const items = level.getItems();
    const map = level.getMap();
    const cells: Cell[] = map.getCells();

    const cellItems = {};
    cells.forEach((cell: Cell) => {
        if (cell.hasItems()) {
            const cItems = cell.getItems();
            cItems.forEach(item => {
                cellItems[item.getID()] = item;
            });
        }
    });

    const levelItems = {};
    items.forEach(item => {
        levelItems[item.getID()] = item;
    });

    const nCellItems = Object.keys(cellItems).length;
    const nLevelItems = Object.keys(levelItems).length;
    if (nLevelItems !== nCellItems) {
        let msg = `nCellItems: ${nCellItems}`;
        msg += `, nLevelItems: ${nLevelItems}`;
        console.error('Mismatch in cell/level item length:', msg);
    }

    const inCellsButNotLevel = [];
    Object.keys(cellItems).forEach(id => {
        if (levelItems.hasOwnProperty(id)) {
            delete levelItems[id];
        }
        else {
            inCellsButNotLevel.push(cellItems[id]);
        }
    });

    const inLevelButNotCells = [];
    Object.keys(levelItems).forEach(id => {
        if (cellItems.hasOwnProperty(id)) {
            delete cellItems[id];
        }
        else {
            inLevelButNotCells.push(levelItems[id]);
        }
    });

    inCellsButNotLevel.forEach(item => {
        console.error('\tIn cells but NOT level: ', item.getName());
    });
    inLevelButNotCells.forEach(item => {
        console.error('\tIn level but NOT cells: ', item.getName());
    });
}

