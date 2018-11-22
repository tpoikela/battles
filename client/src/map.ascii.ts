/* File creates a Map from ASCII representation. */

import RG from './rg';
import {CellMap} from './map';
import * as Element from './element';

type TextInput = string | string[];

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
    x: number, y: number, char: string) 
{
    switch (char) {
        case '.': return RG.ELEM.FLOOR;
        case '+': return RG.ELEM.FLOOR;
        case '#': return RG.ELEM.WALL;
        case 'x': return RG.ELEM.WALL;
        case 'x': return RG.ELEM.WALL;
        case 'l': return RG.ELEM.LAVA;
        case 'w': return RG.ELEM.WATER;
        case 'W': return RG.ELEM.WATER;
        default: break;
    }
    return RG.ELEM.FLOOR;
};

MapASCII.DefaultMapper.prototype.getObjects = function(
    x: number, y: number, char: string) 
{
    const res = [];
    switch (char) {
        case '+': res.push(new RG.Element.Door(true)); break;
        default: break;
    }
    return res;
};
