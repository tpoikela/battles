
/* Contains functions to place props into levels. */
import RG from './rg';
import {Random} from './random';

const RNG = Random.getRNG();
export const Placer: any = {};

import {TCoord, BBox} from './interfaces';
type Cell = import('./map.cell').Cell;
type Level = import('./level').Level;
type Entity = import('./entity').Entity;

Placer.addPropsToFreeCells = function(level, props, type) {
    const freeCells = level.getMap().getFree();
    Placer.addPropsToCells(level, freeCells, props, type);
};

/* Adds to the given level, and its cells, all props given in the list. Assumes
 * that all props are of given type (placement function is different for
 * different types. */
Placer.addPropsToCells = function(level: Level, cells: Cell[], props, type) {
    let ok = props.length > 0 && cells.length > 0;
    for (let i = 0; i < props.length; i++) {
        if (cells.length > 0) {
            const index = RNG.randIndex(cells);
            const cell = cells[index];
            if (type === RG.TYPE_ACTOR) {
                ok = ok && level.addActor(props[i], cell.getX(), cell.getY());
            }
            else if (type === RG.TYPE_ITEM) {
                ok = ok && level.addItem(props[i], cell.getX(), cell.getY());
            }
            else {
                RG.err('Placer', 'addPropsToCells',
                    `Type ${type} not supported`);
            }
            cells.splice(index, 1); // remove used cell
        }
    }
    return ok;
};

Placer.addPropsToRoom = function(level: Level, room, props): boolean {
    if (!Array.isArray(props)) {
        RG.err('Placer', 'addPropsToRoom',
            `props must be an array. Got: ${props}`);
    }
    const bbox: BBox = room.getBbox();
    const prop = props[0];
    if (RG.isActor(prop)) {
        return Placer.addActorsToBbox(level, bbox, props);
    }
    else if (RG.isItem(prop)) {
        return Placer.addItemsToBbox(level, bbox, props);
    }
    else {
        RG.err('Placer', 'addPropsToRoom',
            `Prop type not supported: ${prop}`);
    }
    return false;
};

Placer.addActorsToBbox = function(level: Level, bbox: BBox, actors): boolean {
    const nActors = actors.length;
    const freeCells = level.getMap().getFreeInBbox(bbox);
    if (freeCells.length < nActors) {
        RG.warn('Factory', 'addActorsToBbox',
            'Not enough free cells');
    }
    return Placer.addPropsToCells(level, freeCells, actors, RG.TYPE_ACTOR);
};


Placer.addItemsToBbox = function(level: Level, bbox: BBox, items): boolean {
    const freeCells = level.getMap().getFreeInBbox(bbox);
    return Placer.addPropsToCells(level, freeCells, items, RG.TYPE_ITEM);
};

/* Adds entity to a random cell of matching filterFunc. Returns true if success,
 * otherwise returns false (for example if no cells found). */
Placer.addEntityToCellType = function(entity: Entity, level: Level, filterFunc) {
    let ok = false;
    const cells: Cell[] = level.getMap().getCells(filterFunc);
    if (cells.length === 0) {return false;}
    const randCell = RNG.arrayGetRand(cells);
    const [x, y] = randCell.getXY();
    if (RG.isActor(entity)) {
        ok = level.addActor(entity, x, y);
    }
    else if (RG.isItem(entity)) {
        ok = level.addItem(entity, x, y);
    }
    else if (RG.isElement(entity)) {
        ok = level.addElement(entity, x, y);
    }
    return ok;
};
