
import {Component} from './component.base';
export * from './component.base';
export * from './component';

// import {Lore} from './component.lore';
// export * from './component.lore';

import {MindControl} from './component.mindcontrol';
export * from './component.mindcontrol';

import {Abilities} from './component.abilities';
export * from './component.abilities';

import {Trainer} from './component.chat';
export * from './component.chat';

export * from './component.quest';

// Component.Lore = Lore;
Component.MindControl = MindControl;
Component.Abilities = Abilities;
Component.Trainer = Trainer;
