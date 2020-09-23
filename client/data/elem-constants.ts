/* This file contains constants for elements. This is a flyweight pattern
 * in which each map element points to these constants only. */

import {ObjectShell} from '../src/objectshellparser';
import {ElementWall} from '../src/element';
import {ConstBaseElem} from '../src/interfaces';

export const ELEM: {[key: string]: ConstBaseElem} = {};

export const ELEMS: {[key: string]: ConstBaseElem[]} = {};

const frz = Object.freeze;

const parser = ObjectShell.getParser();
// Constant elements which can be used by all levels. freeze()
// used to prevent any mutations. Note that elements with any state
// in them should not be shared (unless state is common for all)
ELEM.BED = frz(parser.createElement('bed'));
ELEM.BRIDGE = frz(parser.createElement('bridge'));

ELEM.SHALLOW_CHASM = frz(parser.createElement('shallow chasm'));
ELEM.CHASM = frz(parser.createElement('chasm'));
ELEM.DEEP_CHASM = frz(parser.createElement('deep chasm'));
ELEMS.CHASMS = [ELEM.SHALLOW_CHASM, ELEM.CHASM, ELEM.DEEP_CHASM];

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

ELEM.CLIFF = frz(parser.createElement('cliff'));
ELEM.STONE = frz(parser.createElement('stone'));
ELEM.STEEP_CLIFF = frz(parser.createElement('steep cliff'));

ELEM.SNOWY_CLIFF = frz(parser.createElement('snowy cliff'));
ELEM.STONE_SNOW = frz(parser.createElement('snow-covered stone'));
ELEM.FROZEN_STEEP_CLIFF = frz(parser.createElement('frozen steep cliff'));

ELEM.TREE = frz(parser.createElement('tree'));
ELEM.TREE_LARGE = frz(parser.createElement('large tree'));
ELEM.TREE_SNOW = frz(parser.createElement('snow-covered tree'));
ELEM.TREE_LARGE_SNOW = frz(parser.createElement('large frozen tree'));

ELEM.WINDOW = frz(parser.createElement('closed window'));

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

ELEM.SHALLOW_WATER = frz(parser.createElement('shallow water'));
ELEM.WATER = frz(parser.createElement('water'));
ELEM.DEEP_WATER = frz(parser.createElement('deep water'));
ELEMS.WATER = [ELEM.SHALLOW_WATER, ELEM.WATER, ELEM.DEEP_WATER];

ELEM.SHALLOW_FROZEN_WATER = frz(parser.createElement('frozen shallow water'));
ELEM.WATER_FROZEN = frz(parser.createElement('frozen water'));
ELEM.DEEP_FROZEN_WATER = frz(parser.createElement('frozen deep water'));
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

export function getElem(type: string|ConstBaseElem): ConstBaseElem {
    if (typeof type === 'string') {
        return ELEM_MAP.elemTypeToObj[type];
    }
    return type;
}

type TElemMap = {[key: string]: ConstBaseElem};

// These tables are used for managing melting/snowing

export const snowElemMap: TElemMap = {
    'floor': ELEM.SNOW_LIGHT,
    'light snow': ELEM.SNOW,
    'light snow with tracks': ELEM.SNOW,
    'snow': ELEM.SNOW_DEEP,
    'snow with tracks': ELEM.SNOW,
    'tree': ELEM.TREE_SNOW,
    'snow-covered tree': ELEM.TREE_SNOW,
    'shallow water': ELEM.SHALLOW_FROZEN_WATER,
    'water': ELEM.WATER_FROZEN,
    'deep water': ELEM.DEEP_FROZEN_WATER,
    'grass': ELEM.GRASS_SNOW,
    'snowy grass': ELEM.GRASS_SNOW,
    'deep snow with tracks': ELEM.SNOW_DEEP,
    'cliff': ELEM.SNOWY_CLIFF,
    'stone': ELEM.STONE_SNOW,
    'steep cliff': ELEM.FROZEN_STEEP_CLIFF,
};

export const snowMeltMap: TElemMap = {
    'light snow': ELEM.FLOOR,
    'light snow with tracks': ELEM.FLOOR,
    'snow': ELEM.SNOW_LIGHT,
    'snow with tracks': ELEM.SNOW_LIGHT,
    'snow-covered tree': ELEM.TREE,
    'frozen shallow water': ELEM.SHALLOW_WATER,
    'frozen water': ELEM.WATER,
    'frozen deep water': ELEM.DEEP_WATER,
    'snowy grass': ELEM.GRASS,
    'deep snow': ELEM.SNOW,
    'deep snow with tracks': ELEM.SNOW,
    'snowy cliff': ELEM.CLIFF,
    'snow-covered stone': ELEM.STONE,
    'frozen steep cliff': ELEM.STEEP_CLIFF
};
