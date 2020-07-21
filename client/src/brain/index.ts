/* For exporting all brain (AI) related modules. */

export * from './brain.base';

export * from './brain';
import {Brain} from './brain';

export * from './brain.player';
export * from './brain.memory';

import {BrainWeather} from './brain.weather';
export * from './brain.weather';

import {BrainVirtual} from './brain.virtual';
export * from './brain.virtual';

import * as BG from './brain.goaloriented';
export * from './brain.goaloriented';

import {BrainNeedDriven} from './brain.need-driven';
export * from './brain.need-driven';

Brain.Animal = BG.BrainAnimal;
Brain.Commander = BG.BrainCommander;
Brain.Explorer = BG.BrainExplorer;
Brain.GoalOriented = BG.BrainGoalOriented;
Brain.SpellCaster = BG.BrainSpellCaster;
Brain.Spirit = BG.BrainSpirit;
Brain.Thief = BG.BrainThief;
Brain.Flame = BG.BrainFlame;
Brain.Cloud = BG.BrainCloud;
Brain.Virtual = BrainVirtual;
Brain.Weather = BrainWeather;
Brain.NeedDriven = BrainNeedDriven;

export {Brain};
