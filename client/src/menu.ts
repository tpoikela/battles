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

import RG from './rg';
import {Keys} from './keymap';

const {KeyMap} = Keys;

export const Menu: any = {};
Menu.EXIT_MENU = null;
Menu.NO_ACTION = 'NO_ACTION';
Menu.NEXT_STATE = 'NEXT_STATE';

type SelectionFunc = () => void;

export interface SelectionObject {
    showMenu: () => boolean;
    getMenu?: () => any;
    select: (code: number) => SelectionObject | SelectionFunc | null
    showMsg?: () => void;
    funcToCall?: () => void;
}


type VoidFunc = () => void;
interface MenuCallObj {
    funcToCall: VoidFunc;
}
type MenuItem = MenuBase | VoidFunc | [string, any] | MenuCallObj;

interface MenuTable {
    [key: string]: MenuItem;
}

const createMenuTable = function(args): MenuTable {
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

Menu.isSelectionDone = function(selection) {
    return typeof selection === 'function';
};

Menu.isMenuItem = function(selection) {
    return selection && typeof selection === 'object';
};

//------------------------------
/* Base class for all menus. */
//------------------------------
export class MenuBase {

    public name: string;
    public msg: string;
    public pre: string[];
    public post: string[];
    public parent: MenuBase | null;
    public table: MenuTable;
    protected _showMenu: boolean;
    public callback: (any) => void;

    constructor(args = []) {
        this.table = createMenuTable(args);
        this.msg = '';
        this.pre = [];
        this.post = [];
        this._showMenu = true;

        this.parent = null; // Parent menu for this object


    }

    setName(name: string) {
        this.name = name;
    }

    setMsg(msg: string) {
        this.msg = msg;
    }

    showMsg() {
        if (this.msg.length > 0) {
            RG.gameMsg(this.msg);
        }
    }


    setParent(parent: MenuBase | null) {
        this.parent = parent;
    }

    getParent() {
        return this.parent;
    }


    addItem(code, item) {
        const index = Keys.codeToIndex(code);
        this.table[index] = item;
    }

    showMenu() {return this._showMenu;}

    setCallback(cb) {
        this.callback = cb;
    }

    getMenu() {
        const obj = {pre: [], post: []};
        Object.keys(this.table).forEach(index => {
            const char = Keys.menuIndices[index];
            obj[char] = this.table[index][0];
        });
        obj.pre = this.pre;
        obj.post = this.post;
        return obj;
    }

    addPost(item) {
        if (Array.isArray(item)) {
            this.post = this.post.concat(item);
        }
        else {
            this.post.push(item);
        }
    }

    addPre(item) {
        if (Array.isArray(item)) {
            this.pre = this.pre.concat(item);
        }
        else {
            this.pre.push(item);
        }
    }

    dbg(...args) {
        console.log(`MENU ${this.name}`, ...args);
    }
}

Menu.Base = MenuBase;

/* InfoOnly menu does not contain actual selection, but is intended to show
 * player crucial info they should not miss. Menu can be exited only by pressing
 * a specific key. */
export class MenuInfoOnly extends MenuBase {
    constructor() {
        super();
    }

    select(code) {
        const selection = Keys.codeToIndex(code);
        if (selection === 0) {
            return Menu.EXIT_MENU;
        }
        return this;
    }

    getMenu() {
        const obj = {
            0: 'Back to game.',
            pre: this.pre,
            post: this.post
        };
        return obj;
    }
}

RG.extend2(MenuInfoOnly, MenuBase);
Menu.InfoOnly = MenuInfoOnly;

/* This menu can be used when quit option is required. You can add a callback by
 * setting onQuit to a desired function. */
export class MenuWithQuit extends MenuBase {
    public onQuit: VoidFunc | boolean;

    constructor(args) {
        super(args);
        const quitIndex = Keys.codeToIndex(Keys.KEY.QUIT_MENU);
        this.table[quitIndex] = ['Quit menu', Menu.EXIT_MENU];
    }

    select(code) {
        const selection = Keys.codeToIndex(code);
        if (this.table.hasOwnProperty(selection)) {
            const value = this.table[selection][1];
            if (value === Menu.EXIT_MENU && this.onQuit) {
                (this.onQuit as VoidFunc)();
            }
            return value;
        }
        return this;
    }
}
Menu.WithQuit = MenuWithQuit;

/* This menu can be used for functionality requiring always a selection. */
export class MenuSelectRequired extends MenuBase {
    constructor(args) {
        super(args);
    }

    select(code) {
        const selection = Keys.codeToIndex(code);
        if (this.table.hasOwnProperty(selection)) {
            return this.table[selection][1];
        }
        return this;
    }
}

Menu.SelectRequired = MenuSelectRequired;

/* This menu can be used when a cell needs to be selected. It does not shown a
 * menu. You should communicate with RG.gameMsg() what player needs to do with
 * this menu. */
export class MenuSelectCell extends MenuBase {
    private _enableSelectAll: boolean;

    constructor(args) {
        super(args);
        this._enableSelectAll = false;
        if (args.enableSelectAll) {
            this._enableSelectAll = args.enableSelectAll;
        }
        this._showMenu = false;



    }

    enableSelectAll() {
        this._enableSelectAll = true;
    };

    select(code) {
        if (KeyMap.inMoveCodeMap(code)) {
            this.callback(code);
            return this;
        }
        else if (KeyMap.isSelect(code)) {
            const keyIndex = Keys.codeToIndex(code);
            const retVal = this.table[keyIndex];
            if ((retVal as MenuCallObj).funcToCall) {
                return (retVal as MenuCallObj).funcToCall;
            }
            return retVal;
        }
        else if (this._enableSelectAll && KeyMap.isSelectAll(code)) {
            this.callback(code);
            return this;
        }
        return Menu.EXIT_MENU;
    }
}

RG.extend2(MenuSelectCell, MenuBase);
Menu.SelectCell = MenuSelectCell;

//---------------------------------------------------------------------------

export class MenuSelectTarget extends MenuSelectCell {

    public targetCallback: (any) => void;

    constructor(args) {
        super(args);
        this.targetCallback = null;
    }

    select(code) {
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
                if ((retVal as MenuCallObj).funcToCall) {
                    return (retVal as MenuCallObj).funcToCall;
                }
                return retVal;
            }
            return Menu.EXIT_MENU;
        }
        return val;
    }
}

