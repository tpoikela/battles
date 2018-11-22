/* For exporting all brain (AI) related modules. */

export * from './brain.base';

export * from './brain';
import {Brain} from './brain';

export * from './brain.player';
export * from './brain.memory';
export * from './brain.virtual';

import * as BG from './brain.goaloriented';
export * from './brain.goaloriented';

Brain.Animal = BG.BrainAnimal;
Brain.Commander = BG.BrainCommander;
Brain.Explorer = BG.BrainExplorer;
Brain.GoalOriented = BG.BrainGoalOriented;
Brain.SpellCaster = BG.BrainSpellCaster;
Brain.Spirit = BG.BrainSpirit;
Brain.Thief = BG.BrainThief;
Brain.Flame = BG.BrainFlame;
Brain.Cloud = BG.BrainCloud;

export {Brain};
