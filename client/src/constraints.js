
const RG = require('./rg');

/* This class creates constraint functions from config objects. A single
 * constrains is defined by the following object:
 * {op: OPERATION,
 *  prop: PROPERTY TO COMPARE
 *  value: VALUE TO COMPARE AGAINTS USING op
 * }
 * For example: {op: 'eq', prop: 'name', value: 'Giant rat'} checks that
 * name is equal to 'Giant rat'.
 */
export default class Constraints {

    getConstraints(objOrArray) {
        if (Array.isArray(objOrArray)) {
            const funcs = objOrArray.map(constr => (
                this.getFunc(constr.op, constr.prop, constr.value)
            ));
            const aggrFunc = function(obj) {
                let res = true;
                funcs.forEach(f => {res = res && f(obj);});
                return res;
            };
            aggrFunc.constraint = objOrArray;
            return aggrFunc;
        }
        else if (typeof objOrArray === 'object') {
            const {op, prop, value} = objOrArray;
            return this.getFunc(op, prop, value);
        }
        else {
            const msg = `Param must be array/object. Got: ${objOrArray}`;
            RG.err('Constrains', 'getConstraints', msg);
        }
        return null;
    }

    getFunc(op, prop, value) {
        if (Array.isArray(value)) {
            const funcs = value.map(val => (
                this.getFunc(op, prop, val)
            ));
            const aggrFunc = function(obj) {
                let res = false;
                funcs.forEach(f => {res = res || f(obj);});
                return res;
            };
            aggrFunc.constraint = {op, prop, value};
            return aggrFunc;
        }
        else {
            let func = () => false;
            switch (op) {
                case '==': // fall
                case '===': // fall
                case 'eq': func = obj => obj[prop] === value; break;
                case '!=':
                case '!==':
                case 'neq': func = obj => obj[prop] !== value; break;
                case '>=':
                case 'gte': func = obj => obj[prop] >= value; break;
                case '<=':
                case 'lte': func = obj => obj[prop] <= value; break;
                case '>':
                case 'gt': func = obj => obj[prop] > value; break;
                case '<':
                case 'lt': func = obj => obj[prop] < value; break;
                case 'match':
                    func = obj => new RegExp(value).test(obj[prop]); break;
                default: RG.err('Constraints', 'getFunc',
                    `Unsupported op ${op} given`);
            }
            func.constraint = {op, prop, value};
            return func;
        }
    }

}
