/* This file contains keyboard definitions and constants, plus some conversion
 * functions between dir-vectors and direction keys. */

import RG from './rg';
import {DIRS, KEYS} from '../../lib/rot-js/constants';
import {TCoord} from './interfaces';

const ROT: any = {KEYS, DIRS};


/* Lookup table object for movement and actions keys.*/
class KeyMap {
    public moveKeyMap: {[key: string]: any};

    constructor() {
        this.moveKeyMap = {};
    }

    // Start from W, go clock wise on keyboard
    public initMap(): void {
        this.moveKeyMap[Keys.KEY.MOVE_N] = 0;
        this.moveKeyMap[Keys.KEY.MOVE_NE] = 1;
        this.moveKeyMap[Keys.KEY.MOVE_E] = 2;
        this.moveKeyMap[Keys.KEY.MOVE_SE] = 3;
        this.moveKeyMap[Keys.KEY.MOVE_S] = 4;
        this.moveKeyMap[Keys.KEY.MOVE_SW] = 5;
        this.moveKeyMap[Keys.KEY.MOVE_W] = 6;
        this.moveKeyMap[Keys.KEY.MOVE_NW] = 7;

        this.moveKeyMap[ROT.KEYS.VK_8] = 0;
        this.moveKeyMap[ROT.KEYS.VK_9] = 1;
        this.moveKeyMap[ROT.KEYS.VK_6] = 2;
        this.moveKeyMap[ROT.KEYS.VK_3] = 3;
        this.moveKeyMap[ROT.KEYS.VK_2] = 4;
        this.moveKeyMap[ROT.KEYS.VK_1] = 5;
        this.moveKeyMap[ROT.KEYS.VK_4] = 6;
        this.moveKeyMap[ROT.KEYS.VK_7] = 7;
    }

    public inMoveCodeMap(code: number): boolean {
        return this.moveKeyMap.hasOwnProperty(code);
    }

    public isRest(code: number): boolean {
        return (code === Keys.VK.s || code === Keys.VK.PERIOD);
    }
    public isPickup(code: number): boolean {
        return code === Keys.KEY.PICKUP;
    }
    public isUseStairs(code: number): boolean {
        return (
        code === Keys.KEY.USE_STAIRS_DOWN || code === Keys.KEY.USE_STAIRS_UP
        );
    }

    public isChat(code: number): boolean {
        return code === Keys.KEY.CHAT;
    }
    public isConfirmYes(code: number): boolean {
        return code === Keys.KEY.YES;
    }
    public isConfirmNo(code: number): boolean {
        return code === Keys.KEY.NO;
    }
    public isFightMode(code: number): boolean {
        return code === Keys.KEY.FIGHT;
    }
    public isGive(code: number): boolean {
        return code === Keys.KEY.GIVE;
    }
    public isGoto(code: number): boolean {
        return code === Keys.KEY.GOTO;
    }
    public isJump(code: number): boolean {
        return code === Keys.KEY.JUMP;
    }
    public isIssueOrder(code: number): boolean {
        return code === Keys.KEY.ORDER;
    }
    public isLook(code: number): boolean {
        return code === Keys.KEY.LOOK;
    }
    public isMark(code: number): boolean {
        return code === Keys.KEY.MARK;
    }
    public isNextItem(code: number): boolean {
        return code === Keys.KEY.NEXT_ITEM;
    }
    public isNextTarget(code: number): boolean {
        return code === Keys.KEY.NEXT;
    }
    public isPrevTarget(code: number): boolean {
        return code === Keys.KEY.PREV;
    }
    public isRead(code: number): boolean {
        return code === Keys.KEY.READ;
    }
    public isRunMode(code: number): boolean {
        return code === Keys.KEY.RUN;
    }
    public isSelect(code: number): boolean {
        return code === Keys.KEY.SELECT;
    }
    public isSelectAll(code: number): boolean {
        return code === Keys.KEY.SELECT_ALL;
    }
    public isTargetMode(code: number): boolean {
        return code === Keys.KEY.TARGET;
    }
    public isToggleDoor(code: number): boolean {
        return code === Keys.KEY.DOOR;
    }
    public isUsePower(code: number): boolean {
        return code === Keys.KEY.POWER;
    }
    public isUseAbility(code: number): boolean {
        return code === Keys.KEY.ABILITY;
    }
    public isMultiPurpose(code: number): boolean {
        return code === Keys.KEY.MULTI;
    }

