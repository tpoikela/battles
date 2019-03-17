/* This file contains keyboard definitions and constants, plus some conversion
 * functions between dir-vectors and direction keys. */

import RG from './rg';
import ROT from '../../lib/rot';
import {TCoord} from './interfaces';

export const Keys: any = {};

/* eslint-disable */
Keys.VK_a = ROT.VK_A + 32;
Keys.VK_b = ROT.VK_B + 32;
Keys.VK_c = ROT.VK_C + 32;
Keys.VK_d = ROT.VK_D + 32;
Keys.VK_e = ROT.VK_E + 32;
Keys.VK_f = ROT.VK_F + 32;
Keys.VK_g = ROT.VK_G + 32;
Keys.VK_h = ROT.VK_H + 32;
Keys.VK_i = ROT.VK_I + 32;
Keys.VK_j = ROT.VK_J + 32;
Keys.VK_k = ROT.VK_K + 32;
Keys.VK_l = ROT.VK_L + 32;
Keys.VK_m = ROT.VK_M + 32;
Keys.VK_n = ROT.VK_N + 32;
Keys.VK_o = ROT.VK_O + 32;
Keys.VK_p = ROT.VK_P + 32;
Keys.VK_q = ROT.VK_Q + 32;
Keys.VK_r = ROT.VK_R + 32;
Keys.VK_s = ROT.VK_S + 32;
Keys.VK_t = ROT.VK_T + 32;
Keys.VK_u = ROT.VK_U + 32;
Keys.VK_v = ROT.VK_V + 32;
Keys.VK_w = ROT.VK_W + 32;
Keys.VK_x = ROT.VK_X + 32;
Keys.VK_y = ROT.VK_Y + 32;
Keys.VK_z = ROT.VK_Z + 32;
/* eslint-enable */

Keys.VK_COMMA = 44;
Keys.VK_PERIOD = 46;
Keys.VK_LT = 60;
Keys.VK_GT = 62;

