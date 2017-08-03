
/* Contains all source code modules assigned to RG. */

const RG = require('./rg.js');

RG.Random = require('./random.js');

RG.Geometry = require('./geometry.js');

RG.Object = require('./object.js');
RG.Item = require('./item.js');
RG.Time = require('./time.js');
RG.Component = require('./component.js');
RG.System = require('./system.js');
RG.BTree = require('./aisequence.js');
RG.Brain = require('./brain.js');
RG.Inv = require('./inv.js');
RG.Actor = require('./actor.js');
RG.Element = require('./element.js');

RG.Template = require('./template.js');

RG.Map = require('./map.js');
RG.World = require('./world.js');

RG.Effects = require('../data/effects.js');
RG.ObjectShell = require('./objectshellparser.js');

RG.Game = require('./game.js');
RG.Factory = require('./factory.js');

RG.Names = require('../data/name-gen.js');
RG.Overworld = require('./overworld.js');

RG.Game.FromJSON = require('./game.fromjson.js');

RG.Factory.Game = require('./factory.game.js');

module.exports = RG;

