
import {Component} from './component.base';
export * from './component.base';
export * from './component';

import {MindControl} from './component.mindcontrol';
export * from './component.mindcontrol';

import {Abilities} from './component.abilities';
export * from './component.abilities';

Component.MindControl = MindControl;
Component.Abilities = Abilities;
