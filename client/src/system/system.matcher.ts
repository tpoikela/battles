/* Contains matcher code for checking that entity contains the
 * required components. */

import RG from '../rg';

const evalExpr = (ent, obj) => {
    if (obj.not) {
        return not(ent, obj.not);
    }
    else if (obj.and) {
        return and(ent, obj.and);
    }
    else if (obj.or) {
        return or(ent, obj.or);
    }
    else {
        RG.err('', 'evalExpr',
            'Unsupported expr. Should be not, or, and');
    }
    return false;
};

const not = (ent, val) => {
    if (typeof val === 'string') {
        return !ent.has(val);
    }
    return !evalExpr(ent, val);
};

const and = (ent, list) => {
    for (let i = 0; i < list.length; i++) {
        const val = list[i];
        if (typeof val === 'string') {
            if (!ent.has(val)) {
                return false;
            }
        }
        else if (!evalExpr(ent, val)) {
            return false;
        }
    }
    return true;
};

const or = (ent, list) => {
    for (let i = 0; i < list.length; i++) {
        const val = list[i];
        if (typeof val === 'string') {
            if (ent.has(val)) {
                return true;
            }
        }
        else if (evalExpr(ent, val)) {
            return true;
        }
    }
    return false;
};

export const Matcher = function(matchExpr) {
    this.matchExpr = matchExpr;
};

Matcher.prototype.match = function(entity) {
    return evalExpr(entity, this.matchExpr);
};
