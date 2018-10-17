/* Handles system creation and updates. */

const System = require('./index');

const SystemManager = function(engine, pool) {
    this._engine = engine;

    // These systems updated after each actor action. The Order is important,
    // for example:
    // - Disability must block most of other actions taking place
    // - Damage must be processed after all damaging effects (attacks/spells..)
    // - Exp points granted after exp giving actions are processed
    // - Animations should be seen before actors are killed.
    this.systemOrder = [
        'AreaEffects', 'Disability', 'SpiritBind', 'BaseAction',
        'Equip', 'Attack', 'Chat', 'Shop', 'SpellCast', 'SpellEffect',
        'Missile', 'Movement', 'Effects', 'Animation', 'Damage', 'Battle',
        'Skills', 'Quest', 'ExpPoints', 'Communication', 'Events'
    ];

    const allSys = {};
    allSys.Disability = new System.Disability(
        ['Stun', 'Paralysis'], pool);
    allSys.SpiritBind = new System.SpiritBind(['SpiritBind'], pool);
    allSys.BaseAction = new System.BaseAction(['Pickup', 'UseStairs',
        'OpenDoor', 'UseItem', 'UseElement', 'Jump', 'Read', 'Give'], pool);
    allSys.Chat = new System.Chat(['Chat'], pool);
    allSys.Shop = new System.Shop(['Transaction'], pool);
    allSys.Attack = new System.Attack(['Attack'], pool);
    allSys.Missile = new System.Missile(['Missile'], pool);
    allSys.Movement = new System.Movement(['Movement'], pool);
    allSys.SpellCast = new System.SpellCast(['SpellCast',
        'PowerDrain'], pool);
    allSys.SpellEffect = new System.SpellEffect(
        ['SpellRay', 'SpellCell', 'SpellMissile', 'SpellArea', 'SpellSelf'],
        pool);
    allSys.Effects = new System.Effects(['Effects'], pool);
    allSys.Animation = new System.Animation(
        ['Animation'], pool);
    allSys.Damage = new System.Damage(['Damage', 'Health'], pool);
    allSys.Battle = new System.Battle(['BattleOver', 'BattleOrder'], pool);
    allSys.Skills = new System.Skills(['SkillsExp'], pool);
    allSys.ExpPoints = new System.ExpPoints(
        ['ExpPoints', 'Experience'], pool);
    allSys.Communication = new System.Communication(
        ['Communication'], pool);
    allSys.Events = new System.Events(['Event'], pool);
    allSys.AreaEffects = new System.AreaEffects(['Flame'], pool);
    allSys.Equip = new System.Equip(['Equip'], pool);
    allSys.Quest = new System.Quest(['GiveQuest', 'QuestCompleted',
        'QuestTargetEvent'], pool);
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


module.exports = SystemManager;
