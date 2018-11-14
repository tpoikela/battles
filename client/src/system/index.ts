
import RG from '../rg';
import {Path} from '../path';
import {Geometry} from '../geometry';

export const System: any = {};

import {SystemBase} from './system.base';
export {SystemBase} from './system.base';
System.Base = SystemBase;

import {SystemAnimation} from './system.animation';
export {SystemAnimation} from './system.animation';
System.Animation = SystemAnimation;

import {SystemAreaEffects} from './system.area-effects';
export {SystemAreaEffects} from './system.area-effects';
System.AreaEffects = SystemAreaEffects;

import {SystemAttack} from './system.attack';
export {SystemAttack} from './system.attack';
System.Attack = SystemAttack;

import {SystemBaseAction} from './system.base-action';
export {SystemBaseAction} from './system.base-action';
System.BaseAction = SystemBaseAction;

import {SystemBattle} from './system.battle';
export {SystemBattle} from './system.battle';
System.Battle = SystemBattle;

import {SystemChat} from './system.chat';
export {SystemChat} from './system.chat';
System.Chat = SystemChat;

import {SystemCommunication} from './system.communication';
export {SystemCommunication} from './system.communication';
System.Communication = SystemCommunication;

import {SystemDamage} from './system.damage';
export {SystemDamage} from './system.damage';
System.Damage = SystemDamage;

import {SystemDisability} from './system.disability';
export {SystemDisability} from './system.disability';
System.Disability = SystemDisability;

import {SystemEffects} from './system.effects';
export {SystemEffects} from './system.effects';
System.Effects = SystemEffects;

import {SystemEquip} from './system.equip';
export {SystemEquip} from './system.equip';
System.Equip = SystemEquip;

import {SystemEvents} from './system.events';
export {SystemEvents} from './system.events';
System.Events = SystemEvents;

import {SystemExpPoints} from './system.exp-points';
export {SystemExpPoints} from './system.exp-points';
System.ExpPoints = SystemExpPoints;

import {SystemHunger} from './system.hunger';
export {SystemHunger} from './system.hunger';
System.Hunger = SystemHunger;

import {SystemMissile} from './system.missile';
export {SystemMissile} from './system.missile';
System.Missile = SystemMissile;

import {SystemMovement} from './system.movement';
export {SystemMovement} from './system.movement';
System.Movement = SystemMovement;

import {SystemQuest} from './system.quest';
export {SystemQuest} from './system.quest';
System.Quest = SystemQuest;

import {SystemShop} from './system.shop';
export {SystemShop} from './system.shop';
System.Shop = SystemShop;

import {SystemSkills} from './system.skills';
export {SystemSkills} from './system.skills';
System.Skills = SystemSkills;

import {SystemSpellCast} from './system.spell-cast';
export {SystemSpellCast} from './system.spell-cast';
System.SpellCast = SystemSpellCast;

import {SystemSpellEffect} from './system.spell-effect';
export {SystemSpellEffect} from './system.spell-effect';
System.SpellEffect = SystemSpellEffect;

import {SystemSpiritBind} from './system.spirit-bind';
export {SystemSpiritBind} from './system.spirit-bind';
System.SpiritBind = SystemSpiritBind;

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
