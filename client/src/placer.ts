
/* Contains functions to place props into levels. */
import RG from './rg';
import {Random} from './random';
import {BBox} from './bbox';

const RNG = Random.getRNG();
export const Placer: any = {};

import {TCoord, TCellProp} from './interfaces';
type Cell = import('./map.cell').Cell;
type CellMap = import('./map').CellMap;
type Level = import('./level').Level;
type Entity = import('./entity').Entity;
type ItemBase = import('./item').ItemBase;
type ElementXY = import('./element').ElementXY;
type BaseActor = import('./actor').BaseActor;

Placer.addPropsToFreeCells = function(level: Level, props: TCellProp[]): boolean {
    const freeCells = level.getMap().getFree();
    return Placer.addPropsToCells(level, freeCells, props);
};

/* Adds to the given level, and its cells, all props given in the list. Assumes
 * that all props are of given type (placement function is different for
 * different types. */
Placer.addPropsToCells = function(level: Level, cells: Cell[], props: TCellProp[]): boolean {
    let ok = props.length > 0 && cells.length > 0;
    for (let i = 0; i < props.length; i++) {
        if (cells.length > 0) {
            const index = RNG.randIndex(cells);
            const cell = cells[index];
            if (RG.isActor(props[i])) {
                ok = ok && level.addActor(props[i] as BaseActor, cell.getX(), cell.getY());
            }
            else if (RG.isItem(props[i])) {
                ok = ok && level.addItem(props[i] as ItemBase, cell.getX(), cell.getY());
            }
            else if (RG.isElement(props[i])) {
                ok = ok && level.addElement(props[i] as ElementXY, cell.getX(), cell.getY());
            }
            else {
                RG.err('Placer', 'addPropsToCells',
                    `Type ${props[i].getPropType()} not supported`);
            }
            cells.splice(index, 1); // remove used cell
        }
    }
    return ok;
};

Placer.addPropsToRoom = function(level: Level, room, props: TCellProp[]): boolean {
    if (!Array.isArray(props)) {
        RG.err('Placer', 'addPropsToRoom',
            `props must be an array. Got: ${props}`);
    }
    const bbox: BBox = BBox.fromBBox(room.getBbox());
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

Placer.addActorsToBbox = function(level: Level, bbox: BBox, actors: BaseActor[]): boolean {
    const nActors = actors.length;
    const freeCells = level.getMap().getFreeInBbox(bbox);
    if (freeCells.length < nActors) {
        RG.warn('Factory', 'addActorsToBbox',
            'Not enough free cells');
    }
    return Placer.addPropsToCells(level, freeCells, actors, RG.TYPE_ACTOR);
};


Placer.addItemsToBbox = function(level: Level, bbox: BBox, items: ItemBase[]): boolean {
    const freeCells = level.getMap().getFreeInBbox(bbox);
    return Placer.addPropsToCells(level, freeCells, items, RG.TYPE_ITEM);
};

/* Adds entity to a random cell of matching filterFunc. Returns true if success,
 * otherwise returns false (for example if no cells found). */
Placer.addEntityToCellType = function(
    entity: Entity, level: Level, filterFunc: (cell: Cell) => boolean
): boolean {
    let ok = false;
    const cells: Cell[] = level.getMap().getCells(filterFunc);
    if (cells.length === 0) {return false;}
    const randCell = RNG.arrayGetRand(cells);
    const [x, y] = randCell.getXY();
    if (RG.isActor(entity)) {
        ok = level.addActor(entity as BaseActor, x, y);
    }
    else if (RG.isItem(entity)) {
        ok = level.addItem(entity as ItemBase, x, y);
    }
    else if (RG.isElement(entity)) {
        ok = level.addElement(entity as ElementXY, x, y);
    }
    return ok;
};

/* Returns a bounding for of given size from the map, if any is found. Useful
 * for retrofitting sub-levels into already generated levels. */
Placer.findCellArea = function(
    map: CellMap, sizeX: number, sizeY: number, func: (cell: Cell) => boolean
): BBox[] {
    const {cols, rows} = map;
    let [currX, currY] = [0, 0];

    const bboxes: BBox[] = [];
    const minBoxes = 5;
    const usedCells: {[key: string]: boolean} = {};

    // Scans the x0,y0 position to find the specified area
    const scanPosition = (x0: number, y0: number, res: TCoord[]): boolean => {
        for (let x = x0; x < (x0 + sizeX); x++) {
            if (x < cols) {
                for (let y = y0; y < (y0 + sizeY); y++) {
                    if (y < rows) {
                        if (usedCells[x + ',' + y]) {
                            return false;
                        }
                        if (!func(map.getCell(x, y))) {
                            return false;
                        }
                        else {
                            res.push([x, y]);
                        }
                    }
                    else {
                        return false;
                    }
                }
            }
            else {
                return false;
            }
        }
        res.forEach((xy: TCoord) => {
            usedCells[xy[0] + ',' + xy[1]] = true;
        });
        return true;
    };

    let done = false;
    let result: TCoord[] = [];

    while (!done) {
        result = [];
        done = scanPosition(currX, currY, result);
        if (done) {
            const bbox = new BBox(
                currX, currY, currX + sizeX - 1, currY + sizeY - 1
            );
            bboxes.push(bbox);
        }
        if (bboxes.length < minBoxes) {done = false;}

        if (!done) {
            ++currX;
            if (currX === cols) {
                currX = 0;
                ++currY;
            }
            if (currY === rows) {break;}
        }
    }

    return bboxes;
};
