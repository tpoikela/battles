
const RG = require('./rg');

/* This class creates constraint functions from config objects. A single
 * constrains is defined by the following object:
 * {op: OPERATION,
 *  prop: PROPERTY TO COMPARE
 *  value: VALUE TO COMPARE AGAINTS USING op
 * }
 * For example: {op: 'eq', prop: 'name', value: 'Giant rat'} checks that
 * entity's name is equal to 'Giant rat'.
 */
export default class Constraints {

    getConstraints(objOrArray) {
        if (Array.isArray(objOrArray)) {
            const funcs = objOrArray.map(constr => (
                this.getFunc(constr.op, constr.prop, constr.value)
            ));
            return function(obj) {
                let res = true;
                funcs.forEach(f => {res = res && f(obj);});
                return res;
            };
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
            return function(obj) {
                let res = false;
                funcs.forEach(f => {res = res || f(obj);});
                return res;
            };
        }
        else {
            switch (op) {
                case '==': // fall
                case '===': // fall
                case 'eq': return obj => obj[prop] === value;
                case '!=':
                case '!==':
                case 'neq': return obj => obj[prop] !== value;
                case '>=':
                case 'gte': return obj => obj[prop] >= value;
                case '<=':
                case 'lte': return obj => obj[prop] <= value;
                case '>':
                case 'gt': return obj => obj[prop] > value;
                case '<':
                case 'lt': return obj => obj[prop] < value;
                case 'match': return obj => new RegExp(value).test(obj[prop]);
                default: RG.err('Constraints', 'getFunc',
                    `Unsupported op ${op} given`);
            }
        }
        return null;
    }

}
