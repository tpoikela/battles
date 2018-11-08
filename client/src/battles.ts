
/* Contains all source code modules assigned to RG. */

import RG from './rg';

export const RG: any = {};

import Verify from './verify';
RG.Verify = Verify;

import EventPool from './eventpool';
RG.EventPool = EventPool;

// No deps to RG.SubElems
import Random from './random';
RG.Random = Random;
import GameObject from './game-object';
RG.GameObject = GameObject;
import Mixin from './mixin';
RG.Mixin = Mixin;
import Geometry from './geometry';
RG.Geometry = Geometry;
import Time from './time';
RG.Time = Time;
import Template from './template';
RG.Template = Template;
import Animation from './animation';
RG.Animation = Animation;

// Minor deps to other exports
import Component from './component';
RG.Component = Component;
import Item from './item';
RG.Item = Item;
import Spell from './spell';
RG.Spell = Spell;
import System from './system';
RG.System = System;
import SystemManager from './system/system.manager';
RG.System.Manager = SystemManager;
import BTree from './aisequence';
RG.BTree = BTree;

import Goals from './goals';
RG.Goals = Goals;
import GoalsBattle from './goals-battle';
RG.GoalsBattle = GoalsBattle;
import GoalsTop from './goals-top';
RG.GoalsTop = GoalsTop;

import Brain from './brain';
RG.Brain = Brain;
import Memory from './brain.memory';
RG.Brain.Memory = Memory;
import Inv from './inv';
RG.Inv = Inv;
import * as Actor from './actor';
RG.Actor = Actor;
import Element from './element';
RG.Element = Element;

import Cell from './map.cell';
RG.Cell = Cell;
import Map from './map';
RG.Map = Map;
import MapGenerator from './map.generator';
RG.MapGenerator = MapGenerator;
import MapLevel from './level';
RG.MapLevel = MapLevel;
import LevelGenerator from './level-generator';
RG.LevelGenerator = LevelGenerator;
import MountainGenerator from './mountain-generator';
RG.MountainGenerator = MountainGenerator;
import DungeonGenerator from './dungeon-generator';
RG.DungeonGenerator = DungeonGenerator;
import CaveGenerator from './cave-generator';
RG.CaveGenerator = CaveGenerator;

import World from './world';
RG.World = World;

import Effects from '../data/effects';
RG.Effects = Effects;
import ObjectShell from './objectshellparser';
RG.ObjectShell = ObjectShell;

import Game from './game';
RG.Game = Game;
import Factory from './factory';
RG.Factory = Factory;
import FactoryWorld from './factory.world';
RG.FactoryWorld = FactoryWorld;
import FactoryZone from './factory.zone';
RG.FactoryZone = FactoryZone;

import Names from '../data/name-gen';
RG.Names = Names;
import LevelGen from '../data/level-gen';
RG.LevelGen = LevelGen;

import OW from './overworld.map';
RG.OW = OW;
import Overworld from './overworld';
RG.Overworld = Overworld;

import FromJSON from './game.fromjson';
RG.Game.FromJSON = FromJSON;
import Chunk from './chunk-manager';
RG.Chunk = Chunk;

import FactoryGame from './factory.game';
RG.FactoryGame = FactoryGame;

