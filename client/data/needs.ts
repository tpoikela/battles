
import RG from '../src/rg';
import {INeedEntry, EvaluatorTuple} from '../src/interfaces';
type Inventory = import('../src/inv').Inventory;
type SentientActor = import('../src/actor').SentientActor;

export const NEED_BIAS: {[key: string]: number} = {
    Equip: 1.0,
    Flee: 1.5,
    FindAmmo: 1.0,
    FindMissile: 1.0,
    FindFood: 1.0,
    FindWeapon: 1.0,
    Rest: 1.0
};

/* All needs can be added here. This is data-driven
 * approach to defining the needs without any
 * functions. */
export const Needs: {[key: string]: INeedEntry} = {};

const needHealth: INeedEntry = {
    constr: {
        op: '<', value: 0.2, comp: ['Health', 'propLeft']
    },
    evalName: 'Flee', bias: NEED_BIAS.Flee
};
Needs.Health = needHealth;
const needRest: INeedEntry = {
    constr: {
        op: '<', value: 0.5, comp: ['Health', 'propLeft']
    },
    evalName: 'Rest', bias: NEED_BIAS.Rest
};
Needs.Rest = needRest;

const needHunger: INeedEntry = {
    constr: {
        op: 'eq', value: true, comp: ['Hunger', 'isStarving']
    },
    evalName: 'FindFood', bias: NEED_BIAS.FindFood
};
Needs.Hunger = needHunger;

const needSpellPower: INeedEntry = {
    constr: {
        op: '<', value: 0.4, comp: ['SpellPower', 'propLeft']
    },
    evalName: 'Rest', bias: 0.75 * NEED_BIAS.Rest
};
Needs.SpellPower = needSpellPower;

const needWeapon: INeedEntry = {
    script: weaponNeeds,
    evalName: 'FindWeapon', bias: NEED_BIAS.FindWeapon

};
Needs.FindWeapon = needWeapon;


//------------------------------------------
// More complex scripts for needs are here
//------------------------------------------

function weaponNeeds(actor: SentientActor): EvaluatorTuple[] {
    const inv: Inventory = actor.getInvEq();
    const evals: EvaluatorTuple[] = [];
    const goal = (actor.getBrain() as any).getGoal();

    const weapon = inv.getWeapon();
    if (!weapon) {
        // this.dbg('No weapon found. Checking inventory');
        const items = inv.getInventory().getItems();
        const wpn = items.find(i => i.getType() === RG.ITEM.WEAPON);
        // Try to equip something
        // TODO check inventory for weapons and equip
        if (!wpn) {
            // this.dbg('No weapons in inv. Trying to find one');
            evals.push(['FindWeapon', NEED_BIAS.FindWeapon, {isOneShot: true}]);
        }
        else {
            // this.dbg('Found Weapon in inv. Trying to equip one');
            goal.removeEvaluatorsByType('FindWeapon');
            evals.push(['Equip', NEED_BIAS.Equip, {isOneShot: true}]);
        }
    }
    else {
        // Find better weapon..
    }
    return evals;
}


function ammoNeeds(actor: SentientActor): EvaluatorTuple[] {
    const inv: Inventory = actor.getInvEq();
    const missWeapon = inv.getMissileWeapon();
    const miss = inv.getMissile();
    const evals: EvaluatorTuple[] = [];
    if (missWeapon) {
        const ammoType = missWeapon.getType();
        evals.push(['FindAmmo' , NEED_BIAS.FindAmmo, {ammoType, isOneShot: true}]);
    }
    else if (!miss) {
        const items = inv.getInventory().getItems();
        const missile = items.find(i => i.getType() === RG.ITEM.MISSILE);
        if (!missile) {
            evals.push(['FindMissile' , NEED_BIAS.FindMissile, {isOneShot: true}]);
        }
        else {
            evals.push(['Equip', NEED_BIAS.Equip, {isOneShot: true}]);
        }
    }
    else {
        evals.push(['FindMissile' , NEED_BIAS.FindMissile]);
    }
    return evals;
}
