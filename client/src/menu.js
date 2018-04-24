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
 */

const RG = require('./rg');
const Keys = require('./keymap');

const {KeyMap} = Keys;

const Menu = {};
Menu.EXIT_MENU = null;

//------------------------------
/* Base class for all menus. */
//------------------------------
const MenuBase = function(args = []) {
    this.table = {};
    this.msg = '';
    this.pre = [];
    this.post = [];

    this.parent = null; // Parent menu for this object

    args.forEach((item, i) => {
        const index = Keys.menuIndices[i];
        if (item.key) {
            const index = Keys.codeToIndex(item.key);
            if (item.menu) {
                this.table[index] = item.menu;
            }
            else if (item.func) {
                this.table[index] = item.func;
            }
            else if (item.funcToCall) {
                this.table[index] = {funcToCall: item.funcToCall};
            }
        }
        else if (item.length === 2) {
            this.table[index] = item;
        }
        else {
            let msg = 'Each item must have 2 values: menu msg and ret val';
            msg += '\nItem can also be {key: , menu: } for nested menus';
            RG.err('MenuBase', 'constructor', msg);
        }
    });

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

    this.getMenu = () => {
        const obj = {};
        Object.keys(this.table).forEach(index => {
            const char = Keys.menuIndices[index];
            obj[char] = this.table[index][0];
        });
        obj.pre = this.pre;
        obj.post = this.post;
        return obj;
    };

    this.addPost = item => {
        if (Array.isArray(item)) {
            this.post = this.post.concat(item);
        }
        else {
            this.post.push(item);
        }
    };

    this.addPre = item => {
        if (Array.isArray(item)) {
            this.pre = this.pre.concat(item);
        }
        else {
            this.pre.push(item);
        }
    };

};
Menu.Base = MenuBase;

/* InfoOnly menu does not contain actual selection, but is intended to show
 * player crucial info they should not miss. Menu can be exited only by pressing
 * a specific key. */
const MenuInfoOnly = function() {
    MenuBase.call(this);

    this.getMenu = () => {
        const obj = {
            0: 'Back to game.'
        };
        obj.pre = this.pre;
        obj.post = this.post;
        return obj;
    };

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

    this.select = code => {
        if (KeyMap.inMoveCodeMap(code)) {
            this.callback(code);
            return this;
        }
        else if (KeyMap.isSelect(code)) {
            const keyIndex = Keys.codeToIndex(code);
            return this.table[keyIndex];
        }
        else if (this._enableSelectAll && KeyMap.isSelectAll(code)) {
            this.callback(code);
            return this;
        }
        return null;
    };

};
RG.extend2(MenuSelectCell, MenuBase);
Menu.SelectCell = MenuSelectCell;

module.exports = Menu;