    /* Based on keycode, computes and returns a new x,y pair. If code is
     * invalid, returns null. */
    public getDiff(code: number, x: number, y: number): TCoord | null {
        if (this.moveKeyMap.hasOwnProperty(code)) {
            const diff = ROT.DIRS[8][this.moveKeyMap[code]];
            const newX = x + diff[0];
            const newY = y + diff[1];
            return [newX, newY];
        }
        else if (code === Keys.VK.s) {
            return [x, y];
        }
        else {
            return null;
        }
    }

    /* Returns a direction vector for given keycode. */
    public getDir(code: number): TCoord | null {
        if (this.moveKeyMap.hasOwnProperty(code)) {
            const selIndex = this.moveKeyMap[code];
            return ROT.DIRS[8][selIndex] as TCoord;
        }
        else if (this.isRest(code)) {
            return [0, 0];
        }
        return null;
    }

    /* Converts a direction vector to keycode. */
    public dirToKeyCode(dXArg: number | TCoord, dYArg?: number): number | null {
        // Normalize first to unit vector (-1,0 or 1)
        let dX = dXArg as number;
        let dY = dYArg;
        if (Array.isArray(dXArg)) {
            dX = dXArg[0] as number;
            dY = dXArg[1];
        }
        if (dX !== 0) {dX = dX / Math.abs(dX);}
        if (dY !== 0) {dY = dY! / Math.abs(dY!);}

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
    }

    public keyCodeToCardinalDir(code: number): string {
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

}

export class Keys {
    public static INVALID_KEY: number;

    public static KeyMap: KeyMap;
    public static VK: {[key: string]: number};
    public static KEY: {[key: string]: number};
    public static GUI: {[key: string]: number};
    public static menuIndices: (string | number)[];
    public static EXIT_INDEX: number;
    //[key: string]: any;

    public static codeToMenuChar: (code: number) => string | number;
    public static selectIndexToCode: (indexChar: string | number) => number;

    public static codeToIndex: (code: number) => number;

