
/* Contains all source code modules assigned to RG. */

const RG = require('./rg');

RG.Verify = require('./verify');

RG.EventPool = require('./eventpool');

// No deps to RG.SubElems
RG.Random = require('./random');
RG.GameObject = require('./game-object');
RG.Mixin = require('./mixin');
RG.Geometry = require('./geometry');
RG.Time = require('./time');
RG.Template = require('./template');
RG.Animation = require('./animation');

// Minor deps to other exports
RG.Component = require('./component');
RG.Item = require('./item');
RG.Spell = require('./spell');
RG.System = require('./system');
RG.System.Manager = require('./system/system.manager');
RG.BTree = require('./aisequence');

RG.Goals = require('./goals');
RG.GoalsBattle = require('./goals-battle');
RG.GoalsTop = require('./goals-top');

RG.Brain = require('./brain');
RG.Brain.Memory = require('./brain.memory');
RG.Inv = require('./inv');
RG.Actor = require('./actor');
RG.Element = require('./element');

RG.Cell = require('./map.cell');
RG.Map = require('./map');
RG.Map.Level = require('./level');
RG.LevelGenerator = require('./level-generator');
RG.MountainGenerator = require('./mountain-generator');
RG.DungeonGenerator = require('./dungeon-generator');
RG.CaveGenerator = require('./cave-generator');

RG.World = require('./world');

RG.Effects = require('../data/effects');
RG.ObjectShell = require('./objectshellparser');

RG.Game = require('./game');
RG.Factory = require('./factory');
RG.Factory.World = require('./factory.world');
RG.Factory.Zone = require('./factory.zone');

RG.Names = require('../data/name-gen');
RG.LevelGen = require('../data/level-gen');

RG.OW = require('./overworld.map');
RG.Overworld = require('./overworld');

RG.Game.FromJSON = require('./game.fromjson');
RG.Chunk = require('./chunk-manager');

RG.Factory.Game = require('./factory.game');

module.exports = RG;