/* This menu can be used when direction selection is required. */
export class MenuSelectDir extends MenuBase {
    constructor(args) {
        super(args);
        this._showMenu = false;
    }

    select(code) {
        if (KeyMap.inMoveCodeMap(code)) {
            const dXdY = Keys.KeyMap.getDir(code);
            return this.callback.bind(null, dXdY);
        }
        return Menu.EXIT_MENU;
    }
}
Menu.SelectDir = MenuSelectDir;

//---------------------------------------------------------------------------
/* Menu which has multiple states. An example is a selection menu, which has C-D
 * bound to delete item. Thus, normally a menu is in a selection state, but then
 * user hits C-D, it goes to a deletion state. In this case, selection callback
 * is replaced by deletion callback. */
//---------------------------------------------------------------------------
export class MenuWithState extends MenuWithQuit {

    public menuState: string;
    public keyToState: {[key: string]: string};
    public stateToTable: {[key: string]: MenuTable};

    public stateToPost: {[key: string]: string};
    public stateToPre: {[key: string]: string};

    constructor(args) {
        super(args);
        this._showMenu = true;

        // Maps key presses to transitions into new state
        this.keyToState = {};

        // Maps state to a table of options/functions
        this.stateToTable = {};

        // State-specific pre/post texts
        this.stateToPost = {};
        this.stateToPre = {};

        // Current menu state
        this.menuState = '';

    }

    select(code) {
        if (this.keyToState.hasOwnProperty(code)) {
            this.menuState = this.keyToState[code];
            return this;
        }
        else {
            const selection = Keys.codeToIndex(code);
            if (this.table.hasOwnProperty(selection)) {
                const value = this.table[selection][1];
                if (value === Menu.EXIT_MENU && this.onQuit) {
                    (this.onQuit as VoidFunc)();
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
    }

    addState(state, menuArgs) {
        this.stateToTable[state] = createMenuTable(menuArgs);
    }

    addTransition(state, code) {
        this.keyToState[code] = state;
    }

    /* Returns the menu which should be shown. */
    getMenu() {
        const quitObj = MenuWithQuit.prototype.getMenu.call(this);
        const state = this.menuState;
        const table = this.stateToTable[state];
        let obj = {pre: this.pre, post: this.post};
        Object.keys(table).forEach(index => {
            const char = Keys.menuIndices[index];
            obj[char] = table[index][0];
        });
        obj = Object.assign(obj, quitObj);
        if (this.stateToPre[state]) {
            obj.pre.push(this.stateToPre[state]);
        }
        if (this.stateToPost[state]) {
            obj.post.push(this.stateToPost[state]);
        }
        return obj;
    }

    addPreState(item, state) {
        if (state) {
            this.stateToPre[state] = item;
        }
        else {
            MenuWithQuit.prototype.addPre.call(this, item);
        }
    }

    addPostState(item, state) {
        if (state) {
            this.stateToPost[state] = item;
        }
        else {
            MenuWithQuit.prototype.addPost.call(this, item);
        }
    }
}

Menu.WithState = MenuWithState;
