
const expect = require('chai').expect;
// const RG = require('../../../client/src/battles');
const Keys = require('../../../client/src/keymap');
const Menu = require('../../../client/src/menu');

describe('Menu.Base', () => {
    it('accepts a list of options to show', () => {
        const menuArgs = [
            ['My option 1', () => true],
            ['My option 2', {}],
            {key: Keys.KEY.NEXT, menu: {}},
            {key: Keys.KEY.PREV, func: () => {}},
            {key: Keys.KEY.GOTO, funcToCall: () => {}}
        ];
        const nArgs = menuArgs.length;
        const menu = new Menu.Base(menuArgs);

        const menuItems = menu.getMenu();
        const menuKeys = Object.keys(menuItems);
        expect(menuKeys).to.have.length(nArgs + 2);
    });
});

