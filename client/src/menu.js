/* This file contains ASCII menus rendered as a monospace text over the game
 * board. */

const RG = require('./rg');

const Menu = {};
Menu.EXIT_MENU = null;

/* Base class for all menus. */
const MenuBase = function() {

    this.pre = [];
    this.post = [];

    this.showMenu = () => true;

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
        const selection = RG.codeToIndex(code);
        if (selection === 0) {
            return Menu.EXIT_MENU;
        }
        return this;
    };
};
RG.extend2(MenuInfoOnly, MenuBase);
Menu.InfoOnly = MenuInfoOnly;

/* This menu can be used for functionality requiring always a selection. */
const MenuSelectRequired = function(args) {
    MenuBase.call(this);

    this.table = {};

    args.forEach((item, i) => {
        const index = RG.menuIndices[i];
        if (item.length === 2) {
            this.table[index] = item;
        }
        else {
            RG.err('MenuSelectRequired', 'new',
              'Each item must have 2 values: menu msg and func (or null)');
        }
    });

    this.getMenu = () => {
        const obj = {};
        Object.keys(this.table).forEach(index => {
            obj[index] = this.table[index][0];
        });
        obj.pre = this.pre;
        obj.post = this.post;
        return obj;
    };

    this.select = code => {
        const selection = RG.codeToIndex(code);
        if (this.table.hasOwnProperty(selection)) {
            return this.table[selection][1];
        }
        return this;
    };
};
RG.extend2(MenuSelectRequired, MenuBase);
Menu.SelectRequired = MenuSelectRequired;

module.exports = Menu;
