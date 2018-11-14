
import {ELEM} from '../data/elem-constants';
import {CellMap} from './map';

export interface CoordXY {
    x: number;
    y: number;
}

export const Builder: any = {};

Builder.addPathToMap = function(map: CellMap, coord: CoordXY[]) {
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

