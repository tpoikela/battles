/* This file contains constants for elements. This is a flyweight pattern
 * in which each map element points to these constants only. */

import {ObjectShell} from '../src/objectshellparser';
import {ElementBase, ElementWall} from '../src/element';

export const ELEM: {[key: string]: ElementBase} = {};

const frz = Object.freeze;

const parser = ObjectShell.getParser();
// Constant elements which can be used by all levels. freeze()
// used to prevent any mutations. Note that elements with any state
// in them should not be shared (unless state is common for all)
ELEM.BRIDGE = frz(parser.createElement('bridge'));
ELEM.CHASM = frz(parser.createElement('chasm'));

ELEM.GRASS = frz(parser.createElement('grass'));
ELEM.GRASS_SNOW = frz(parser.createElement('snowy grass'));
ELEM.HIGH_ROCK = frz(parser.createElement('highrock'));
ELEM.LAVA = frz(parser.createElement('lava'));
ELEM.PATH = frz(parser.createElement('path'));
ELEM.ROAD = frz(parser.createElement('road'));
ELEM.SKY = frz(parser.createElement('sky'));
ELEM.SNOW = frz(parser.createElement('snow'));
ELEM.SNOW_TRACKS = frz(parser.createElement('snow with tracks'));
ELEM.SNOW_DEEP = frz(parser.createElement('deep snow'));
ELEM.SNOW_DEEP_TRACKS = frz(parser.createElement('deep snow with tracks'));
ELEM.SNOW_LIGHT = frz(parser.createElement('light snow'));
ELEM.SNOW_LIGHT_TRACKS = frz(parser.createElement('light snow with tracks'));
ELEM.STONE = frz(parser.createElement('stone'));
ELEM.TREE = frz(parser.createElement('tree'));
ELEM.TREE_SNOW = frz(parser.createElement('snow-covered tree'));

ELEM.FLOOR = frz(parser.createElement('floor'));
ELEM.FLOOR_CASTLE = frz(parser.createElement('floorcastle'));
ELEM.FLOOR_CAVE = frz(parser.createElement('floorcave'));
ELEM.FLOOR_CRYPT = frz(parser.createElement('floorcrypt'));
ELEM.FLOOR_HOUSE = frz(parser.createElement('floorhouse'));
ELEM.FLOOR_WOODEN = frz(parser.createElement('floorwooden'));

ELEM.WALL = frz(new ElementWall('wall'));
ELEM.WALL_CASTLE = frz(new ElementWall('wallcastle'));
ELEM.WALL_CAVE = frz(new ElementWall('wallcave'));
ELEM.WALL_CRYPT = frz(new ElementWall('wallcrypt'));
ELEM.WALL_ICE = frz(new ElementWall('wallice'));
ELEM.WALL_WOODEN = frz(new ElementWall('wallwooden'));
ELEM.WALL_MOUNT = frz(new ElementWall('wallmount'));

// ELEM.WATER = frz(new Element.Water());
ELEM.WATER = frz(parser.createElement('water'));
ELEM.WATER_FROZEN = frz(parser.createElement('frozen water'));
ELEM.FORT = frz(parser.createElement('fort'));

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
