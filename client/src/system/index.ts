
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

import {SystemAttackRanged} from './system.attack-ranged';
export {SystemAttackRanged} from './system.attack-ranged';
System.AttackRanged = SystemAttackRanged;

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

import {SystemDeath} from './system.death';
export {SystemDeath} from './system.death';
System.Death = SystemDeath;

import {SystemDrainStats} from './system.drain-stats';
export {SystemDrainStats} from './system.drain-stats';
System.DrainStats = SystemDrainStats;

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

import {SystemZoneEvents} from './system.zone-events';
export {SystemZoneEvents} from './system.zone-events';
System.ZoneEvents = SystemZoneEvents;

import {SystemWorldSim} from './system.world-sim';
export {SystemWorldSim} from './system.world-sim';
System.WorldSim = SystemWorldSim;

import {SystemWeather} from './system.weather';
export {SystemWeather} from './system.weather';
System.Weather = SystemWeather;

/* Defines a new system declaration. Can be used in plugins to define new
 * systems easily without boilerplate code. */
System.defineSystem = function(sysName: string): any {
    const nameCaps = sysName.toUpperCase();
    RG.SYS[nameCaps] = Symbol();

    const SystemDecl = class extends SystemBase {

        constructor(compTypes, ...argsList) {
            super(RG.SYS[nameCaps], compTypes);
            if (this._init && typeof this._init === 'function') {
                this._init(compTypes, ...argsList);
            }
        }

        private _init?(compTypes: string[], ...args: any[]): void;
    };

    System[sysName] = SystemDecl;
    return SystemDecl;
};

/* Undefines a system declaration. Can be used as cleanup for defineSystem. */
System.undefineSystem = function(sysName: string): void {
    const nameCaps = sysName.toUpperCase();
    delete RG.SYS[nameCaps];
    delete System[sysName];
};
