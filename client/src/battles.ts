
/* Contains all source code modules assigned to RG. */

import RG = require('./rg');

import RG.Verify = require('./verify');

import RG.EventPool = require('./eventpool');

import // No deps to RG.SubElems
import RG.Random = require('./random');
import RG.GameObject = require('./game-object');
import RG.Mixin = require('./mixin');
import RG.Geometry = require('./geometry');
import RG.Time = require('./time');
import RG.Template = require('./template');
import RG.Animation = require('./animation');

import // Minor deps to other exports
import RG.Component = require('./component');
import RG.Item = require('./item');
import RG.Spell = require('./spell');
import RG.System = require('./system');
import RG.System.Manager = require('./system/system.manager');
import RG.BTree = require('./aisequence');

import RG.Goals = require('./goals');
import RG.GoalsBattle = require('./goals-battle');
import RG.GoalsTop = require('./goals-top');

import RG.Brain = require('./brain');
import RG.Brain.Memory = require('./brain.memory');
import RG.Inv = require('./inv');
import RG.Actor = require('./actor');
import RG.Element = require('./element');

import RG.Cell = require('./map.cell');
import RG.Map = require('./map');
import RG.Map.Generator = require('./map.generator');
import RG.Map.Level = require('./level');
import RG.LevelGenerator = require('./level-generator');
import RG.MountainGenerator = require('./mountain-generator');
import RG.DungeonGenerator = require('./dungeon-generator');
import RG.CaveGenerator = require('./cave-generator');

import RG.World = require('./world');

import RG.Effects = require('../data/effects');
import RG.ObjectShell = require('./objectshellparser');

import RG.Game = require('./game');
import RG.Factory = require('./factory');
import RG.Factory.World = require('./factory.world');
import RG.Factory.Zone = require('./factory.zone');

import RG.Names = require('../data/name-gen');
import RG.LevelGen = require('../data/level-gen');

import RG.OW = require('./overworld.map');
import RG.Overworld = require('./overworld');

import RG.Game.FromJSON = require('./game.fromjson');
import RG.Chunk = require('./chunk-manager');

import RG.Factory.Game = require('./factory.game');

export default RG;

