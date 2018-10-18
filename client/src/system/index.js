
const RG = require('../rg');
RG.Path = require('../path');
RG.Geometry = require('../geometry');

const System = {};
System.Base = require('./system.base');

System.Animation = require('./system.animation');
System.AreaEffects = require('./system.area-effects');
System.Attack = require('./system.attack');
System.BaseAction = require('./system.base-action');
System.Battle = require('./system.battle');
System.Chat = require('./system.chat');
System.Communication = require('./system.communication');
System.Damage = require('./system.damage');
System.Disability = require('./system.disability');
System.Effects = require('./system.effects');
System.Equip = require('./system.equip');
System.Events = require('./system.events');
System.ExpPoints = require('./system.exp-points');
System.Hunger = require('./system.hunger');
System.Missile = require('./system.missile');
System.Movement = require('./system.movement');
System.Quest = require('./system.quest');
System.Shop = require('./system.shop');
System.Skills = require('./system.skills');
System.SpellCast = require('./system.spell-cast');
System.SpellEffect = require('./system.spell-effect');
System.SpiritBind = require('./system.spirit-bind');
System.TimeEffects = require('./system.time-effects');

/* Defines a new system declaration. Can be used in plugins to define new
 * systems easily without boilerplate code. */
System.DefineSystem = function(sysName) {
    const nameCaps = sysName.toUpperCase();
    RG.SYS[nameCaps] = Symbol();

    const SystemDecl = function(compTypes, ...argsList) {
        System.Base.call(this, RG.SYS[nameCaps], compTypes);

        // User can define _init function if complex initialisation required
        if (this._init && typeof this._init === 'function') {
            this._init(compTypes, ...argsList);
        }
    };
    RG.extend2(SystemDecl, System.Base);

    System[sysName] = SystemDecl;
    return SystemDecl;
};

/* Undefines a system declaration. Can be used as cleanup for DefineSystem. */
System.UndefineSystem = function(sysName) {
    const nameCaps = sysName.toUpperCase();
    delete RG.SYS[nameCaps];
    delete System[sysName];
};

module.exports = System;
