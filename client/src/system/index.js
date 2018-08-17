
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
System.Events = require('./system.events');
System.ExpPoints = require('./system.exp-points');
System.Hunger = require('./system.hunger');
System.Missile = require('./system.missile');
System.Movement = require('./system.movement');
System.Shop = require('./system.shop');
System.Skills = require('./system.skills');
System.SpellCast = require('./system.spell-cast');
System.SpellEffect = require('./system.spell-effect');
System.SpiritBind = require('./system.spirit-bind');
System.TimeEffects = require('./system.time-effects');

module.exports = System;
