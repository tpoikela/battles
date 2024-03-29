/* Handles system creation and updates. */

import RG from '../rg';
import {System, SystemBase} from './index';
import {Random} from '../random';

type EventPool = import('../eventpool').EventPool;

interface SystemCreate {
    create: (comps: string[], pool: any) => SystemBase;
    comps: string[];
}

type SystemSpec = string[] | SystemCreate;

export class SystemManager {

    public static systemOrder: string[];
    public static systems: {[key: string]: SystemSpec};

    public static addSystemBefore(system, before) {
        const index = SystemManager.systemOrder.indexOf(before);
        if (index >= 0) {
            SystemManager.insertSystemAt(index, system);
        }
    }

    public static addSystemAfter(system, after) {
        const index = SystemManager.systemOrder.indexOf(after);
        if (index >= 0) {
            SystemManager.insertSystemAt(index + 1, system);
        }
    }

    public static removeSystem(system) {
        delete SystemManager.systems[system];
        const index = SystemManager.systemOrder.indexOf(system);
        if (index >= 0) {
            SystemManager.systemOrder.splice(index, 1);
        }
    }

    public static insertSystemAt(index, system) {
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
    public loopSystemOrder: string[];

    private _engine: any; // TODO fix typings
    private systemOrder: string[];
    private systems: {[key: string]: SystemBase};
    private loopSystems: {[key: string]: SystemBase};
    private timeSystems: {[key: string]: SystemBase};

    constructor(engine, pool: EventPool) {
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
        this.loopSystems.Hunger = new System.Hunger(['Action', 'Hunger'], pool);

        // Time-based systems are added to the scheduler directly
        this.timeSystems = {};

        const effects = new System.TimeEffects(
            ['Expiration', 'Poison', 'Fading', 'Heat', 'Coldness', 'DirectDamage',
                'RegenEffect', 'Drowning'], pool
        );

        this.timeSystems.TimeEffects = effects;
        this._engine.addTimeSystem('TimeEffects', effects);
    }

    /* Adds an entity ID to be traced within the systems. */
    public addDebugTraceID(id: number): void {
        Object.values(this.systems).forEach(system => {
            system.addDebugTraceID(id);
        });
    }

    public get(type: string): SystemBase | null {
        if (this.systems.hasOwnProperty(type)) {
            return this.systems[type];

        }
        return null;
    }

    public updateSystems(): void {
        for (let i = 0; i < this.systemOrder.length; i++) {
            const sysName = this.systemOrder[i];
            this.systems[sysName].update();
        }
    }

    public updateLoopSystems(): void {
        for (let i = 0; i < this.loopSystemOrder.length; i++) {
            const sysName = this.loopSystemOrder[i];
            this.loopSystems[sysName].update();
        }
    }

    /* Sets the RNG for all systems. */
    public setRNG(rng: Random): void {
        Object.values(this.systems).forEach(system => {
            system.setRNG(rng);
        });
    }

    public setSystemArgs(args: {[key: string]: any}): void {
        Object.values(this.systems).forEach(sys => {
            sys.setArgs(args);
        });
    }
}

// This defines the evaluation order of Systems.
SystemManager.systemOrder = [
    'AreaEffects', 'Disability', 'SpiritBind', 'BaseAction',
    'Equip', 'Attack', 'AttackRanged', 'Chat', 'Shop',
    'SpellCast', 'SpellEffect',
    'Missile', 'Movement', 'Effects', 'Animation', 'DrainStats',
    'Mining', 'Building',
    'Damage', 'Death',
    'Farming', 'Crafting',
    'Battle',
    'Skills', 'Quest', 'ExpPoints', 'Communication', 'Events',
    'ZoneEvents', 'Weather', 'WorldSim',
    'OnCbs'
];


/* Defines which systems are created by the SystemManager. There are two ways
 * to add an entry:
 * 1) System object name in System, ie SystemDamage + list of components
 * 2) System name: {create: <factory func>, comps: ['Comp1', 'Comp2']}
 *    in which factory func must return the desired System object.
 */
SystemManager.systems = {
    AreaEffects: ['Flame'],
    Disability: ['Stun', 'Entrapped', 'Paralysis'],
    SpiritBind: ['SpiritBind'],
    BaseAction: ['Pickup', 'UseStairs', 'OpenDoor', 'UseItem', 'UseElement',
        'Jump', 'Read', 'Rest', 'Give', 'Displace'],
    Equip: ['Equip'],
    Attack: ['Attack'],
    AttackRanged: ['AttackRanged'],
    Chat: ['Chat'],
    Shop: ['Transaction'],
    SpellCast: ['SpellCast', 'PowerDrain'],
    SpellEffect: ['SpellRay', 'SpellCell', 'SpellMissile', 'SpellArea',
        'SpellSelf', 'SpellWave'],
    Missile: ['Missile'],
    Movement: ['Movement'],
    OnCbs: ['OnAddCb', 'OnRemoveCb'], // Is this correct place?
    Effects: ['Effects'],
    Animation: ['Animation'],
    DrainStats: ['DrainStat'],
    Damage: ['Damage', 'Health'],
    Death: ['DeathEvent'],
    Mining: ['Mining', 'Explosion'],
    Building: ['BuildEvent'],
    Farming: ['Farming', 'WorldSimEvent'],
    Crafting: ['Crafting'],
    Battle: ['BattleOver', 'BattleOrder', 'BattleEvent'],
    Skills: ['SkillsExp'],
    Quest: ['GiveQuest', 'QuestCompleted', 'QuestTargetEvent'],
    Events: ['Event'],
    ExpPoints: ['ExpPoints', 'Experience'],
    Communication: ['Communication'],
    ZoneEvents: ['ZoneEvent'],
    Weather: ['WeatherEffect'],
    WorldSim: ['WorldSimEvent'],
};
