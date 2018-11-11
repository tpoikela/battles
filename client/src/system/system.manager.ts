/* Handles system creation and updates. */

import RG from '../rg';
import * as System from './index';

interface SystemCreate {
    create: (comps: string[], pool: any) => System.SystemBase;
    comps: string[];
}

type SystemSpec = string[] | SystemCreate;

export class SystemManager {

    public static systemOrder: string[];
    public static systems: {[key: string]: SystemSpec};

    private _engine: any; // TODO fix typings
    private systemOrder: string[];
    private systems: {[key: string]: System.SystemBase};
    public loopSystemOrder: string[];
    private loopSystems: {[key: string]: System.SystemBase};
    private timeSystems: {[key: string]: System.SystemBase};

    constructor(engine, pool) {
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
            if ((comps as SystemCreate).create) {
                const createConf = comps as SystemCreate;
                allSys[name] = createConf.create(createConf.comps, pool);
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
        this.loopSystems.Hunger = new System.SystemHunger(['Action', 'Hunger'], pool);

        // Time-based systems are added to the scheduler directly
        this.timeSystems = {};

        const effects = new System.SystemTimeEffects(
            ['Expiration', 'Poison', 'Fading', 'Heat', 'Coldness', 'DirectDamage',
                'RegenEffect'], pool
        );

        this.timeSystems['TimeEffects'] = effects;
        this._engine.addTimeSystem('TimeEffects', effects);
    }

    updateSystems() {
        for (let i = 0; i < this.systemOrder.length; i++) {
            const sysName = this.systemOrder[i];
            this.systems[sysName].update();
        }
    }

    updateLoopSystems() {
        for (let i = 0; i < this.loopSystemOrder.length; i++) {
            const sysName = this.loopSystemOrder[i];
            this.loopSystems[sysName].update();
        }
    }

    static addSystemBefore(system, before) {
        const index = SystemManager.systemOrder.indexOf(before);
        if (index >= 0) {
            SystemManager.insertSystemAt(index, system);
        }
    }

    static addSystemAfter(system, after) {
        const index = SystemManager.systemOrder.indexOf(after);
        if (index >= 0) {
            SystemManager.insertSystemAt(index + 1, system);
        }
    }

    static removeSystem(system) {
        delete SystemManager.systems[system];
        const index = SystemManager.systemOrder.indexOf(system);
        if (index >= 0) {
            SystemManager.systemOrder.splice(index, 1);
        }
    }

    static insertSystemAt(index, system) {
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
    }
}

SystemManager.systemOrder = [
    'AreaEffects', 'Disability', 'SpiritBind', 'BaseAction',
    'Equip', 'Attack', 'Chat', 'Shop', 'SpellCast', 'SpellEffect',
    'Missile', 'Movement', 'Effects', 'Animation', 'Damage', 'Battle',
    'Skills', 'Quest', 'ExpPoints', 'Communication', 'Events'
];


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
