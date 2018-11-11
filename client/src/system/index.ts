
import RG from '../rg';
import {Path} from '../path';
import {Geometry} from '../geometry';

export const System: any = {};

import {SystemBase} from './system.base';
export {SystemBase} from './system.base';
System.Base = SystemBase;

System.Animation = require('./system.animation');
System.AreaEffects = require('./system.area-effects');
System.Attack = require('./system.attack');
System.BaseAction = require('./system.base-action');
System.Battle = require('./system.battle');
System.Chat = require('./system.chat');
import {SystemCommunication} from './system.communication';
System.Communication = System.Communication;
System.Damage = require('./system.damage');
System.Disability = require('./system.disability');
System.Effects = require('./system.effects');
System.Equip = require('./system.equip');
System.Events = require('./system.events');
System.ExpPoints = require('./system.exp-points');

import {SystemHunger} from './system.hunger';
export {SystemHunger} from './system.hunger';
System.Hunger = SystemHunger;

System.Missile = require('./system.missile');
System.Movement = require('./system.movement');
System.Quest = require('./system.quest');
System.Shop = require('./system.shop');
System.Skills = require('./system.skills');
System.SpellCast = require('./system.spell-cast');
System.SpellEffect = require('./system.spell-effect');
System.SpiritBind = require('./system.spirit-bind');

import {SystemTimeEffects} from './system.time-effects';
export {SystemTimeEffects} from './system.time-effects';
System.TimeEffects = SystemTimeEffects;

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