/* Lookup table object for movement and actions keys.*/
Keys.KeyMap = {

    moveKeyMap: { },

    // Start from W, go clock wise on keyboard
    initMap(): void {
        this.moveKeyMap[Keys.KEY.MOVE_N] = 0;
        this.moveKeyMap[Keys.KEY.MOVE_NE] = 1;
        this.moveKeyMap[Keys.KEY.MOVE_E] = 2;
        this.moveKeyMap[Keys.KEY.MOVE_SE] = 3;
        this.moveKeyMap[Keys.KEY.MOVE_S] = 4;
        this.moveKeyMap[Keys.KEY.MOVE_SW] = 5;
        this.moveKeyMap[Keys.KEY.MOVE_W] = 6;
        this.moveKeyMap[Keys.KEY.MOVE_NW] = 7;

        this.moveKeyMap[ROT.VK_8] = 0;
        this.moveKeyMap[ROT.VK_9] = 1;
        this.moveKeyMap[ROT.VK_6] = 2;
        this.moveKeyMap[ROT.VK_3] = 3;
        this.moveKeyMap[ROT.VK_2] = 4;
        this.moveKeyMap[ROT.VK_1] = 5;
        this.moveKeyMap[ROT.VK_4] = 6;
        this.moveKeyMap[ROT.VK_7] = 7;
    },

    inMoveCodeMap(code: number): boolean {
        return this.moveKeyMap.hasOwnProperty(code);
    },

    isRest: (code: number): boolean => (
        (code === Keys.VK_s || code === Keys.VK_PERIOD)
    ),
    isPickup: (code: number): boolean => code === Keys.KEY.PICKUP,
    isUseStairs: (code: number): boolean => (
        code === Keys.KEY.USE_STAIRS_DOWN || code === Keys.KEY.USE_STAIRS_UP
    ),
    isChat: (code: number): boolean => code === Keys.KEY.CHAT,
    isConfirmYes: (code: number): boolean => code === Keys.KEY.YES,
    isFightMode: (code: number): boolean => code === Keys.KEY.FIGHT,
    isGive: (code: number): boolean => code === Keys.KEY.GIVE,
    isGoto: (code: number): boolean => code === Keys.KEY.GOTO,
    isJump: (code: number): boolean => code === Keys.KEY.JUMP,
    isIssueOrder: (code: number): boolean => code === Keys.KEY.ORDER,
    isLook: (code: number): boolean => code === Keys.KEY.LOOK,
    isMark: (code: number): boolean => code === Keys.KEY.MARK,
    isNextItem: (code: number): boolean => code === Keys.KEY.NEXT_ITEM,
    isNextTarget: (code: number): boolean => code === Keys.KEY.NEXT,
    isPrevTarget: (code: number): boolean => code === Keys.KEY.PREV,
    isRead: (code: number): boolean => code === Keys.KEY.READ,
    isRunMode: (code: number): boolean => code === Keys.KEY.RUN,
    isSelect: (code: number): boolean => code === Keys.KEY.SELECT,
    isSelectAll: (code: number): boolean => code === Keys.KEY.SELECT_ALL,
    isTargetMode: (code: number): boolean => code === Keys.KEY.TARGET,
    isToggleDoor: (code: number): boolean => code === Keys.KEY.DOOR,
    isUsePower: (code: number): boolean => code === Keys.KEY.POWER,
    isUseAbility: (code: number): boolean => code === Keys.KEY.ABILITY,
    isMultiPurpose: (code: number): boolean => code === Keys.KEY.MULTI,

    /* Based on keycode, computes and returns a new x,y pair. If code is
     * invalid, returns null. */
    getDiff(code: number, x: number, y: number): TCoord | null {
        if (this.moveKeyMap.hasOwnProperty(code)) {
            const diff = ROT.DIRS[8][this.moveKeyMap[code]];
            const newX = x + diff[0];
            const newY = y + diff[1];
            return [newX, newY];
        }
        else if (code === Keys.VK_s) {
            return [x, y];
        }
        else {
            return null;
        }
    },

    /* Returns a direction vector for given keycode. */
    getDir(code: number): TCoord | null {
        if (this.moveKeyMap.hasOwnProperty(code)) {
            const selIndex = this.moveKeyMap[code];
            return ROT.DIRS[8][selIndex] as TCoord;
        }
        else if (this.isRest(code)) {
            return [0, 0];
        }
        return null;
    },

    /* Converts a direction vector to keycode. */
    dirToKeyCode(dXArg: number | TCoord, dYArg?: number): number {
        // Normalize first to unit vector (-1,0 or 1)
        let dX = dXArg as number;
        let dY = dYArg;
        if (Array.isArray(dXArg)) {
            dX = dXArg[0] as number;
            dY = dXArg[1];
        }
        if (dX !== 0) {dX = dX / Math.abs(dX);}
        if (dY !== 0) {dY = dY / Math.abs(dY);}

        switch (dX) {
            case -1:
                switch (dY) {
                    case -1: return Keys.KEY.MOVE_NW;
                    case 0: return Keys.KEY.MOVE_W;
                    case 1: return Keys.KEY.MOVE_SW;
                    default: RG.err('Keys.KeyMap', 'dirToKeyCode',
                        `Dir ${dX},${dY} not supported`);
                }
                break;
            case 0:
                switch (dY) {
                    case -1: return Keys.KEY.MOVE_N;
                    case 0: return Keys.KEY.REST;
                    case 1: return Keys.KEY.MOVE_S;
                    default: RG.err('Keys.KeyMap', 'dirToKeyCode',
                        `Dir ${dX},${dY} not supported`);
                }
                break;
            case 1:
                switch (dY) {
                    case -1: return Keys.KEY.MOVE_NE;
                    case 0: return Keys.KEY.MOVE_E;
                    case 1: return Keys.KEY.MOVE_SE;
                    default: RG.err('Keys.KeyMap', 'dirToKeyCode',
                        `Dir ${dX},${dY} not supported`);
                }
                break;
            default: RG.err('Keys.KeyMap', 'dirToKeyCode',
                `Dir ${dX},${dY} not supported`);
        }
        return null;
    },

    keyCodeToCardinalDir(code: number): string {
        switch (code) {
            case Keys.KEY.MOVE_NW: return 'NW';
            case Keys.KEY.MOVE_W: return 'W';
            case Keys.KEY.MOVE_SW: return 'SW';
            case Keys.KEY.MOVE_N: return 'N';
            case Keys.KEY.REST: return 'REST';
            case Keys.KEY.MOVE_S: return 'S';
            case Keys.KEY.MOVE_NE: return 'NE';
            case Keys.KEY.MOVE_E: return 'E';
            case Keys.KEY.MOVE_SE: return 'SE';
            default: return '';
        }
    }

};

Keys.menuIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'a', 'b', 'c', 'd', 'e', 'f',
    'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
    'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I',
    'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X',
    'Y', 'Z'
];
Keys.EXIT_INDEX = Keys.menuIndices.indexOf('Q');

/* Given key code, returns the corresponding character in menu indices. */
Keys.codeToMenuChar = (code: number): string | number => {
    const index = Keys.codeToIndex(code);
    return Keys.menuIndices[index];
};

const reCharLC = /[a-z]/;
const reCharUC = /[A-Z]/;

/* Convert a selection index into a keycode. For example, if user presses 'a',
 * this function should return keycode for a, ie Keys.VK_a. */
