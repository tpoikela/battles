
/* This file contains keyboard definitions and constants, plus some conversion
 * functions between dir-vectors and direction keys. */

const ROT = require('../../lib/rot.js');

const RG = {
    err: function(obj, fun, msg) {
        const formattedMsg = `[ERROR]: ${obj} ${fun} -> |${msg}|`;
        console.error(formattedMsg);
        throw new Error(formattedMsg);
    }
};

/* eslint-disable */
RG.VK_a = ROT.VK_A + 32;
RG.VK_b = ROT.VK_B + 32;
RG.VK_c = ROT.VK_C + 32;
RG.VK_d = ROT.VK_D + 32;
RG.VK_e = ROT.VK_E + 32;
RG.VK_f = ROT.VK_F + 32;
RG.VK_g = ROT.VK_G + 32;
RG.VK_h = ROT.VK_H + 32;
RG.VK_i = ROT.VK_I + 32;
RG.VK_j = ROT.VK_J + 32;
RG.VK_k = ROT.VK_K + 32;
RG.VK_l = ROT.VK_L + 32;
RG.VK_m = ROT.VK_M + 32;
RG.VK_n = ROT.VK_N + 32;
RG.VK_o = ROT.VK_O + 32;
RG.VK_p = ROT.VK_P + 32;
RG.VK_q = ROT.VK_Q + 32;
RG.VK_r = ROT.VK_R + 32;
RG.VK_s = ROT.VK_S + 32;
RG.VK_t = ROT.VK_T + 32;
RG.VK_u = ROT.VK_U + 32;
RG.VK_v = ROT.VK_V + 32;
RG.VK_w = ROT.VK_W + 32;
RG.VK_x = ROT.VK_X + 32;
RG.VK_y = ROT.VK_Y + 32;
RG.VK_z = ROT.VK_Z + 32;
/* eslint-enable */

RG.VK_COMMA = 44;
RG.VK_PERIOD = 46;
RG.VK_LT = 60;
RG.VK_GT = 62;

/* Lookup table object for movement and actions keys.*/
RG.KeyMap = {

    moveKeyMap: { },

    // Start from W, go clock wise on keyboard
    initMap: function() {
        this.moveKeyMap[RG.KEY.MOVE_N] = 0;
        this.moveKeyMap[RG.KEY.MOVE_NE] = 1;
        this.moveKeyMap[RG.KEY.MOVE_E] = 2;
        this.moveKeyMap[RG.KEY.MOVE_SE] = 3;
        this.moveKeyMap[RG.KEY.MOVE_S] = 4;
        this.moveKeyMap[RG.KEY.MOVE_SW] = 5;
        this.moveKeyMap[RG.KEY.MOVE_W] = 6;
        this.moveKeyMap[RG.KEY.MOVE_NW] = 7;

        this.moveKeyMap[ROT.VK_8] = 0;
        this.moveKeyMap[ROT.VK_9] = 1;
        this.moveKeyMap[ROT.VK_6] = 2;
        this.moveKeyMap[ROT.VK_3] = 3;
        this.moveKeyMap[ROT.VK_2] = 4;
        this.moveKeyMap[ROT.VK_1] = 5;
        this.moveKeyMap[ROT.VK_4] = 6;
        this.moveKeyMap[ROT.VK_7] = 7;
    },

    inMoveCodeMap: function(code) {
        return this.moveKeyMap.hasOwnProperty(code);
    },

    isRest: function(code) {return code === RG.VK_s || code === RG.VK_PERIOD;},
    isPickup: function(code) {return code === RG.KEY.PICKUP;},
    isUseStairs: function(code) {
        return code === RG.KEY.USE_STAIRS_DOWN ||
            code === RG.KEY.USE_STAIRS_UP;
    },
    isRunMode: function(code) {return code === RG.KEY.RUN;},
    isFightMode: function(code) {return code === RG.KEY.FIGHT;},
    isConfirmYes: function(code) {return code === RG.KEY.YES;},
    isNextItem: function(code) {return code === RG.KEY.NEXT_ITEM;},
    isToggleDoor: function(code) {return code === RG.KEY.DOOR;},
    isLook: function(code) {return code === RG.KEY.LOOK;},
    isUsePower: function(code) {return code === RG.KEY.POWER;},
    isTargetMode: function(code) {return code === RG.KEY.TARGET;},
    isNextTarget: function(code) {return code === RG.KEY.NEXT;},
    isChat: function(code) {return code === RG.KEY.CHAT;},
    isIssueOrder: function(code) {return code === RG.KEY.ORDER;},
    isSelect: function(code) {return code === RG.KEY.SELECT;},

    /* Based on keycode, computes and returns a new x,y pair. If code is
     * invalid, returns null. */
    getDiff: function(code, x, y) {
        if (this.moveKeyMap.hasOwnProperty(code)) {
            const diff = ROT.DIRS[8][this.moveKeyMap[code]];
            const newX = x + diff[0];
            const newY = y + diff[1];
            return [newX, newY];
        }
        else if (code === RG.VK_s) {
            return [x, y];
        }
        else {
            return null;
        }
    },

    /* Returns a direction vector for given keycode. */
    getDir: function(code) {
        if (this.moveKeyMap.hasOwnProperty(code)) {
            return ROT.DIRS[8][this.moveKeyMap[code]];
        }
        else if (this.isRest(code)) {
            return [0, 0];
        }
        return null;
    },

    /* Converts a direction vector to keycode. */
    dirToKeyCode: function(dXArg, dYArg) {
        // Normalize first to unit vector (-1,0 or 1)
        let dX = dXArg;
        let dY = dYArg;
        if (dX !== 0) {dX = dX / Math.abs(dX);}
        if (dY !== 0) {dY = dY / Math.abs(dY);}
        switch (dX) {
            case -1:
                switch (dY) {
                    case -1: return RG.KEY.MOVE_NW;
                    case 0: return RG.KEY.MOVE_W;
                    case 1: return RG.KEY.MOVE_SW;
                    default: RG.err('RG.KeyMap', 'dirToKeyCode',
                        `Dir ${dX},${dY} not supported`);
                }
                break;
            case 0:
                switch (dY) {
                    case -1: return RG.KEY.MOVE_N;
                    case 0: return RG.KEY.REST;
                    case 1: return RG.KEY.MOVE_S;
                    default: RG.err('RG.KeyMap', 'dirToKeyCode',
                        `Dir ${dX},${dY} not supported`);
                }
                break;
            case 1:
                switch (dY) {
                    case -1: return RG.KEY.MOVE_NE;
                    case 0: return RG.KEY.MOVE_E;
                    case 1: return RG.KEY.MOVE_SE;
                    default: RG.err('RG.KeyMap', 'dirToKeyCode',
                        `Dir ${dX},${dY} not supported`);
                }
                break;
            default: RG.err('RG.KeyMap', 'dirToKeyCode',
                `Dir ${dX},${dY} not supported`);
        }
        return null;
    },

    keyCodeToCardinalDir: function(code) {
        switch (code) {
            case RG.KEY.MOVE_NW: return 'NW';
            case RG.KEY.MOVE_W: return 'W';
            case RG.KEY.MOVE_SW: return 'SW';
            case RG.KEY.MOVE_N: return 'N';
            case RG.KEY.REST: return 'REST';
            case RG.KEY.MOVE_S: return 'S';
            case RG.KEY.MOVE_NE: return 'NE';
            case RG.KEY.MOVE_E: return 'E';
            case RG.KEY.MOVE_SE: return 'SE';
            default: return '';
        }
    }

};

