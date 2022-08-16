/* Helper code for unit tests. NOTE: Don't put integration level helpers
 * here. */
import { expect } from 'chai';

import RG from '../client/src/rg';
import {Cell} from '../client/src/map.cell';
import {FactoryLevel} from '../client/src/factory.level';
import * as Element from '../client/src/element';
import {Random} from '../client/src/random';
import {TCellProp} from '../client/src/interfaces';
import {Entity} from '../client/src/entity';

type Level = import('../client/src/level').Level;

export const RGUnitTests: any = {};

const RNG = Random.getRNG();

/* Wraps an object into a cell for later use. Some functions require a map cell
* instead of taking the object directly, so this is useful. */
RGUnitTests.wrapObjWithCell = function(obj: TCellProp): Cell {
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

/* Moves entity from its current position to x,y. */
RGUnitTests.moveEntityTo = function(ent: Entity, x: number, y: number): boolean {
    const level = ent.getLevel();
    if (level.moveActorTo(ent, x, y)) {
        return true;
    }
    throw new Error(`Cannot move entity to ${x}, ${y}`);
};

/* Adds each entity into the level into a random location. */
RGUnitTests.wrapIntoLevel = function(arr: Entity[], cols = 20, rows = 20): Level {
    const factLevel = new FactoryLevel();
    const level = factLevel.createLevel('empty', cols, rows);
    arr.forEach(ent => {
        const x = RNG.getUniformInt(0, cols - 1);
        const y = RNG.rng.getUniformInt(0, rows - 1);
        level.addEntity(ent, x, y);
    });
    return level;
};