Keys.selectIndexToCode = (indexChar: string | number): number => {
    const arrayIndex = Keys.menuIndices.findIndex(val => val === indexChar);
    if (arrayIndex >= 0) {
        if (arrayIndex >= 0 && arrayIndex <= 9) {
            return ROT.VK_0 + arrayIndex;
        }
        else if (reCharLC.test(indexChar as string)) {
            const addToCode = arrayIndex - Keys.menuIndices.indexOf('a');
            return Keys.VK_a + addToCode;
        }
        else if (reCharUC.test(indexChar as string)) {
            const addToCode = arrayIndex - Keys.menuIndices.indexOf('A');
            return ROT.VK_A + addToCode;
        }
    }
    RG.err('RG', 'selectIndexToCode',
        `Invalid select index |${indexChar}|`);
    return -1;

};

/* Converts the keycode into a selection index starting from 0. */
Keys.codeToIndex = (code: number): number => {
    if (code >= ROT.VK_0 && code <= ROT.VK_9) {
        return code - ROT.VK_0;
    }
    else if (code >= Keys.VK_a && code <= Keys.VK_z) {
        return code - Keys.VK_a + Keys.menuIndices.indexOf('a');
    }
    else if (code >= ROT.VK_A && code <= ROT.VK_Z) {
        return code - ROT.VK_A + Keys.menuIndices.indexOf('A');
    }
    return -1;
};

/* Returns true if keyCode corresponds to a numeric key. */
Keys.isNumeric = (keyCode: number): boolean => {
    return keyCode >= ROT.VK_0 && keyCode <= ROT.VK_9;
};

Keys.KEY = {};

// Assign ROT keys to meaningful constants
Keys.KEY.MOVE_N = ROT.VK_W + 32;
Keys.KEY.MOVE_NE = ROT.VK_E + 32;
Keys.KEY.MOVE_E = ROT.VK_D + 32;
Keys.KEY.MOVE_SE = ROT.VK_C + 32;
Keys.KEY.MOVE_S = ROT.VK_X + 32;
Keys.KEY.MOVE_SW = ROT.VK_Z + 32;
Keys.KEY.MOVE_W = ROT.VK_A + 32;
Keys.KEY.MOVE_NW = ROT.VK_Q + 32;

Keys.KEY.ABILITY = Keys.VK_k;
Keys.KEY.CHAT = ROT.VK_C;
Keys.KEY.DELETE = ROT.VK_D;
Keys.KEY.DOOR = ROT.VK_O + 32;
Keys.KEY.FIGHT = ROT.VK_F + 32;
Keys.KEY.GIVE = ROT.VK_G;
Keys.KEY.GOTO = Keys.VK_g;
Keys.KEY.JUMP = Keys.VK_j;
Keys.KEY.LOOK = ROT.VK_L + 32;
Keys.KEY.MARK = Keys.VK_b;
Keys.KEY.MULTI = ROT.VK_SPACE;
Keys.KEY.NEXT = Keys.VK_n;
Keys.KEY.NEXT_ITEM = ROT.VK_H + 32;
Keys.KEY.ORDER = ROT.VK_O;
Keys.KEY.PICKUP = Keys.VK_COMMA;
Keys.KEY.POWER = ROT.VK_P + 32;
Keys.KEY.PREV = ROT.VK_P + 32;
Keys.KEY.QUIT_MENU = Keys.VK_q;
Keys.KEY.READ = ROT.VK_R;
Keys.KEY.REST = ROT.VK_S + 32;
Keys.KEY.RUN = ROT.VK_R + 32;
Keys.KEY.SELECT = Keys.VK_s;
Keys.KEY.SELECT_ALL = ROT.VK_A;
Keys.KEY.TARGET = Keys.VK_t;
Keys.KEY.USE_ABILITY = Keys.VK_k;
Keys.KEY.USE_STAIRS_DOWN = Keys.VK_GT;
Keys.KEY.USE_STAIRS_UP = Keys.VK_LT;
Keys.KEY.YES = ROT.VK_Y + 32;
Keys.KeyMap.initMap();

Keys.KEY.NO_ACTION = ROT.VK_CAPS_LOCK;

// Used in the GUI only
Keys.GUI = {};
Keys.GUI.CharInfo = ROT.VK_I;
Keys.GUI.Goto = Keys.KEY.GOTO;
Keys.GUI.Help = ROT.VK_H;
Keys.GUI.Inv = Keys.VK_i;
Keys.GUI.Look = Keys.VK_l;
Keys.GUI.Map = Keys.VK_m;
Keys.GUI.OwMap = ROT.VK_M;
Keys.GUI.Use = Keys.VK_u;

Keys.isValidKey = (keyCode: number): boolean => {
    let found = false;
    Object.keys(Keys.KEY).forEach(key => {
        found = found || Keys.KEY[key] === keyCode;
    });
    found = found || Keys.KeyMap.inMoveCodeMap(keyCode);
    return found;
};

/* Given keycode, returns the valid char for that key. */
Keys.getChar = (keyCode: number): string => {
    return '`' + String.fromCharCode(keyCode) + '`';
};
