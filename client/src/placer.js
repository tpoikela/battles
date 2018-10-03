
/* Contains functions to place props into levels. */
const RG = require('./rg');
const Random = require('./random');

const RNG = Random.getRNG();

const Placer = {};

Placer.addPropsToFreeCells = function(level, props, type) {
    const freeCells = level.getMap().getFree();
    Placer.addPropsToCells(level, freeCells, props, type);
};

/* Adds to the given level, and its cells, all props given in the list. Assumes
 * that all props are of given type (placement function is different for
 * different types. */
Placer.addPropsToCells = function(level, cells, props, type) {
    for (let i = 0; i < props.length; i++) {
        if (cells.length > 0) {
            const index = RNG.randIndex(cells);
            const cell = cells[index];
            if (type === RG.TYPE_ACTOR) {
                level.addActor(props[i], cell.getX(), cell.getY());
            }
            else if (type === RG.TYPE_ITEM) {
                level.addItem(props[i], cell.getX(), cell.getY());
            }
            else {
                RG.err('Placer', 'addPropsToCells',
                    `Type ${type} not supported`);
            }
            cells.splice(index, 1); // remove used cell
        }
    }
};

Placer.addActorsToBbox = function(level, bbox, actors) {
    const nActors = actors.length;
    const freeCells = level.getMap().getFreeInBbox(bbox);
    if (freeCells.length < nActors) {
        RG.warn('Factory', 'addActorsToBbox',
            'Not enough free cells');
    }
    Placer.addPropsToCells(level, freeCells, actors, RG.TYPE_ACTOR);
};


Placer.addItemsToBbox = function(level, bbox, items) {
    const freeCells = level.getMap().getFreeInBbox(bbox);
    Placer.addPropsToCells(level, freeCells, items, RG.TYPE_ITEM);
};

module.exports = Placer;
