/* Helper code for unit tests. NOTE: Don't put integration level helpers
 * here. */
import { expect } from 'chai';

import RG from '../client/src/rg';
import {Cell} from '../client/src/map.cell';
import * as Element from '../client/src/element';

export const RGUnitTests: any = {};

/* Wraps an object into a cell for later use. Some functions require a map cell
* instead of taking the object directly, so this is useful. */
RGUnitTests.wrapObjWithCell = function(obj) {
    const baseElem = new Element.ElementBase('floor');
    const cell = new Cell(0, 0, baseElem);
    cell.setExplored(); // Otherwise returns darkness
    const propType = obj.getPropType();
    cell.setProp(propType, obj);
    return cell;
};

RGUnitTests.checkChar = function(obj, expChar) {
    const cell = RGUnitTests.wrapObjWithCell(obj);
    expect(RG.getCellChar(cell)).to.equal(expChar);
};

RGUnitTests.checkCSSClassName = function(obj, expClass) {
    const cell = RGUnitTests.wrapObjWithCell(obj);
    expect(RG.getStyleClassForCell(cell)).to.equal(expClass);
};