    public static isNumeric: (keyCode: number) => boolean;
    public static isValidKey: (keyCode: number) => boolean;
    public static getChar: (keyCode: number) => string;
}
Keys.KeyMap = new KeyMap();

Keys.VK = {};


Keys.INVALID_KEY = -1;
/* eslint-disable */
Keys.VK.a = ROT.KEYS.VK_A + 32;
Keys.VK.b = ROT.KEYS.VK_B + 32;
Keys.VK.c = ROT.KEYS.VK_C + 32;
Keys.VK.d = ROT.KEYS.VK_D + 32;
Keys.VK.e = ROT.KEYS.VK_E + 32;
Keys.VK.f = ROT.KEYS.VK_F + 32;
Keys.VK.g = ROT.KEYS.VK_G + 32;
Keys.VK.h = ROT.KEYS.VK_H + 32;
Keys.VK.i = ROT.KEYS.VK_I + 32;
Keys.VK.j = ROT.KEYS.VK_J + 32;
Keys.VK.k = ROT.KEYS.VK_K + 32;
Keys.VK.l = ROT.KEYS.VK_L + 32;
Keys.VK.m = ROT.KEYS.VK_M + 32;
Keys.VK.n = ROT.KEYS.VK_N + 32;
Keys.VK.o = ROT.KEYS.VK_O + 32;
Keys.VK.p = ROT.KEYS.VK_P + 32;
Keys.VK.q = ROT.KEYS.VK_Q + 32;
Keys.VK.r = ROT.KEYS.VK_R + 32;
Keys.VK.s = ROT.KEYS.VK_S + 32;
Keys.VK.t = ROT.KEYS.VK_T + 32;
Keys.VK.u = ROT.KEYS.VK_U + 32;
Keys.VK.v = ROT.KEYS.VK_V + 32;
Keys.VK.w = ROT.KEYS.VK_W + 32;
Keys.VK.x = ROT.KEYS.VK_X + 32;
Keys.VK.y = ROT.KEYS.VK_Y + 32;
Keys.VK.z = ROT.KEYS.VK_Z + 32;

Keys.VK.A = ROT.KEYS.VK_A;
Keys.VK.B = ROT.KEYS.VK_B;
Keys.VK.C = ROT.KEYS.VK_C;
Keys.VK.D = ROT.KEYS.VK_D;
Keys.VK.E = ROT.KEYS.VK_E;
Keys.VK.F = ROT.KEYS.VK_F;
Keys.VK.G = ROT.KEYS.VK_G;
Keys.VK.H = ROT.KEYS.VK_H;
Keys.VK.I = ROT.KEYS.VK_I;
Keys.VK.J = ROT.KEYS.VK_J;
Keys.VK.K = ROT.KEYS.VK_K;
Keys.VK.L = ROT.KEYS.VK_L;
Keys.VK.M = ROT.KEYS.VK_M;
Keys.VK.N = ROT.KEYS.VK_N;
Keys.VK.O = ROT.KEYS.VK_O;
Keys.VK.P = ROT.KEYS.VK_P;
Keys.VK.Q = ROT.KEYS.VK_Q;
Keys.VK.R = ROT.KEYS.VK_R;
Keys.VK.S = ROT.KEYS.VK_S;
Keys.VK.T = ROT.KEYS.VK_T;
Keys.VK.U = ROT.KEYS.VK_U;
Keys.VK.V = ROT.KEYS.VK_V;
Keys.VK.W = ROT.KEYS.VK_W;
Keys.VK.X = ROT.KEYS.VK_X;
Keys.VK.Y = ROT.KEYS.VK_Y;
Keys.VK.Z = ROT.KEYS.VK_Z;
/* eslint-enable */

Keys.VK.COMMA = 44;
Keys.VK.PERIOD = 46;
Keys.VK.LT = 60;
Keys.VK.GT = 62;

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
 * this function should return keycode for a, ie Keys.VK.a. */
Keys.selectIndexToCode = (indexChar: string | number): number => {
    const arrayIndex = Keys.menuIndices.findIndex(val => val === indexChar);
    if (arrayIndex >= 0) {
        if (arrayIndex >= 0 && arrayIndex <= 9) {
            return ROT.KEYS.VK_0 + arrayIndex;
        }
        else if (reCharLC.test(indexChar as string)) {
            const addToCode = arrayIndex - Keys.menuIndices.indexOf('a');
            return Keys.VK.a + addToCode;
        }
        else if (reCharUC.test(indexChar as string)) {
            const addToCode = arrayIndex - Keys.menuIndices.indexOf('A');
            return ROT.KEYS.VK_A + addToCode;
        }
    }
    RG.err('RG', 'selectIndexToCode',
        `Invalid select index |${indexChar}|`);
    return Keys.INVALID_KEY;

};

/* Converts the keycode into a selection index starting from 0. */
Keys.codeToIndex = (code: number): number => {
    if (code >= ROT.KEYS.VK_0 && code <= ROT.KEYS.VK_9) {
        return code - ROT.KEYS.VK_0;
    }
    else if (code >= Keys.VK.a && code <= Keys.VK.z) {
        return code - Keys.VK.a + Keys.menuIndices.indexOf('a');
    }
    else if (code >= ROT.KEYS.VK_A && code <= ROT.KEYS.VK_Z) {
        return code - ROT.KEYS.VK_A + Keys.menuIndices.indexOf('A');
    }
    return Keys.INVALID_KEY;
};

/* Returns true if keyCode corresponds to a numeric key. */
Keys.isNumeric = (keyCode: number): boolean => {
    return keyCode >= ROT.KEYS.VK_0 && keyCode <= ROT.KEYS.VK_9;
};

Keys.KEY = {};

// Assign ROT keys to meaningful constants
Keys.KEY.MOVE_N = ROT.KEYS.VK_W + 32;
Keys.KEY.MOVE_NE = ROT.KEYS.VK_E + 32;
Keys.KEY.MOVE_E = ROT.KEYS.VK_D + 32;
Keys.KEY.MOVE_SE = ROT.KEYS.VK_C + 32;
Keys.KEY.MOVE_S = ROT.KEYS.VK_X + 32;
Keys.KEY.MOVE_SW = ROT.KEYS.VK_Z + 32;
Keys.KEY.MOVE_W = ROT.KEYS.VK_A + 32;
Keys.KEY.MOVE_NW = ROT.KEYS.VK_Q + 32;

Keys.KEY.ABILITY = Keys.VK.k;
Keys.KEY.CHAT = ROT.KEYS.VK_C;
Keys.KEY.DELETE = ROT.KEYS.VK_D;
Keys.KEY.DOOR = ROT.KEYS.VK_O + 32;
Keys.KEY.FIGHT = ROT.KEYS.VK_F + 32;
Keys.KEY.GIVE = ROT.KEYS.VK_G;
Keys.KEY.GOTO = Keys.VK.g;
Keys.KEY.JUMP = Keys.VK.j;
Keys.KEY.LOOK = ROT.KEYS.VK_L + 32;
Keys.KEY.MARK = Keys.VK.b;
Keys.KEY.MULTI = ROT.KEYS.VK_SPACE;
Keys.KEY.NEXT = Keys.VK.n;
Keys.KEY.NEXT_ITEM = ROT.KEYS.VK_H + 32;
Keys.KEY.ORDER = ROT.KEYS.VK_O;
Keys.KEY.PICKUP = Keys.VK.COMMA;
Keys.KEY.POWER = ROT.KEYS.VK_P + 32;
Keys.KEY.PREV = ROT.KEYS.VK_P + 32;
Keys.KEY.QUIT_MENU = Keys.VK.q;
Keys.KEY.READ = ROT.KEYS.VK_R;
Keys.KEY.REST = ROT.KEYS.VK_S + 32;
Keys.KEY.RUN = ROT.KEYS.VK_R + 32;
Keys.KEY.SELECT = Keys.VK.s;
Keys.KEY.SELECT_ALL = ROT.KEYS.VK_A;
Keys.KEY.TARGET = Keys.VK.t;
Keys.KEY.USE_ABILITY = Keys.VK.k;
Keys.KEY.USE_STAIRS_DOWN = Keys.VK.GT;
Keys.KEY.USE_STAIRS_UP = Keys.VK.LT;
Keys.KEY.YES = Keys.VK.y;
Keys.KEY.NO = Keys.VK.n;
Keys.KeyMap.initMap();

Keys.KEY.NO_ACTION = ROT.KEYS.VK_CAPS_LOCK;

// Used in the GUI only
Keys.GUI = {};
Keys.GUI.CharInfo = ROT.KEYS.VK_I;
Keys.GUI.Goto = Keys.KEY.GOTO;
Keys.GUI.Help = ROT.KEYS.VK_H;
Keys.GUI.Help2 = ROT.KEYS.VK_QUESTION_MARK;
Keys.GUI.Inv = Keys.VK.i;
Keys.GUI.Look = Keys.VK.l;
Keys.GUI.Map = Keys.VK.m;
Keys.GUI.OwMap = ROT.KEYS.VK_M;
Keys.GUI.Use = Keys.VK.u;
Keys.GUI.Craft = Keys.VK.K;
Keys.GUI.Shop = Keys.VK.S;

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
