
import RG from '../rg';
import {SystemBase} from './system.base';
import {EventPool} from '../eventpool';
import {Dice} from '../dice';
import * as Component from '../component';
import {ELEM} from '../../data/elem-constants';
import {ObjectShell} from '../objectshellparser';
import {Element} from '../element';
import {ISuccessCheck, TPropType} from '../interfaces';
import {Entity} from '../entity';

type Cell = import('../map.cell').Cell;
import {EffArgs} from '../../data/effects';

const handlerTable = {
    AddComp: true,
    ModifyCompValue: true,
    AddEntity: true,
    AddElement: true,
    RemoveElement: true,
    ChangeElement: true,
    RemoveComp: true
};

type HandleFunc = (ent: Entity, comp) => boolean;

const TARGET_SPECIFIER = '$$target';
const CELL_SPECIFIER = '$$cell';
const SELF_SPECIFIER = 'self';
const ITEM_SPECIFIER = '$$item';

// Can be updated when addEffect() if called
let handlerNames = Object.keys(handlerTable);

export class SystemEffects extends SystemBase {

    public static handlerTable: {[key: string]: boolean};

    //---------------
    // HANDLERS END
    //---------------

    /** Adds an effect into the effect system.
     * @param {string} effName - Name of the effect.
     * @param {function} func - Function to process the effect.
     * @return {boolean}
     * func receives args (srcEnt, effComp).
     */
    public static addEffect(effName: string, func: HandleFunc): boolean {
        if (!handlerTable.hasOwnProperty(effName)) {
            const handlerName = 'handle' + effName.capitalize();
            (SystemEffects as any).prototype[handlerName] = func;
            (handlerTable as any)[effName] = true;
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
    public static getEffectTarget(useArgs): any {
        const objTarget = useArgs.target;
        if (!objTarget) {
            const msg = 'Possibly missing args for useItem().';
            RG.err('system.effects.js', 'getEffectTarget',
                `Given object was null/undefined. ${msg}`);
        }
        return SystemEffects.getTargetFromObj(objTarget, useArgs.targetType);
    }

    public static getTargetFromObj(objTarget, targetTypes) {
        if (objTarget.hasOwnProperty('target')) {
            const cell = objTarget.target;
            let targetType = targetTypes;
            if (!targetType) {
                targetType = ['actors', 'items', 'elements', 'baseElem'];
            }
            if (!Array.isArray(targetType)) {targetType = [targetType];}
            if (targetType[0] === 'cell') {return cell;}

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

    private _dtable: {[key: string]: HandleFunc};

    constructor(compTypes: string[], pool: EventPool) {
        super(RG.SYS.EFFECTS, compTypes, pool);
        this._dtable = {};
        Object.keys(handlerTable).forEach(effName => {
            if (handlerTable[effName]) {
                const handlerName = 'handle' + effName.capitalize();
                this._dtable[effName] = this[handlerName].bind(this);
            }
        });
    }

    public updateEntity(ent): void {
        const comps = ent.getList('Effects');
        comps.forEach(effComp => {
            const effType = effComp.getEffectType();
            if (effType && effType !== '') {
                if (this._dtable.hasOwnProperty(effType)) {
                    this._checkStartMsgEmits(ent, effComp);
                    const ok = this._dtable[effType](ent, effComp);
                    this._checkEndMsgEmits(ent, effComp, ok);
                    this._postEffectChecks(ent, effComp, ok);
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

    public _checkStartMsgEmits(ent, effComp): void {
        const useArgs = effComp.getArgs();
        if (useArgs.startMsg) {
            RG.gameMsg({cell: ent.getCell(), msg: useArgs.startMsg});
        }
    }

    public _checkEndMsgEmits(ent, effComp, ok: boolean): void {
        const useArgs = effComp.getArgs();
        if (useArgs.endMsg) {
            RG.gameMsg({cell: ent.getCell(), msg: useArgs.endMsg});
        }
        if (ok && useArgs.successMsg) {
            RG.gameMsg({cell: ent.getCell(), msg: useArgs.successMsg});
        }
        if (!ok && useArgs.failureMsg) {
            RG.gameWarn({cell: ent.getCell(), msg: useArgs.failureMsg});
        }
    }

    public _postEffectChecks(ent, effComp, ok: boolean): void {
        const useArgs = effComp.getArgs();
        if (!ok) {return;}
        const item = effComp.getItem();
        if (item) {
            RG.reduceCountOrCharge(item, ent, this.pool);
        }
    }

    //--------------------
    // HANDLER FUNCTIONS
    //--------------------

    /* Handler for effect 'AddComp'. Adds a component to target entity
     * for a given duration. */
    public handleAddComp(srcEnt, effComp): boolean {
        const useArgs: EffArgs = effComp.getArgs();
        let targetEnt = SystemEffects.getEffectTarget(useArgs);
        const compName = getCompName(useArgs, targetEnt);

        let compToAdd = null;
        if (Component.hasOwnProperty(compName)) {
            compToAdd = new Component[compName]();
        }
        else {
            RG.err('System.Effects', 'handleAddComp',
                `Failed to create comp |${compName}|`);
        }

        // If setters are given, alter the values of added component
        if (useArgs.setters) {
            const setters = useArgs.setters;
            Object.keys(setters).forEach(setFunc => {
                if (typeof compToAdd[setFunc] === 'function') {
                    const valueToSet = setters[setFunc];

                    // Use the final target as value for setter '$$target'
                    if (valueToSet === TARGET_SPECIFIER) {
                        compToAdd[setFunc](targetEnt);
                    }
                    else if (valueToSet === ITEM_SPECIFIER) {
                        compToAdd[setFunc](useArgs.effectSource);
                    }
                    else {
                        const numValue = convertValueIfNeeded(valueToSet);
                        compToAdd[setFunc](numValue);
                    }
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

        // How to switch the entity here?
        if (useArgs.addOnUser) {
            targetEnt = srcEnt;
        }

        if (useArgs.duration) {
            const dur = Dice.getValue(useArgs.duration);
            const expirMsg = useArgs.expireMsg;
            Component.addToExpirationComp(targetEnt, compToAdd, dur, expirMsg);
        }
        else {
            targetEnt.add(compToAdd);
        }

        return true;
    }

    /* Called when element needs to be added to a cell. */
    public handleAddElement(srcEnt, effComp): boolean {
        const useArgs = effComp.getArgs();
        const cell = getTargetCellOrFail(useArgs);

        if (!useArgs.elementName) {
            RG.err('System.Effects', 'handleAddElement',
                'No elementName found in useArgs: ' + JSON.stringify(useArgs));
        }

        let newElem = Element.create(useArgs.elementName);
        if (!newElem) {
            // Try the ObjectShellParser, usually not what we want
            // with elements
            const parser = ObjectShell.getParser();
            newElem = parser.createEntity(useArgs.elementName);
        }

        if (newElem) {
            const [x, y] = [cell.getX(), cell.getY()];
            const level = srcEnt.getLevel();
            const existingElems = cell.getPropType(newElem.getType());
            if (useArgs.successCheck) {
                if (!this._successCheck(cell, useArgs.successCheck)) {
                    return false;
                }
            }

            if (!existingElems || existingElems.length < useArgs.numAllowed) {
                if (!level.addElement(newElem, x, y)) {
                    console.error('Failed to add element ' + useArgs.elementName);
                    return false;
                }
                if (typeof newElem.onSystemAdd === 'function') {
                    newElem.onSystemAdd(cell);
                }
                if (useArgs.setters) {
                    this._applySetters(newElem, useArgs.setters);
                }
                return true;
            }
            else {
                console.log('maxNumAllowed hit already for', newElem.getName());
                return false;
            }
        }
        else {
            const msg = 'Failed to create elem: ' + JSON.stringify(useArgs);
            RG.err('System.Effects', 'handleAddElement', msg);
        }
        return false;
    }

    /* Called when element needs to be added to a cell. */
    public handleRemoveElement(srcEnt, effComp): boolean {
        const useArgs = effComp.getArgs();
        const cell = getTargetCellOrFail(useArgs);

        if (!useArgs.elementName) {
            RG.err('System.Effects', 'handleRemoveElement',
                'No elementName found in useArgs: ' + JSON.stringify(useArgs));
        }

        const foundElems = cell.getPropType(useArgs.elementName);
        if (foundElems.length > 0) {
            const foundElem = foundElems[0];
            const [x, y] = [cell.getX(), cell.getY()];
            const level = srcEnt.getLevel();
            if (level.removeElement(foundElem, x, y)) {
                if (typeof foundElem.onSystemRemove === 'function') {
                    foundElem.onSystemRemove(cell);
                }
                return true;
            }
        }
        return false;
    }

    /* Adds a value to an existing component value. */
    public handleModifyCompValue(srcEnt, effComp): boolean {
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
                return true;
            }
        }
        return false;
    }

    /* Adds an entity to target cell. */
    public handleAddEntity(srcEnt, effComp): boolean {
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
                return true;
            }
        }
        return false;
    }

    public handleChangeElement(srcEnt, effComp): boolean {
        const useArgs = effComp.getArgs();
        const cell = getTargetCellOrFail(useArgs);
        const fromType = useArgs.fromType;
        const toType = useArgs.toType || ELEM.FLOOR;
        if (cell.getBaseElem().getType() === fromType) {
            cell.setBaseElem(toType);
            return true;
        }
        return false;
    }

    public handleRemoveComp(srcEnt, effComp): boolean {
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
            return true;
        }
        return false;
    }

    /* Used for any success checks required for applying the effect. */
    protected _successCheck(cell: Cell, checks: ISuccessCheck[]): boolean {
        let successOk = true;
        checks.forEach((check: ISuccessCheck) => {
            RG.PROP_TYPES.forEach((propType: TPropType) => {
                if (!check[propType]) return; // Dont care about prop for this cell
                // Process positive checks. Cell must have the prop, and we must
                // get a positive match
                ['has', 'hasAll'].forEach(func => {
                    if (check[propType][func]) {
                        if (propType !== RG.TYPE_ELEM && !cell.hasProp(propType)) {
                            successOk = false;
                        }
                        else {
                            let props = cell.getProp(propType);
                            if (props) {props = props.slice();} // Avoid modifying the original
                            if (propType === RG.TYPE_ELEM) {
                                if (!props) {props = [];}
                                props.push(cell.getBaseElem() as any);
                            }
                            let resultFound = false;
                            // props cannot be null due to hasProp check
                            props!.forEach(prop => {
                                // Results in prop.has('CompName') or
                                //           prop.hasAll(['Comp1', 'Comp2'])
                                const funcArgs = check[propType][func];
                                if (prop[func](funcArgs)) {
                                    resultFound = true;
                                }
                            });
                            successOk = successOk && resultFound;
                        }
                    }
                });

                ['hasNot', 'hasNone'].forEach(func => {
                    let props = cell.getProp(propType);
                    if (props) {props = props.slice();} // Avoid modifying the original
                    if (propType === RG.TYPE_ELEM) {
                        if (!props) {props = [];}
                        props.push(cell.getBaseElem() as any);
                    }
                    if (props) {
                        props.forEach(prop => {
                            let resultOk = true;
                            if (check[propType][func]) {
                                if (!prop[func](check[propType][func])) {
                                    resultOk = false;
                                }
                            }
                            successOk = successOk && resultOk;
                        });
                    }
                });

            });
        });
        return successOk;
    }

    protected _applySetters(ent: Entity, setterList): void {
        let funcs = [];
        const cell = (ent as any).getCell();

        if (Array.isArray(setterList)) {
            funcs = setterList;
        }
        else {
            funcs = [setterList];
        }
        funcs.forEach(setterObj => {
            let targetObj = ent;
            // If 'get' present, fetch the component first
            if (setterObj.get) {targetObj = ent.get(setterObj.get);}

            // Go through all func names in setterObj, and use func name to set
            // values in the target object
            Object.keys(setterObj).forEach(setter => {
                if (setter !== 'get') {
                    const valToSet = setterObj[setter];
                    (targetObj as any)[setter](valToSet);
                }
            });
        });
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
        if (Dice.isDieSpec(intStrOrDie)) {
            const durDie = Dice.create(intStrOrDie);
            const duration = durDie.roll();
            return duration;
        }
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
        'Prop target must exist in useArgs. Got: |' + json);
    return null;
}