RG.menuIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'a', 'b', 'c', 'd', 'e', 'f',
    'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
    'u', 'v', 'w', 'x', 'y', 'z'
];

/* Given key code, returns the corresponding character in menu indices. */
RG.codeToMenuChar = code => {
    const index = RG.codeToIndex(code);
    return RG.menuIndices[index];
};

/* Convert a selection index into a keycode. For example, if user presses 'a',
 * this function should return keycode for a, ie RG.VK_a. */
RG.selectIndexToCode = indexChar => {
    const arrayIndex = RG.menuIndices.findIndex(val => val === indexChar);
    if (arrayIndex >= 0) {
        if (arrayIndex >= 0 && arrayIndex <= 9) {
            return ROT.VK_0 + arrayIndex;
        }
        else {
            const addToCode = arrayIndex - 10; // Offset in menuIndices
            return RG.VK_a + addToCode;
        }
    }
    RG.err('RG', 'selectIndexToCode',
        `Inv. select index |${indexChar}|`);
    return -1;

};

/* Converts the keycode into a selection index starting from 0. */
RG.codeToIndex = code => {
    if (code >= ROT.VK_0 && code <= ROT.VK_9) {
        return code - ROT.VK_0;
    }
    else if (code >= RG.VK_a && code <= RG.VK_z) {
        return code - RG.VK_a + 10;
    }
    return -1;
};

RG.KEY = {};

// Assign ROT keys to meaningful constants
RG.KEY.MOVE_N = ROT.VK_W + 32;
RG.KEY.MOVE_NE = ROT.VK_E + 32;
RG.KEY.MOVE_E = ROT.VK_D + 32;
RG.KEY.MOVE_SE = ROT.VK_C + 32;
RG.KEY.MOVE_S = ROT.VK_X + 32;
RG.KEY.MOVE_SW = ROT.VK_Z + 32;
RG.KEY.MOVE_W = ROT.VK_A + 32;
RG.KEY.MOVE_NW = ROT.VK_Q + 32;

RG.KEY.CHAT = ROT.VK_C;
RG.KEY.DOOR = ROT.VK_O + 32;
RG.KEY.FIGHT = ROT.VK_F + 32;
RG.KEY.LOOK = ROT.VK_L + 32;
RG.KEY.NEXT = RG.VK_n;
RG.KEY.NEXT_ITEM = ROT.VK_H + 32;
RG.KEY.ORDER = ROT.VK_O;
RG.KEY.PICKUP = RG.VK_COMMA;
RG.KEY.POWER = ROT.VK_P + 32;
RG.KEY.QUIT_MENU = RG.VK_q;
RG.KEY.REST = ROT.VK_S + 32;
RG.KEY.RUN = ROT.VK_R + 32;
RG.KEY.SELECT = RG.VK_s;
RG.KEY.TARGET = RG.VK_t;
RG.KEY.USE_STAIRS_DOWN = RG.VK_GT;
RG.KEY.USE_STAIRS_UP = RG.VK_LT;
RG.KEY.YES = ROT.VK_Y + 32;
RG.KeyMap.initMap();

RG.isValidKey = keyCode => {
    let found = false;
    Object.keys(RG.KEY).forEach(key => {
        found = found || RG.KEY[key] === keyCode;
    });
    found = found || RG.KeyMap.inMoveCodeMap(keyCode);
    return found;
};

module.exports = RG;
