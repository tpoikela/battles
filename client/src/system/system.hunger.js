
const RG = require('../rg');

const System = {};
System.Base = require('./system.base');

/* Processes entities with hunger component.*/
System.Hunger = function(compTypes) {
    System.Base.call(this, RG.SYS.HUNGER, compTypes);
};
RG.extend2(System.Hunger, System.Base);

System.Hunger.prototype.updateEntity = function(ent) {
    const hungerComp = ent.get('Hunger');
    const actionComp = ent.get('Action');
    hungerComp.decrEnergy(actionComp.getEnergy());
    actionComp.resetEnergy();
    if (hungerComp.isStarving()) {

        if (ent.has('Health') && RG.isSuccess(RG.HUNGER_PROB)) {
            const dmg = new RG.Component.Damage(RG.HUNGER_DMG,
                RG.DMG.HUNGER);
            ent.add(dmg);
            RG.gameWarn(ent.getName() + ' is starving!');
        }
    }
};

module.exports = System.Hunger;
