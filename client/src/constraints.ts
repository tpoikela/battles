
import RG from './rg';
import {IConstraint, TConstraintArg} from './interfaces';

/* This class creates constraint functions from config objects. A single
 * constrains is defined by following objects:
 * 1. Simple property query:
 * {op: OPERATION,
 *  prop: PROPERTY TO COMPARE
 *  value: VALUE TO COMPARE AGAINTS USING op
 * }
 * For example: {op: 'eq', prop: 'name', value: 'Giant rat'} checks that
 * name is equal to 'Giant rat'.
 *
 * 2. Query via function:
 * {op: OPERATION, value: VALUE, func: 'getter', args:?}
 * calls getter on given object ie obj[getter](...args).
 *
 * 3. Component query:
 * {op: OPERATION, value: VALUE, has: 'CompName'} or
 * {op: OPERATION, value: VALUE, comp: ['Stats', 'getStrength']}
 *
 */
export class Constraints {

    public static toJSON(func: (obj: any) => boolean): any {
        const obj = (func as any).constraint;
        const json: any = {
            op: obj.op,
            value: obj.value
        };
        if (obj.comp) {
            json.comp = obj.comp;
        }
        if (obj.func) {
            json.func = obj.func;
        }
        if (obj.prop) {
            json.prop = obj.prop;
        }
        if (obj.args) {
            json.args = obj.args;
        }
        return json;
    }

    /* Returns the constraints function given a constraint object. */
    public getConstraints(objOrArray: TConstraintArg): (obj) => boolean {
        if (Array.isArray(objOrArray)) {
            const funcs = objOrArray.map((constr: IConstraint) => {
                const {op, prop, func, value, args, comp} = constr;
                if (prop) {
                    return this.getFunc(op, prop, value);
                }
                else if (func) {
                    return this.getFuncWithGetter(op, func, value, args);
                }
                else if (comp) {
                    return this.getFuncWithComp(op, comp, value, args);
                }
            });
            const aggrFunc: any = function(obj) {
                let res = true;
                funcs.forEach(f => {res = res && f(obj);});
                return res;
            };
            aggrFunc.constraint = objOrArray;
            return aggrFunc;
        }
        else if (typeof objOrArray === 'object') {
            const {op, prop, func, value, args, comp} = objOrArray;
            if (prop) {
                return this.getFunc(op, prop, value);
            }
            else if (func) {
                return this.getFuncWithGetter(op, func, value, args);
            }
            else if (comp) {
                return this.getFuncWithComp(op, comp, value, args);
            }
        }
        else {
            const msg = `Param must be array/object. Got: ${objOrArray}`;
            RG.err('Constrains', 'getConstraints', msg);
        }
        return null;
    }

    public getFunc(op: string, prop: string, value: any): (obj) => boolean {
        if (Array.isArray(value)) {
            const funcs = value.map(val => (
                this.getFunc(op, prop, val)
            ));
            const aggrFunc: any = function(obj) {
                let res = false;
                funcs.forEach(f => {res = res || f(obj);});
                return res;
            };
            aggrFunc.constraint = {op, prop, value};
            return aggrFunc;
        }
        else {
            let func: any = () => false;
            switch (op) {
                case '==': // fall
                case '===': // fall
                case 'eq': func = (obj: any) => obj[prop] === value; break;
                case '!=':
                case '!==':
                case 'neq': func = (obj: any) => obj[prop] !== value; break;
                case '>=':
                case 'gte': func = (obj: any) => obj[prop] >= value; break;
                case '<=':
                case 'lte': func = (obj: any) => obj[prop] <= value; break;
                case '>':
                case 'gt': func = (obj: any) => obj[prop] > value; break;
                case '<':
                case 'lt': func = (obj: any) => obj[prop] < value; break;
                case 'match':
                    func = (obj: any) => new RegExp(value).test(obj[prop]); break;
                default: RG.err('Constraints', 'getFunc',
                    `Unsupported op ${op} given`);
            }
            func.constraint = {op, prop, value};
            return func;
        }
    }

    public getFuncWithGetter(
        op: string, func: string, value: any, args: any[] = []
    ): (obj: any) => boolean {
        if (Array.isArray(value)) {
            const funcs = value.map(val => (
                this.getFuncWithGetter(op, func, val, args)
            ));
            const aggrFunc: any = function(obj: any) {
                let res = false;
                funcs.forEach(f => {res = res || f(obj);});
                return res;
            };
            aggrFunc.constraint = {op, func, value, args};
            return aggrFunc;
        }
        else {
            let retFunc: any = () => false;
            switch (op) {
                case '==': // fall
                case '===': // fall
                case 'eq': retFunc = (obj: any) => obj[func](...args) === value; break;
                case '!=':
                case '!==':
                case 'neq': retFunc = (obj: any) => obj[func](...args) !== value; break;
                case '>=':
                case 'gte': retFunc = (obj: any) => obj[func](...args) >= value; break;
                case '<=':
                case 'lte': retFunc = (obj: any) => obj[func](...args) <= value; break;
                case '>':
                case 'gt': retFunc = (obj: any) => obj[func](...args) > value; break;
                case '<':
                case 'lt': retFunc = (obj: any) => obj[func](...args) < value; break;
                case 'match':
                    retFunc = (obj: any) => new RegExp(value).test(obj[func](...args)); break;
                default: RG.err('Constraints', 'getFunc',
                    `Unsupported op ${op} given`);
            }
            retFunc.constraint = {op, func, value, args};
            return retFunc;
        }

    }

    public getFuncWithComp(
        op: string, comp: string[], value: any, args: any[] = []
    ): (obj: any) => boolean {
        if (Array.isArray(value)) {
            const funcs = value.map(val => (
                this.getFuncWithComp(op, comp, val, args)
            ));
            const aggrFunc: any = function(obj: any) {
                let res = false;
                funcs.forEach(f => {res = res || f(obj);});
                return res;
            };
            aggrFunc.constraint = {op, comp, value, args};
            return aggrFunc;
        }
        else {
            if (!Array.isArray(comp) && comp.length >= 2) {
                const str = JSON.stringify(comp);
                RG.err('Constraints', 'getFuncWithComp',
                    'comp must be an array [CompName, getterName]. Got: ' + str);
            }
            const [compName, getFunc] = comp;
            let retFunc: any = () => false;
            switch (op) {
                case '==': // fall
                case '===': // fall
                case 'eq': retFunc = (obj: any) => obj.get(compName)[getFunc](...args) === value; break;
                case '!=':
                case '!==':
                case 'neq': retFunc = (obj: any) => obj.get(compName)[getFunc](...args) !== value; break;
                case '>=':
                case 'gte': retFunc = (obj: any) => obj.get(compName)[getFunc](...args) >= value; break;
                case '<=':
                case 'lte': retFunc = (obj: any) => obj.get(compName)[getFunc](...args) <= value; break;
                case '>':
                case 'gt': retFunc = (obj: any) => obj.get(compName)[getFunc](...args) > value; break;
                case '<':
                case 'lt': retFunc = (obj: any) => obj.get(compName)[getFunc](...args) < value; break;
                case 'm/': // fall
                case 'match':
                    retFunc = (obj: any) => new RegExp(value).test(obj.get(compName)[getFunc](...args)); break;
                default: RG.err('Constraints', 'getFunc',
                    `Unsupported op ${op} given`);
            }
            retFunc.constraint = {op, comp, value, args};
            return retFunc;
        }
    }


}
