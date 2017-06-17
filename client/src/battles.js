
/* Contains all source code modules assigned to RG. */

const RG = require('./rg.js');

RG.Game = require('./game.js');

RG.Object = require('./object.js');
RG.Item = require('./item.js');
RG.Time = require('./time.js');
RG.Component = require('./component.js');
RG.System = require('./system.js');
RG.Brain = require('./brain.js');
RG.Inv = require('./inv.js');
RG.Actor = require('./actor.js');
RG.Element = require('./element.js');
RG.Map = require('./map.js');
RG.World = require('./world.js');

RG.Effects = require('../data/effects.js');
RG.ObjectShellParser = require('./objectshellparser.js');
RG.Factory = require('./factory.js');

module.exports = RG;

