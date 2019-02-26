/* Contains some functions to shorten the definitions in actor/item
 * shells. */

import RG from '../src/rg';

export const meleeHitDamage = (dmg, dur, dmgType) => {
    return {
        addComp: 'DirectDamage', func: [
            {setter: 'setDamage', value: dmg},
            {setter: 'setDamageType', value: RG.DMG[dmgType]},
            {setter: 'setDamageCateg', value: RG.DMG.MELEE}
        ],
        duration: dur
    };
};

export const color = function(fg, bg) {
    return {fg, bg};
};