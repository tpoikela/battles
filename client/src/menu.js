/* This file contains ASCII menus rendered as a monospace text over the game
 * board. */

/* Several menus are available as templates:
 *   1. Vanilla menu with no menu-specific functionality given (MenuBase)
 *   2. Menu for showing information only, has quit-option only (MenuInfoOnly)
 *   3. Menu with quit option provided (MenuWithQuit)
 *     - User must add their own selection choices
 *   4. Menu requiring a valid selection (MenuSelectRequired)
 *     - User must add their own selection choices
 *   5. Menu for selecting a cell (MenuSelectCell).
 */

/* Menus should follow these conventions:
 *   Each menu must have a select() function:
 *     select() function:
 *       return Menu.EXIT_MENU when the menu should be closed
 *       return a Menu object for nested menu
 *       return a function for action to take.
 *       Other values are invalid, and should not be returned
 *
 *   Each Menu must have getMenu(), unless showMenu() returns false.
 *
 *   Menu items for new() can be given as follows:
 *   1.
 *
 */

const RG = require('./rg');
const Keys = require('./keymap');

const {KeyMap} = Keys;

const Menu = {};
Menu.EXIT_MENU = null;
Menu.NO_ACTION = 'NO_ACTION';
Menu.NEXT_STATE = 'NEXT_STATE';

const createMenuTable = args => {
    const table = {};
    args.forEach((item, i) => {
        const index = Keys.menuIndices[i];
        if (item.key) {
            const index = Keys.codeToIndex(item.key);
            if (item.menu) {
                table[index] = item.menu;
            }
            else if (item.func) {
                table[index] = item.func;
            }
            else if (item.funcToCall) {
                table[index] = {funcToCall: item.funcToCall};
            }
        }
        else if (item.length === 2) {
            table[index] = item;
        }
        else {
            let msg = 'Each item must have 2 values: menu msg and ret val';
            msg += '\nItem can also be {key: , menu: } for nested menus';
            RG.err('menu.js', 'createMenuTable', msg);
        }
    });
    return table;
};

//------------------------------
/* Base class for all menus. */
//------------------------------
const MenuBase = function(args = []) {
    this.table = createMenuTable(args);
    this.msg = '';
    this.pre = [];
    this.post = [];

    this.parent = null; // Parent menu for this object

    this.setMsg = msg => {
        this.msg = msg;
    };

    this.showMsg = () => {
        if (this.msg.length > 0) {
            RG.gameMsg(this.msg);
        }
    };

    this.showMenu = () => true;

    this.setParent = parent => {
        this.parent = parent;
    };

    this.getParent = () => this.parent;


    this.addItem = (code, item) => {
        const index = Keys.codeToIndex(code);
        this.table[index] = item;
    };

};
Menu.Base = MenuBase;

MenuBase.prototype.getMenu = function() {
    const obj = {};
    Object.keys(this.table).forEach(index => {
        const char = Keys.menuIndices[index];
        obj[char] = this.table[index][0];
    });
    obj.pre = this.pre;
    obj.post = this.post;
    return obj;
};

MenuBase.prototype.addPost = function(item) {
    if (Array.isArray(item)) {
        this.post = this.post.concat(item);
    }
    else {
        this.post.push(item);
    }
};

MenuBase.prototype.addPre = function(item) {
    if (Array.isArray(item)) {
        this.pre = this.pre.concat(item);
    }
    else {
        this.pre.push(item);
    }
};

/* InfoOnly menu does not contain actual selection, but is intended to show
 * player crucial info they should not miss. Menu can be exited only by pressing
 * a specific key. */
const MenuInfoOnly = function() {
    MenuBase.call(this);


    this.select = code => {
        const selection = Keys.codeToIndex(code);
        if (selection === 0) {
            return Menu.EXIT_MENU;
        }
        return this;
    };
};
RG.extend2(MenuInfoOnly, MenuBase);
Menu.InfoOnly = MenuInfoOnly;

MenuInfoOnly.prototype.getMenu = function() {
    const obj = {
        0: 'Back to game.'
    };
    obj.pre = this.pre;
    obj.post = this.post;
    return obj;
};

/* This menu can be used when quit option is required. You can add a callback by
 * setting onQuit to a desired function. */
const MenuWithQuit = function(args) {
    MenuBase.call(this, args);
    const quitIndex = Keys.codeToIndex(Keys.KEY.QUIT_MENU);
    this.table[quitIndex] = ['Quit menu', Menu.EXIT_MENU];

    this.select = code => {
        const selection = Keys.codeToIndex(code);
        if (this.table.hasOwnProperty(selection)) {
            const value = this.table[selection][1];
            if (value === Menu.EXIT_MENU && this.onQuit) {
                this.onQuit();
            }
            return value;
        }
        return this;
    };

};
RG.extend2(MenuWithQuit, MenuBase);
Menu.WithQuit = MenuWithQuit;

/* This menu can be used for functionality requiring always a selection. */
const MenuSelectRequired = function(args) {
    MenuBase.call(this, args);

    this.select = code => {
        const selection = Keys.codeToIndex(code);
        if (this.table.hasOwnProperty(selection)) {
            return this.table[selection][1];
        }
        return this;
    };
};
RG.extend2(MenuSelectRequired, MenuBase);
Menu.SelectRequired = MenuSelectRequired;

/* This menu can be used when a cell needs to be selected. It does not shown a
 * menu. You should communicate with RG.gameMsg() what player needs to do with
 * this menu. */
