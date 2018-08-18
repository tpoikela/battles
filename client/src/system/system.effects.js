
const RG = require('../rg');

const System = {};
System.Base = require('./system.base');

const handlerTable = {
    AddComp: true
};

System.Effects = function(compTypes) {
    System.Base.call(this, RG.SYS.Effects, compTypes);
    this._dtable = {};
    Object.keys(handlerTable).forEach(effName => {
        const handlerName = 'handle' + effName.capitalize();
        this._dtable[effName] = this[handlerName].bind(this);
    });
};
RG.extend2(System.Effects, System.Base);

System.Effects.prototype.updateEntity = function(ent) {
    const comps = ent.getList('Effects');
    comps.forEach(effComp => {
        const effType = effComp.getEffectType();
        if (effType !== '') {
            if (this._dtable.hasOwnProperty(effType)) {
                this._dtable[effType](ent, effComp);
            }
        }
        else {
            RG.err('System.Effects', 'updateEntity',
                'No effect type in Effects comp');
        }
        ent.remove(effComp);
    });
};

System.Effects.prototype.handleAddComp = function(srcEnt, effComp) {
    console.log('handleAddComp: ' + srcEnt);
    console.log('handleAddComp: ' + effComp);
    const useArgs = effComp.getArgs();
    const targetEnt = getEffectTarget(useArgs);
    const name = useArgs.name.capitalize();
    let compToAdd = null;
    if (RG.Component.hasOwnProperty(name)) {
        compToAdd = new RG.Component[name]();
    }

    if (useArgs.setters) {
        const setters = useArgs.setters;
        Object.keys(setters).forEach(setFunc => {
            if (typeof compToAdd[setFunc] === 'function') {
                const valueToSet = setters[setFunc];
                const numValue = convertValueIfNeeded(valueToSet);
                compToAdd[setFunc](numValue);
            }
            else {
                const json = JSON.stringify(compToAdd);
                RG.err('useEffect', 'addComp',
                    `No ${setFunc} in comp ${json}`);
            }
        });
    }

    const dur = getDieValue(useArgs.duration);
    const expirMsg = useArgs.endMsg;
    console.log('Comp ' + name + ' will be added to', targetEnt);
    RG.Component.addToExpirationComp(targetEnt, compToAdd, dur, expirMsg);
    if (useArgs.startMsg) {
        RG.gameMsg({msg: useArgs.startMsg, cell: targetEnt.getCell()});
    }
};

/** Adds an effect into the effect system.
 * @param {string} effName - Name of the effect.
 * @param {function} func - Function to process the effect.
 * @return {boolean}
 * func receives args (srcEnt, effComp).
 */
System.Effects.addEffect = function(effName, func) {
    if (!handlerTable.hasOwnProperty(effName)) {
        const handlerName = 'handle' + effName.capitalize();
        System.Effects.prototype[handlerName] = func;
        return true;
    }
    else {
        RG.err('System.Effects', 'addEffect',
            `Effect ${effName} already exists.`);
    }
    return false;
};

//-------------------
// HELPER FUNCTIONS
//-------------------

const getDieValue = function(intStrOrDie) {
    if (Number.isInteger(intStrOrDie)) {
        return intStrOrDie;
    }
    else if (typeof intStrOrDie === 'string') {
        const arr = RG.parseDieSpec(intStrOrDie);
        const durDie = new RG.Die(arr[0], arr[1], arr[2]);
        const duration = durDie.roll();
        return duration;
    }
    else if (intStrOrDie.roll) {
        return intStrOrDie.roll();
    }
    RG.err('system.effects.js', 'getDieValue',
        'Could not extract value from ' + intStrOrDie);
    return 0;
};

const convertValueIfNeeded = function(intStrOrDie) {
    if (Number.isInteger(intStrOrDie)) {
        return intStrOrDie;
    }
    else if (typeof intStrOrDie === 'string') {
        const float = Number.parseFloat(intStrOrDie);
        if (!Number.isNaN(float)) {
            return float;
        }
    }
    return intStrOrDie;
};

/* Returns the target for the effect. Priority of targets is:
 * 1. actors 2. items 3. elements 4. base element
 */
const getEffectTarget = (useArgs) => {
    const objTarget = useArgs.target;
    if (!objTarget) {
        const msg = 'Possibly missing args for useItem().';
        RG.err('system.effects.js', 'getEffectTarget',
            `Given object was null/undefined. ${msg}`);
    }
    return getTargetFromObj(objTarget, useArgs.targetType);
};
System.Effects.getEffectTarget = getEffectTarget;

function getTargetFromObj(objTarget, targetTypes) {
    if (objTarget.hasOwnProperty('target')) {
        const cell = objTarget.target;
        let targetType = targetTypes;
        if (!targetType) {
            targetType = ['actors', 'items', 'elements', 'baseElem'];
        }
        if (!Array.isArray(targetType)) {targetType = [targetType];}

        for (let i = 0; i < targetType.length; i++) {
            if (cell.hasProp(targetType[i])) {
                return cell.getProp(targetType[i])[0];
            }
            else if (/base/.test(targetType[i])) {
                return cell.getBaseElem();
            }
        }
    }
    return null;
}
System.Effects.getTargetFromObj = getTargetFromObj;

module.exports = System.Effects;
