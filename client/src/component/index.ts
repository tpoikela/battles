
import {Component} from './component.base';
export * from './component.base';
export * from './component';

import {MindControl} from './component.mindcontrol';
export * from './component.mindcontrol';

import {Abilities} from './component.abilities';
export * from './component.abilities';

import {Trainer} from './component.chat';
export * from './component.chat';

export * from './component.quest';

import {OnAddCb, OnRemoveCb} from './component.onadd';
export * from './component.onadd';

// Component.Lore = Lore;
Component.MindControl = MindControl;
Component.Abilities = Abilities;
Component.Trainer = Trainer;
Component.OnAddCb = OnAddCb;
Component.OnRemoveCb = OnRemoveCb;
