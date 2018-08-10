
/* Contains all source code modules assigned to RG. */

const RG = require('./rg.js');

import ChunkManager from './chunk-manager';

RG.Verify = require('./verify.js');

RG.EventPool = require('./eventpool');

// No deps to RG.SubElems
RG.Random = require('./random.js');
RG.Mixin = require('./mixin.js');
RG.Geometry = require('./geometry.js');
RG.Time = require('./time.js');
RG.Template = require('./template.js');
RG.Animation = require('./animation.js');

// Minor deps to other exports
RG.Component = require('./component.js');
RG.Item = require('./item.js');
RG.Spell = require('./spell.js');
RG.System = require('./system.js');
RG.BTree = require('./aisequence.js');

RG.Goals = require('./goals');
RG.GoalsBattle = require('./goals-battle');
RG.GoalsTop = require('./goals-top');

RG.Brain = require('./brain.js');
RG.Inv = require('./inv.js');
RG.Actor = require('./actor.js');
RG.Element = require('./element.js');

RG.Cell = require('./map.cell.js');
RG.Map = require('./map.js');
RG.Map.Level = require('./level.js');
RG.LevelGenerator = require('./level-generator');
RG.MountainGenerator = require('./mountain-generator');
RG.DungeonGenerator = require('./dungeon-generator');
RG.CaveGenerator = require('./cave-generator');

RG.World = require('./world.js');

RG.Effects = require('../data/effects.js');
RG.ObjectShell = require('./objectshellparser.js');

RG.Game = require('./game.js');
RG.Factory = require('./factory.js');
RG.Factory.World = require('./factory.world.js');

RG.Names = require('../data/name-gen.js');
RG.LevelGen = require('../data/level-gen.js');

RG.OW = require('./overworld.map');
RG.Overworld = require('./overworld.js');

RG.Game.FromJSON = require('./game.fromjson.js');

RG.Factory.Game = require('./factory.game.js');

RG.ChunkManager = ChunkManager;

module.exports = RG;

