
import RG from '../rg';
import {SystemBase} from './system.base';
import {EventPool} from '../eventpool';
import {Dice} from '../dice';
import * as Component from '../component';
import {ELEM} from '../../data/elem-constants';
import {ObjectShell} from '../objectshellparser';

const handlerTable = {
    AddComp: true,
    ModifyCompValue: true,
    AddEntity: true,
    ChangeElement: true,
    RemoveComp: true
};

type HandleFunc = (ent, comp) => void;

// Can be updated when addEffect() if called
let handlerNames = Object.keys(handlerTable);

export class SystemEffects extends SystemBase {

    static handlerTable: {[key: string]: boolean};

    private _dtable: {[key: string]: HandleFunc};

    constructor(compTypes: string[], pool?: EventPool) {
        super(RG.SYS.EFFECTS, compTypes, pool);
        this._dtable = {};
        Object.keys(handlerTable).forEach(effName => {
            if (handlerTable[effName]) {
                const handlerName = 'handle' + effName.capitalize();
                this._dtable[effName] = this[handlerName].bind(this);
            }
        });
    }

    updateEntity(ent): void {
        const comps = ent.getList('Effects');
        comps.forEach(effComp => {
            const effType = effComp.getEffectType();
            if (effType && effType !== '') {
                if (this._dtable.hasOwnProperty(effType)) {
                    this._checkMsgEmits(ent, effComp);
                    this._dtable[effType](ent, effComp);
                }
                else {
                    RG.err('SystemEffects', 'updateEntity',
                    `Effect |${effType}| not in handler list: ${handlerNames}`);
                }
            }
            else {
                RG.err('SystemEffects', 'updateEntity',
                    'No effect type in Effects comp');
            }
            ent.remove(effComp);
        });
    }

    _checkMsgEmits(ent, effComp) {
        const useArgs = effComp.getArgs();
        if (useArgs.startMsg) {
            RG.gameMsg({cell: ent.getCell(), msg: useArgs.startMsg});
        }
    }

    //--------------------
    // HANDLER FUNCTIONS
    //--------------------

    /* Handler for effect 'AddComp'. Adds a component to target entity
     * for a given duration. */
    handleAddComp(srcEnt, effComp) {
        const useArgs = effComp.getArgs();
        const targetEnt = SystemEffects.getEffectTarget(useArgs);
        const compName = getCompName(useArgs, targetEnt);

        let compToAdd = null;
        if (Component.hasOwnProperty(compName)) {
            compToAdd = new Component[compName]();
        }

        // If setters are given, alter the values of added component
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

        if (compToAdd && compToAdd.setSource) {
            compToAdd.setSource(srcEnt);
        }

        // const dur = getDieValue(useArgs.duration);
        const dur = Dice.getValue(useArgs.duration);
        const expirMsg = useArgs.endMsg;

        Component.addToExpirationComp(targetEnt, compToAdd, dur, expirMsg);
        /* if (useArgs.startMsg) {
            RG.gameMsg({msg: useArgs.startMsg, cell: targetEnt.getCell()});
        }*/
    }

    /* Adds a value to an existing component value. */
    handleModifyCompValue(srcEnt, effComp) {
        const useArgs = effComp.getArgs();
        const targetEnt = SystemEffects.getEffectTarget(useArgs);
        const compName = getCompName(useArgs, targetEnt);

        if (targetEnt) {
            if (targetEnt.has(compName)) {
                const comp = targetEnt.get(compName);
                const currValue = comp[useArgs.get]();
                const value = useArgs.value;
                const numValue = convertValueIfNeeded(value);
                comp[useArgs.set](currValue + numValue);
            }
        }
    }

