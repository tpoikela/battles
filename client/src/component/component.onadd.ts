

import {Component} from './component.base';
const TransientDataComponent = Component.TransientDataComponent;

/* Every time a component is added to Entity, or removed from Entity,
 * OnAddCb and onRemoveCb component is added to Entity. This does not trigger
 * the adding anymore recursively.
 *
 * A system will then process callbacks related to this addition/removal. Note
 * that this is different from component-specific callbacks, which are executed
 * for the added/removed component.
 *
 * OnAddCb/OnRemoveCb are designed for interaction between entities. For
 * example, removing Flying component of an Entity over Chasm Entity triggers
 * the callback of Chasm, which causes the Entity to fall.
 *
 * Another example: Adding Paralysis component from Entity over Water Entity
 * triggers the callback of Water, causing the Entity with Paralysis to start
 * drowning.
 */

export const OnAddCb = TransientDataComponent('OnAddCb',
    {compName: '', comp: null});

export const OnRemoveCb = TransientDataComponent('OnRemoveCb',
    {compName: '', comp: null});
