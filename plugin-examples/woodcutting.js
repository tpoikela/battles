/* This is an example of a woodcutting plugin */
/* You can load this plugin via Plugin->Load script. */
/* eslint-disable */

/* 1. Define a component to attach to pile of wood. */
const MaggotComp = RG.Component.defineComponent('Maggots', {
    numMaggots: 0
});

/* _init is called for each component at the end of its construction */
MaggotComp.prototype._init = function() {
    const RNG = RG.Random.getRNG();
    this.numMaggots = RNG.getUniformInt(0, 5);
};

/* 2. Define a pile of wood item (this is an item shell). */
const pileOfWood = {
    name: 'Pile of wood', weight: 1.0, value: 0,
    type: 'tool',
    addComp: 'Maggots' // Instruct createItem to add this component
};

/* 3. Define a system to handle woodcutting. */
const WoodcutSystem = RG.System.defineSystem('Woodcut');

WoodcutSystem.prototype.updateEntity = function(ent) {
    if (ent.has('UseItem')) {
        const useComp = ent.get('UseItem');
        const item = useComp.getItem();
        const target = useComp.getTarget();

        if (item.getType() === 'weapon') {
            if (/(axe|dagger)/.test(item.getName())) {
                const baseElem = target.getBaseElem();
                if (baseElem.getType() === 'tree') {
                    target.setBaseElem(RG.ELEM.FLOOR);
                    const [x, y] = target.getXY();
                    const wood = RG.createItem(pileOfWood);
                    wood.setCount(5);
                    const level = ent.getLevel();
                    if (level.addItem(wood, x, y)) {
                        ent.remove('UseItem');
                        const msg = `${ent.getName()} cuts down a tree`;
                        RG.gameMsg({cell: ent.getCell(), msg});
                    }
                    else {
                        RG.err('WoodcutSystem', 'updateEntity',
                            `Failed to add wood to ${x},${y}`);
                    }
                }
            }
        }

    }
};

function createSystem(comps) {
    return new WoodcutSystem(comps);
}

/* pluginData must always be defined. */
pluginData = {
    type: 'plugin',
    name: 'Woodcutting plugin',
    onLoad: () => {
        const system = {
            name: 'Woodcut',
            create: createSystem,
            comps: ['UseItem']
        };
        RG.System.Manager.addSystemBefore(system, 'BaseAction');
    },
    onRemove: () => {
        RG.System.Manager.removeSystem('Woodcut');
        RG.System.undefineSystem('Woodcut');
        RG.Component.undefineComponent('Maggots');
    }
};