const MenuSelectCell = function(args) {
    MenuBase.call(this, args);
    this._enableSelectAll = false;
    if (args.enableSelectAll) {
        this.enableSelectAll = args.enableSelectAll;
    }

    this.setCallback = cb => {
        this.callback = cb;
    };

    this.showMenu = () => false;

    this.enableSelectAll = () => {
        this._enableSelectAll = true;
    };


};
RG.extend2(MenuSelectCell, MenuBase);
Menu.SelectCell = MenuSelectCell;

MenuSelectCell.prototype.select = function(code) {
    if (KeyMap.inMoveCodeMap(code)) {
        this.callback(code);
        return this;
    }
    else if (KeyMap.isSelect(code)) {
        const keyIndex = Keys.codeToIndex(code);
        const retVal = this.table[keyIndex];
        if (retVal.funcToCall) {
            return retVal.funcToCall;
        }
        return retVal;
    }
    else if (this._enableSelectAll && KeyMap.isSelectAll(code)) {
        this.callback(code);
        return this;
    }
    return Menu.EXIT_MENU;
};

//---------------------------------------------------------------------------

const MenuSelectTarget = function(args) {
    MenuSelectCell.call(this, args);
    this.targetCallback = null;

};
RG.extend2(MenuSelectTarget, MenuSelectCell);

MenuSelectTarget.prototype.select = function(code) {
    const val = MenuSelectCell.prototype.select.call(this, code);
    if (val === Menu.EXIT_MENU) {
        if (KeyMap.isNextTarget(code)) {
            if (this.targetCallback) {
                this.targetCallback(code);
            }
            return this; // Keep menu open
        }
        else if (KeyMap.isPrevTarget(code)) {
            if (this.targetCallback) {
                this.targetCallback(code);
            }
            return this; // Keep menu open
        }
        else if (code === KeyMap.KEY.TARGET) {
            const keyIndex = Keys.codeToIndex(code);
            const retVal = this.table[keyIndex];
            if (retVal.funcToCall) {
                return retVal.funcToCall;
            }
            return retVal;
        }
        return Menu.EXIT_MENU;
    }
    return val;
};

/* This menu can be used when direction selection is required. */
const MenuSelectDir = function(args) {
    MenuBase.call(this, args);

    this.showMenu = () => false;

    /* Called once a valid direction is selected. Callback will receive
     * the direction as [dx, dy]. */
    this.setCallback = cb => {
        this.callback = cb;
    };

    this.select = code => {
        if (KeyMap.inMoveCodeMap(code)) {
            const dXdY = Keys.KeyMap.getDir(code);
            return this.callback.bind(null, dXdY);
        }
        return Menu.EXIT_MENU;
    };
};
Menu.SelectDir = MenuSelectDir;

//---------------------------------------------------------------------------
/* Menu which has multiple states. An example is a selection menu, which has C-D
 * bound to delete item. Thus, normally a menu is in a selection state, but then
 * user hits C-D, it goes to a deletion state. In this case, selection callback
 * is replaced by deletion callback. */
//---------------------------------------------------------------------------
const MenuWithState = function(args) {
    MenuWithQuit.call(this, args);

    // Maps key presses to transitions into new state
    this.keyToState = {};

    // Maps state to a table of options/functions
    this.stateToTable = {};

    // State-specific pre/post texts
    this.stateToPost = {};
    this.stateToPre = {};

    this.showMenu = () => true;

    // Current menu state
    this.menuState = '';

    this.select = code => {
        if (this.keyToState.hasOwnProperty(code)) {
            this.menuState = this.keyToState[code];
            return this;
        }
        else {
            const selection = Keys.codeToIndex(code);
            if (this.table.hasOwnProperty(selection)) {
                const value = this.table[selection][1];
                if (value === Menu.EXIT_MENU && this.onQuit) {
                    this.onQuit();
                }
                return value;
            }
            const menuTable = this.stateToTable[this.menuState];
            if (menuTable.hasOwnProperty(selection)) {
                const value = menuTable[selection][1];
                return value;
            }
            return this;
        }
    };

    this.addState = (state, menuArgs) => {
        this.stateToTable[state] = createMenuTable(menuArgs);
    };

    this.addTransition = (state, code) => {
        this.keyToState[code] = state;
    };
};
RG.extend2(MenuWithState, MenuWithQuit);
Menu.WithState = MenuWithState;

/* Returns the menu which should be shown. */
MenuWithState.prototype.getMenu = function() {
    const quitObj = MenuWithQuit.prototype.getMenu.call(this);
    const state = this.menuState;
    const table = this.stateToTable[state];
    let obj = {};
    Object.keys(table).forEach(index => {
        const char = Keys.menuIndices[index];
        obj[char] = table[index][0];
    });
    obj.pre = this.pre;
    obj.post = this.post;
    obj = Object.assign(obj, quitObj);
    if (this.stateToPre[state]) {
        obj.pre.push(this.stateToPre[state]);
    }
    if (this.stateToPost[state]) {
        obj.post.push(this.stateToPost[state]);
    }
    return obj;
};

MenuWithState.prototype.addPre = function(item, state) {
    if (state) {
        this.stateToPre[state] = item;
    }
    else {
        MenuWithQuit.prototype.addPre.call(this, item);
    }
};

MenuWithState.prototype.addPost = function(item, state) {
    if (state) {
        this.stateToPost[state] = item;
    }
    else {
        MenuWithQuit.prototype.addPost.call(this, item);
    }
};

module.exports = Menu;