    /* Adds an entity to target cell. */
    handleAddEntity(srcEnt, effComp) {
        const useArgs = effComp.getArgs();
        const cell = getTargetCellOrFail(useArgs);

        const parser = ObjectShell.getParser();
        const entity = parser.createEntity(useArgs.entityName);

        if (entity) {
            const [x, y] = [cell.getX(), cell.getY()];
            const level = srcEnt.getLevel();
            if (level.addEntity(entity, x, y)) {
                if (useArgs.duration) {
                    const fadingComp = new Component.Fading();
                    const {duration} = useArgs;
                    fadingComp.setDuration(duration);
                    entity.add(fadingComp);

                }
                // Add the srcEnt to created entity to track its damage etc
                // for experience and action monitoring
                const createdComp = new Component.Created();
                createdComp.setCreator(srcEnt);
                entity.add(createdComp);
            }
        }
    }

    handleChangeElement(srcEnt, effComp) {
        const useArgs = effComp.getArgs();
        const cell = getTargetCellOrFail(useArgs);
        const fromType = useArgs.fromType;
        const toType = useArgs.toType || ELEM.FLOOR;
        if (cell.getBaseElem().getType() === fromType) {
            cell.setBaseElem(toType);
        }
    }

    handleRemoveComp(srcEnt, effComp) {
        const useArgs = effComp.getArgs();
        const targetEnt = SystemEffects.getEffectTarget(useArgs);
        const compName = getCompName(useArgs, targetEnt);

        if (targetEnt.has(compName)) {
            if (useArgs.all) {
                targetEnt.removeAll(compName);
            }
            else {
                targetEnt.remove(compName);
            }
        }
    }

    //---------------
    // HANDLERS END
    //---------------

    /** Adds an effect into the effect system.
     * @param {string} effName - Name of the effect.
     * @param {function} func - Function to process the effect.
     * @return {boolean}
     * func receives args (srcEnt, effComp).
     */
    static addEffect(effName, func) {
        if (!handlerTable.hasOwnProperty(effName)) {
            const handlerName = 'handle' + effName.capitalize();
            SystemEffects.prototype[handlerName] = func;
            handlerTable[effName] = true;
            handlerNames = Object.keys(handlerTable);
            return true;
        }
        else {
            RG.err('SystemEffects', 'addEffect',
                `Effect ${effName} already exists.`);
        }
        return false;
    }

    /* Returns the target for the effect. Priority of targets is:
     * 1. actors 2. items 3. elements 4. base element
     */
    static getEffectTarget(useArgs) {
        const objTarget = useArgs.target;
        if (!objTarget) {
            const msg = 'Possibly missing args for useItem().';
            RG.err('system.effects.js', 'getEffectTarget',
                `Given object was null/undefined. ${msg}`);
        }
        return SystemEffects.getTargetFromObj(objTarget, useArgs.targetType);
    }

    static getTargetFromObj(objTarget, targetTypes) {
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
        else {
            return objTarget;
        }
        return null;
    }
}
SystemEffects.handlerTable = handlerTable;

//-------------------
// HELPER FUNCTIONS
//-------------------

function getCompName(useArgs, targetEnt) {
    const compName = useArgs.name;
    if (!compName) {
        const json = JSON.stringify(useArgs);
        let errorMsg = 'Unknown comp value. useArgs: ' + json;
        if (targetEnt) {errorMsg += ' targetEnt ' + JSON.stringify(targetEnt);}
        RG.err('SystemEffects', 'handleModifyCompValue',
            errorMsg);
    }
    return compName.capitalize();
}

/**
 * @param {int|string|RG.Die} intStrOrDie - Value for the die roll
 * @return {int} - Return of the die roll
 */
/*
const getDieValue = function(intStrOrDie) {
    if (Number.isInteger(intStrOrDie)) {
        return intStrOrDie;
    }
    else if (typeof intStrOrDie === 'string') {
        // const arr = RG.parseDieSpec(intStrOrDie);
        // const durDie = new RG.Die(arr[0], arr[1], arr[2]);
        const durDie = Dice.create(intStrOrDie);
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
*/

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

function getTargetCellOrFail(useArgs) {
    if (useArgs.target) {
        const targetObj = useArgs.target;
        if (targetObj.target) {
            return targetObj.target;
        }
    }
    const json = JSON.stringify(useArgs);
    RG.err('system.effects.js', 'getTargetCellOrFail',
        'Prop target must exist in useArgs ' + json);
    return null;
}
