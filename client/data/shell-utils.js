/* Contains some functions to shorten the definitions in actor/item
 * shells. */

const RG = require('../src/rg');

const ShellUtils = {};

ShellUtils.meleeHitDamage = (dmg, dur, dmgType) => {
    return {
        addComp: 'DirectDamage', func: [
            {setter: 'setDamage', value: dmg},
            {setter: 'setDamageType', value: RG.DMG[dmgType]},
            {setter: 'setDamageCateg', value: RG.DMG.MELEE}
        ],
        duration: dur
    };
};

module.exports = ShellUtils;
