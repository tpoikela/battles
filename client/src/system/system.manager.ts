/* Handles system creation and updates. */

const RG = require('../rg');
const System = require('./index');

const SystemManager = function(engine, pool) {
    this._engine = engine;

    // These systems updated after each actor action. The Order is important,
    // for example:
    // - Disability must block most of other actions taking place
    // - Damage must be processed after all damaging effects (attacks/spells..)
    // - Exp points granted after exp giving actions are processed
    // - Animations should be seen before actors are killed.
    this.systemOrder = SystemManager.systemOrder;

    const allSys = {};
    Object.keys(SystemManager.systems).forEach(name => {
        const comps = SystemManager.systems[name];
        if (comps.create) {
            allSys[name] = comps.create(comps.comps, pool);
        }
        else if (Array.isArray(comps)) {
            if (System[name]) {
                allSys[name] = new System[name](comps, pool);
            }
            else {
                RG.err('SystemManager', 'new',
                    `System[${name}] not found for new`);
            }
        }
    });
    this.systems = allSys;

    // Systems updated once each game loop (once for each player action)
    this.loopSystemOrder = ['Hunger'];
    this.loopSystems = {};
    this.loopSystems.Hunger = new System.Hunger(['Action', 'Hunger'], pool);

    // Time-based systems are added to the scheduler directly
    this.timeSystems = {};

    const effects = new System.TimeEffects(
        ['Expiration', 'Poison', 'Fading', 'Heat', 'Coldness', 'DirectDamage',
            'RegenEffect'], pool
    );

    this.timeSystems['TimeEffects'] = effects;
    this._engine.addTimeSystem('TimeEffects', effects);
};

SystemManager.prototype.updateSystems = function() {
    for (let i = 0; i < this.systemOrder.length; i++) {
        const sysName = this.systemOrder[i];
        this.systems[sysName].update();
    }
};

SystemManager.prototype.updateLoopSystems = function() {
    for (let i = 0; i < this.loopSystemOrder.length; i++) {
        const sysName = this.loopSystemOrder[i];
        this.loopSystems[sysName].update();
    }
};

SystemManager.systemOrder = [
    'AreaEffects', 'Disability', 'SpiritBind', 'BaseAction',
    'Equip', 'Attack', 'Chat', 'Shop', 'SpellCast', 'SpellEffect',
    'Missile', 'Movement', 'Effects', 'Animation', 'Damage', 'Battle',
    'Skills', 'Quest', 'ExpPoints', 'Communication', 'Events'
];

SystemManager.addSystemBefore = function(system, before) {
    const index = SystemManager.systemOrder.indexOf(before);
    if (index >= 0) {
        SystemManager.insertSystemAt(index, system);
    }
};

SystemManager.addSystemAfter = function(system, after) {
    const index = SystemManager.systemOrder.indexOf(after);
    if (index >= 0) {
        SystemManager.insertSystemAt(index + 1, system);
    }
};

SystemManager.removeSystem = function(system) {
    delete SystemManager.systems[system];
    const index = SystemManager.systemOrder.indexOf(system);
    if (index >= 0) {
        SystemManager.systemOrder.splice(index, 1);
    }
};

SystemManager.insertSystemAt = function(index, system) {
    SystemManager.systemOrder.splice(index, 0, system.name);
    if (typeof system.create === 'function') {
        if (system.name) {
            SystemManager.systems[system.name] = system;
        }
        else {
            RG.err('SystemManager', 'insertSystemAt',
                'No system.name given');
        }
    }
    else {
        RG.err('SystemManager', 'insertSystemAt',
            'Object must specify system.create');
    }
};


/* Defines which systems are created by the SystemManager. There are two ways
 * to add an entry:
 * 1) System object name in System, ie SystemDamage + list of components
 * 2) System name: {create: <factory func>, comps: ['Comp1'], ['Comp2']}
 *    in which factory func must return a System object.
 */
SystemManager.systems = {
    Disability: ['Stun', 'Paralysis'],
    SpiritBind: ['SpiritBind'],
    BaseAction: ['Pickup', 'UseStairs', 'OpenDoor', 'UseItem', 'UseElement',
        'Jump', 'Read', 'Give'],
    Chat: ['Chat'],
    Shop: ['Transaction'],
    Attack: ['Attack'],
    Missile: ['Missile'],
    Movement: ['Movement'],
    Damage: ['Damage', 'Health'],
    Battle: ['BattleOver', 'BattleOrder'],
    Skills: ['SkillsExp'],
    Events: ['Event'],
    AreaEffects: ['Flame'],
    Equip: ['Equip'],
    SpellCast: ['SpellCast', 'PowerDrain'],
    SpellEffect: ['SpellRay', 'SpellCell', 'SpellMissile', 'SpellArea',
        'SpellSelf'],
    Effects: ['Effects'],
    Animation: ['Animation'],
    ExpPoints: ['ExpPoints', 'Experience'],
    Communication: ['Communication'],
    Quest: ['GiveQuest', 'QuestCompleted', 'QuestTargetEvent']
};

module.exports = SystemManager;
