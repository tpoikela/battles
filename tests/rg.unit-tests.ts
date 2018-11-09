/* Helper code for unit tests. NOTE: Don't put integration level helpers
 * here. */
import { expect } from 'chai';

import RG from '../client/src/rg';
import {Cell} from '../client/src/map.cell';
import {FactoryLevel} from '../client/src/factory.level';
import * as Element from '../client/src/element';
import {Random} from '../client/src/random';

export const RGUnitTests: any = {};

const RNG = Random.getRNG();

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


/* Adds each entity into the level into a random location. */
RGUnitTests.wrapIntoLevel = function(arr, cols = 20, rows = 20) {
    const factLevel = new FactoryLevel();
    const level = factLevel.createLevel('empty', cols, rows);
    arr.forEach(ent => {
        const x = RNG.getUniformInt(0, cols - 1);
        const y = RNG.rng.getUniformInt(0, rows - 1);
        if (ent.getPropType() === RG.TYPE_ACTOR) {
            expect(level.addActor(ent, x, y)).to.equal(true);
        }
        else if (ent.getPropType() === RG.TYPE_ITEM) {
            level.addItem(ent, x, y);
        }
        else if (ent.getPropType() === RG.TYPE_ELEM) {
            level.addElement(ent, x, y);
        }
    });
    return level;
};
