
import RG from './rg';
import {ELEM} from '../data/elem-constants';
import {CellMap} from './map';
import {Level} from './level';
import {FactoryLevel} from './factory.level';

export interface CoordXY {
    x: number;
    y: number;
}

export const Builder: any = {};

Builder.addPathToMap = function(map: CellMap, coord: CoordXY[]): CoordXY[] {
    const chosenCoord = [];
    for (let j = 0; j < coord.length; j++) {
        const c = coord[j];
        if (map.hasXY(c.x, c.y)) {
            const baseElem = map.getBaseElemXY(c.x, c.y);
            const type = baseElem.getType();
            if (type.match(/(chasm|water)/)) {
                map.setBaseElemXY(c.x, c.y, ELEM.BRIDGE);
            }
            else if ((/stone|highrock/).test(type)) {
                map.setBaseElemXY(c.x, c.y, ELEM.PATH);
            }
            else {
                map.setBaseElemXY(c.x, c.y, ELEM.ROAD);
            }
            chosenCoord.push(c);
        }
    }
    return chosenCoord;
};

/* Splits a larger level into a matrix of X by Y sublevels. This does
* not preserve the original level for efficiency reasons, but extracts
* all entities and moves them to smaller levels. */
Builder.splitLevel = function(level: Level, conf): Level[] {
    const levels = [];
    const width = level.getMap().cols / conf.nLevelsX;
    const height = level.getMap().rows / conf.nLevelsY;

    for (let x = 0; x < conf.nLevelsX; x++) {
        const levelCol = [];
        for (let y = 0; y < conf.nLevelsY; y++) {
            const subLevel = new FactoryLevel().createLevel('empty', width, height);
            levelCol.push(subLevel);
        }
        levels.push(levelCol);
    }

    const getSubLevel = (x, y) => {
        const subIndexX = Math.floor(x / width);
        const subIndexY = Math.floor(y / height);
        return levels[subIndexX][subIndexY];
    };

    const getSubX = x => x % width;
    const getSubY = y => y % height;

    // Move all the elements
    const map = level.getMap();
    for (let x = 0; x < map.cols; x++) {
        for (let y = 0; y < map.rows; y++) {
            // Get correct sub-level
            const subLevel = getSubLevel(x, y);
            const subX = getSubX(x);
            const subY = getSubY(y);
            subLevel.getMap().setBaseElemXY(
                subX, subY, map.getBaseElemXY(x, y));

            // Translate x,y to sub-level x,y
        }
    }

    // Move actors
    const actors = level.getActors().slice();
    actors.forEach(actor => {
        const aX = actor.getX();
        const aY = actor.getY();
        if (level.removeActor(actor)) {
            const subLevel = getSubLevel(aX, aY);
            const subX = getSubX(aX);
            const subY = getSubY(aY);
            subLevel.addActor(actor, subX, subY);
        }
        else {
            RG.warn('Geometry', 'splitLevel',
                `removeActor failed on ${JSON.stringify(actor)}`);
        }
    });

    // Move items
    const items = level.getItems().slice();
    items.forEach(item => {
        const aX = item.getX();
        const aY = item.getY();
        level.removeItem(item, aX, aY);

        const subLevel = getSubLevel(aX, aY);
        const subX = getSubX(aX);
        const subY = getSubY(aY);
        subLevel.addItem(item, subX, subY);
    });

    // Warn about existing stairs
    const stairs = level.getStairs();
    if (stairs.length > 0) {
        RG.warn('Geometry', 'splitLevel',
            'Function does not move stairs correctly (yet).');
    }

    return levels;
}
