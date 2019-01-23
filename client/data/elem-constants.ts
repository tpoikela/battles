/* This file contains constants for elements. This is a flyweight pattern
 * in which each map element points to these constants only. */

import {ObjectShell} from '../src/objectshellparser';
import {ElementBase, ElementWall} from '../src/element';

export const ELEM: {[key: string]: ElementBase} = {};

const parser = ObjectShell.getParser();
// Constant elements which can be used by all levels. freeze()
// used to prevent any mutations. Note that elements with any state
// in them should not be shared (unless state is common for all)
ELEM.BRIDGE = Object.freeze(parser.createElement('bridge'));
ELEM.CHASM = Object.freeze(parser.createElement('chasm'));

ELEM.GRASS = Object.freeze(parser.createElement('grass'));
ELEM.GRASS_SNOW = Object.freeze(parser.createElement('snowy grass'));
ELEM.HIGH_ROCK = Object.freeze(parser.createElement('highrock'));
ELEM.LAVA = Object.freeze(parser.createElement('lava'));
ELEM.PATH = Object.freeze(parser.createElement('path'));
ELEM.ROAD = Object.freeze(parser.createElement('road'));
ELEM.SKY = Object.freeze(parser.createElement('sky'));
ELEM.SNOW = Object.freeze(parser.createElement('snow'));
ELEM.SNOW_DEEP = Object.freeze(parser.createElement('deep snow'));
ELEM.SNOW_LIGHT = Object.freeze(parser.createElement('light snow'));
ELEM.STONE = Object.freeze(parser.createElement('stone'));
ELEM.TREE = Object.freeze(parser.createElement('tree'));
ELEM.TREE_SNOW = Object.freeze(parser.createElement('snow-covered tree'));

ELEM.FLOOR = Object.freeze(parser.createElement('floor'));
ELEM.FLOOR_CASTLE = Object.freeze(parser.createElement('floorcastle'));
ELEM.FLOOR_CAVE = Object.freeze(parser.createElement('floorcave'));
ELEM.FLOOR_CRYPT = Object.freeze(parser.createElement('floorcrypt'));
ELEM.FLOOR_HOUSE = Object.freeze(parser.createElement('floorhouse'));
ELEM.FLOOR_WOODEN = Object.freeze(parser.createElement('floorwooden'));

ELEM.WALL = Object.freeze(new ElementWall('wall'));
ELEM.WALL_CASTLE = Object.freeze(new ElementWall('wallcastle'));
ELEM.WALL_CAVE = Object.freeze(new ElementWall('wallcave'));
ELEM.WALL_CRYPT = Object.freeze(new ElementWall('wallcrypt'));
ELEM.WALL_ICE = Object.freeze(new ElementWall('wallice'));
ELEM.WALL_WOODEN = Object.freeze(new ElementWall('wallwooden'));
ELEM.WALL_MOUNT = Object.freeze(new ElementWall('wallmount'));

// ELEM.WATER = Object.freeze(new Element.Water());
ELEM.WATER = Object.freeze(parser.createElement('water'));
ELEM.WATER_FROZEN = Object.freeze(parser.createElement('frozen water'));
ELEM.FORT = Object.freeze(parser.createElement('fort'));

export const ELEM_MAP: any = {};

ELEM_MAP.elemTypeToObj = {};
ELEM_MAP.elemTypeToIndex = {};
ELEM_MAP.elemIndexToType = {};
ELEM_MAP.elemIndexToElemObj = {};

let elemIndex = 1;
Object.keys(ELEM).forEach(key => {
    const type = ELEM[key].getType();
    ELEM_MAP.elemTypeToObj[type] = ELEM[key];
    ELEM_MAP.elemTypeToIndex[type] = elemIndex;
    ELEM_MAP.elemIndexToType[elemIndex] = type;
    ELEM_MAP.elemIndexToElemObj[elemIndex] = ELEM[key];
    ++elemIndex;
});
