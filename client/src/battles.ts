
/* Contains all source code modules assigned to RG. */

import RG = require('./rg');

const RG: any = RG;

import Verify = require('./verify');
RG.Verify = Verify;

import EventPool = require('./eventpool');
RG.EventPool = EventPool;

// No deps to RG.SubElems
import Random = require('./random');
RG.Random = Random;
import GameObject = require('./game-object');
RG.GameObject = GameObject;
import Mixin = require('./mixin');
RG.Mixin = Mixin;
import Geometry = require('./geometry');
RG.Geometry = Geometry;
import Time = require('./time');
RG.Time = Time;
import Template = require('./template');
RG.Template = Template;
import Animation = require('./animation');
RG.Animation = Animation;

// Minor deps to other exports
import Component = require('./component');
RG.Component = Component;
import Item = require('./item');
RG.Item = Item;
import Spell = require('./spell');
RG.Spell = Spell;
import System = require('./system');
RG.System = System;
import SystemManager = require('./system/system.manager');
RG.System.Manager = SystemManager;
import BTree = require('./aisequence');
RG.BTree = BTree;

import Goals = require('./goals');
RG.Goals = Goals;
import GoalsBattle = require('./goals-battle');
RG.GoalsBattle = GoalsBattle;
import GoalsTop = require('./goals-top');
RG.GoalsTop = GoalsTop;

import Brain = require('./brain');
RG.Brain = Brain;
import Memory = require('./brain.memory');
RG.Brain.Memory = Memory;
import Inv = require('./inv');
RG.Inv = Inv;
import Actor = require('./actor');
RG.Actor = Actor;
import Element = require('./element');
RG.Element = Element;

import Cell = require('./map.cell');
RG.Cell = Cell;
import Map = require('./map');
RG.Map = Map;
import MapGenerator = require('./map.generator');
RG.MapGenerator = MapGenerator;
import MapLevel = require('./level');
RG.MapLevel = MapLevel;
import LevelGenerator = require('./level-generator');
RG.LevelGenerator = LevelGenerator;
import MountainGenerator = require('./mountain-generator');
RG.MountainGenerator = MountainGenerator;
import DungeonGenerator = require('./dungeon-generator');
RG.DungeonGenerator = DungeonGenerator;
import CaveGenerator = require('./cave-generator');
RG.CaveGenerator = CaveGenerator;

import World = require('./world');
RG.World = World;

import Effects = require('../data/effects');
RG.Effects = Effects;
import ObjectShell = require('./objectshellparser');
RG.ObjectShell = ObjectShell;

import Game = require('./game');
RG.Game = Game;
import Factory = require('./factory');
RG.Factory = Factory;
import FactoryWorld = require('./factory.world');
RG.FactoryWorld = FactoryWorld;
import FactoryZone = require('./factory.zone');
RG.FactoryZone = FactoryZone;

import Names = require('../data/name-gen');
RG.Names = Names;
import LevelGen = require('../data/level-gen');
RG.LevelGen = LevelGen;

import OW = require('./overworld.map');
RG.OW = OW;
import Overworld = require('./overworld');
RG.Overworld = Overworld;

import FromJSON = require('./game.fromjson');
RG.Game.FromJSON = FromJSON;
import Chunk = require('./chunk-manager');
RG.Chunk = Chunk;

import FactoryGame = require('./factory.game');
RG.FactoryGame = FactoryGame;

export default RG;

