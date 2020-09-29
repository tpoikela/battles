

import {Component} from './component.base';
const TransientDataComponent = Component.TransientDataComponent;

export const OnAddCb = TransientDataComponent('OnAddCb',
    {compName: '', comp: null});

export const OnRemoveCb = TransientDataComponent('OnRemoveCb',
    {compName: '', comp: null});
