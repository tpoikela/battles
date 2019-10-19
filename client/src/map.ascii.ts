/* File creates a Map from ASCII representation. */

import RG from './rg';
import {CellMap} from './map';
import * as Element from './element';
import {ELEM} from '../data/elem-constants';

type TextInput = string | string[];
type ElementBase = Element.ElementBase;
type ElementDoor = Element.ElementDoor;

export const MapASCII = function(text: TextInput, objMapper: any) {
    const lines: string[] = MapASCII.getTextArray(text);
    const numRows = lines.length;
    const numCols = lines[0].split('').length;
    const mapObj = new CellMap(numCols, numRows);

    lines.forEach((line, y) => {
        const chars = line.split('');
        chars.forEach((char, x) => {
            if (objMapper) {
                const baseElem = objMapper.getBaseElem(x, y, char);
                mapObj.setBaseElemXY(x, y, baseElem);
                const objs = objMapper.getObjects(x, y, char);
                objs.forEach((obj: any) => {
                    mapObj.setProp(x, y, obj.getPropType(), obj);
                });
            }
            else {
                const marker = new Element.ElementMarker(char);
                mapObj.setProp(x, y, RG.TYPE_ELEM, marker);
            }
        });
    });

    this.map = mapObj;

};

MapASCII.prototype.getMap = function() {
    return this.map;
};

const mapStartRe = new RegExp('^MAP\s*$');
const mapEndRe = new RegExp('^ENDMAP\s*$');

MapASCII.extractMap = function(text: TextInput) {
    const lines = MapASCII.getTextArray(text);
    let mapFound = false;
    const result: string[] = [];
    lines.forEach(line => {
        if (mapFound) {
            result.push(line);
        }
        else if (mapStartRe.test(line)) {
            mapFound = true;
        }
        else if (mapEndRe.test(line)) {
            mapFound = false;
        }
    });
    return result;
};

MapASCII.getTextArray = function(text: TextInput): string[] {
    let lines = text;
    if (!Array.isArray(lines)) {
        lines = lines.split('\n');
    }
    return lines;
};

MapASCII.DefaultMapper = function() {

};

MapASCII.DefaultMapper.prototype.getBaseElem = function(
    x: number, y: number, char: string): Readonly<ElementBase>
{
    switch (char) {
        case '.': return ELEM.FLOOR;
        case '+': return ELEM.FLOOR;
        case '#': return ELEM.WALL;
        case 'x': return ELEM.WALL;
        case 'X': return ELEM.WALL;
        case 'l': return ELEM.LAVA;
        case 'w': return ELEM.WATER;
        case 'W': return ELEM.WATER;
        default: break;
    }
    return ELEM.FLOOR;
};

MapASCII.DefaultMapper.prototype.getObjects = function(
    x: number, y: number, char: string)
{
    const res: any = [];
    switch (char) {
        case '+': res.push(new Element.ElementDoor(true)); break;
        default: break;
    }
    return res;
};
