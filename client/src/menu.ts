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

export interface IMenu {
    [key: string]: string | string[];
}

export interface SelectionObject {
    showMenu: () => boolean;
    getMenu?: () => IMenu;
    select: (code: number) => SelectionObject | SelectionFunc | null;
    showMsg?: () => void;
    funcToCall?: () => void;
}


type VoidFunc = () => void;
interface MenuCallObj {
    funcToCall: VoidFunc;
}
type MenuPair = [string, any];

export type MenuItem = MenuBase | VoidFunc | MenuPair | MenuCallObj;

interface MenuTable {
    [key: string]: MenuItem;
}

type MenuFunction = (args: any) => void;

interface MenuArgObj {
    key: number; // Key code to select this specific item
    menu?: MenuBase;
    func?: MenuFunction;
    funcToCall?: MenuFunction;
}

type MenuArgArray = [string, MenuFunction];

export type MenuArg = MenuArgObj | MenuArgArray;

const createMenuTable = function(args: MenuArg[]): MenuTable {
    const table = {};
    args.forEach((item, i) => {
        const index = Keys.menuIndices[i];
        if ((item as MenuArgObj).key) {
            const itemObj = item as MenuArgObj;
            const ii = Keys.codeToIndex(itemObj.key);
            if (itemObj.menu) {
                table[ii] = itemObj.menu;
            }
            else if (itemObj.func) {
                table[ii] = itemObj.func;
            }
            else if (itemObj.funcToCall) {
                table[ii] = {funcToCall: itemObj.funcToCall};
            }
        }
        else if ((item as MenuArgArray).length === 2) {
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

Menu.isSelectionDone = function(selection): boolean {
    return typeof selection === 'function';
};

Menu.isMenuItem = function(selection): boolean {
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
    public callback: (any) => void | null;
    public returnMenu: MenuBase | null;
    protected _showMenu: boolean;

    constructor(args: MenuArg[] = []) {
        this.table = createMenuTable(args);
        this.msg = '';
        this.pre = [];
        this.post = [];
        this._showMenu = true;

        this.parent = null; // Parent menu for this object
    }

    public createTable(args: MenuArg[]): void {
        this.table = createMenuTable(args);
    }

    public setName(name: string): void {
        this.name = name;
    }

    public setMsg(msg: string): void {
        this.msg = msg;
    }

    public showMsg(): void {
        if (this.msg.length > 0) {
            RG.gameMsg(this.msg);
        }
    }

    public setParent(parent: MenuBase | null) {
        this.parent = parent;
    }

    public getParent(): MenuBase | null {
        return this.parent;
    }

    public addItem(code: number, item) {
        const index = Keys.codeToIndex(code);
        this.table[index] = item;
    }

    public showMenu() {return this._showMenu;}

    public setCallback(cb) {
        this.callback = cb;
    }

    public getMenu() {
        const obj = {pre: [], post: []};
        Object.keys(this.table).forEach(index => {
            const char = Keys.menuIndices[index];
            obj[char] = this.table[index][0];
        });
        obj.pre = this.pre;
        obj.post = this.post;
        return obj;
    }

    public addPost(item: string | string[]): void {
        if (Array.isArray(item)) {
            this.post = this.post.concat(item);
        }
        else {
            this.post.push(item);
        }
    }

    public addPre(item: string | string[]): void {
        if (Array.isArray(item)) {
            this.pre = this.pre.concat(item);
        }
        else {
            this.pre.push(item);
        }
    }

    public dbg(...args): void {
        console.log(`MENU ${this.name}`, ...args);
    }

    public select(code) {
        const selectIndex = Keys.codeToIndex(code);
        if (this.table.hasOwnProperty(selectIndex)) {
            const selection = this.table[selectIndex];
            if ((selection as MenuPair).length === 2) {
                return selection[1];
            }
            else if ((selection as MenuCallObj).funcToCall) {
                return (selection as MenuCallObj).funcToCall;
            }
            else {
                return selection;
            }
        }
    }

    /* Called if this menu is selected from a parent menu. */
    public onSelectCallback(cbArgs?: any): void {
        console.log('onSelectCallback in menu', this.name);
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

    public select(code) {
        const selection = Keys.codeToIndex(code);
        if (selection === 0) {
            return Menu.EXIT_MENU;
        }
        return this;
    }

    public getMenu() {
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

    constructor(args?) {
        super(args);
        const quitIndex = Keys.codeToIndex(Keys.KEY.QUIT_MENU);
        this.table[quitIndex] = ['Quit menu', Menu.EXIT_MENU];
    }

    public select(code) {
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

    public select(code) {
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

    constructor(args: MenuArg[] = []) {
        super(args);
        this._enableSelectAll = false;
        this._showMenu = false;
    }

    public enableSelectAll(): void {
        this._enableSelectAll = true;
    }

    public select(code) {
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

    constructor(args: MenuArg[] = []) {
        super(args);
        this.targetCallback = null;
    }

    public select(code) {
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

    /* Returns a callback bound to the dXdY of selection code. */
    public select(code) {
        if (KeyMap.inMoveCodeMap(code)) {
            const dXdY = Keys.KeyMap.getDir(code);
            if (this.callback) {
                return this.callback.bind(null, dXdY);
            }
            else if (this.returnMenu) {
                this.returnMenu.onSelectCallback(dXdY);
                return this.returnMenu; // Can be object/Menu
            }
        }
        return Menu.EXIT_MENU;
    }
}
Menu.SelectDir = MenuSelectDir;

/* This menu can be used when direction selection is required. */
export class MenuConfirm extends MenuBase {

    constructor(args) {
        super(args);
        this._showMenu = false;
        this.msg = 'Do you want to confirm the action [y/n]?';
    }

    /* Returns a callback bound to the dXdY of selection code. */
    public select(code) {
        if (KeyMap.isConfirmYes(code)) {
            if (this.callback) {
                return this.callback;
            }
            else if (this.returnMenu) {
                this.returnMenu.onSelectCallback();
                return this.returnMenu;
            }
            return Menu.EXIT_MENU;
        }
        else if (KeyMap.isConfirmNo(code)) {
            return Menu.EXIT_MENU;
        }
        return this;
    }
}
Menu.Confirm = MenuConfirm;

/* This menu is used when player does missile targeting. */
export class PlayerMissileMenu extends MenuSelectCell {

    public actor: any;

    constructor(args: MenuArg[] = [], actor) {
        super(args);
        this.actor = actor;
        this._showMenu = false;
        const brain = this.actor.getBrain();
        if (brain.selectCell) {
            const cellCb = brain.selectCell.bind(brain);
            this.setCallback(cellCb);
        }
        else {
            RG.err('PlayerMissileMenu', 'constructor',
                'brain does not have selectCell() function');
        }
        // If there are enemies, auto-target most recent/new
        brain.startTargeting();
        if (!brain.hasTargetSelected()) {
            // Otherwise let player select a cell
            // brain.cancelTargeting();
            brain.selectCell();
            console.log('Brain no target selected. Using cell.');
        }
        else {
            console.log('Brain has target selected');
        }
        // brain.selectCell();
    }

    public select(code) {
        const val = MenuSelectCell.prototype.select.call(this, code);
        if (val !== Menu.EXIT_MENU) {
            return val;
        }

        // Base class did't return anything meaningful, thus process code
        switch (code) {
            case Keys.KEY.NEXT: {
                this.actor.getBrain().nextTarget();
                return this;
            }
            case Keys.KEY.PREV: {
                this.actor.getBrain().prevTarget();
                return this;
            }
            case Keys.KEY.TARGET: {
                const keyIndex = Keys.codeToIndex(code);
                return this.table[keyIndex];
            }
            default: {
                return Menu.EXIT_MENU;
            }
        }
        return Menu.EXIT_MENU;
    }

}

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

    constructor(args?) {
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

    public select(code) {
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

    public addState(state, menuArgs) {
        this.stateToTable[state] = createMenuTable(menuArgs);
    }

    public addTransition(state, code) {
        this.keyToState[code] = state;
    }

    /* Returns the menu which should be shown. */
    public getMenu() {
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

    public addPreState(item, state) {
        if (state) {
            this.stateToPre[state] = item;
        }
        else {
            MenuWithQuit.prototype.addPre.call(this, item);
        }
    }

    public addPostState(item, state) {
        if (state) {
            this.stateToPost[state] = item;
        }
        else {
            MenuWithQuit.prototype.addPost.call(this, item);
        }
    }
}

Menu.WithState = MenuWithState;
