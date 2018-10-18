/* This is an example how to add a System plugin into the game. To load the
 * plugin, open game in browser, then select Game->Load script from top menu.*/

const DoubleSystem = RG.System.DefineSystem('Double');

DoubleSystem.prototype.updateEntity = function(ent) {
    if (ent.has('Damage')) {
        const dmgComp = ent.get('Damage');
        const dmg = dmgComp.getDamage();
        dmgComp.setDamage(1000 * dmg);
        RG.gameMsg({cell: ent.getCell(), msg: 'BASH!!!'});
    }
};

function createSystem(comps) {
    return new DoubleSystem(comps);
}

pluginData = {
    type: 'system',
    name: 'System.Double',
    description: 'A plugin to increase damage of attacks',

    // Called after plugin has been evalled()
    onLoad: () => {
        const system = {
            name: 'Double',
            create: createSystem,
            comps: ['Damage']
        };
        RG.System.Manager.addSystemBefore(system, 'Damage');
    },

    // Called when plugin is deleted/disabled
    onRemove: () => {
        RG.System.Manager.removeSystem('Double');
        RG.System.UndefineSystem('Double');
    }
};
