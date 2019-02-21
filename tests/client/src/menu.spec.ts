
import {expect} from 'chai';
import {Keys} from '../../../client/src/keymap';
import {Menu, MenuBase} from '../../../client/src/menu';
import {RGTest} from '../../roguetest';

describe('Menu.Base', () => {

    it('can have a menu msg set', () => {
        const catcher = new RGTest.MsgCatcher();
        catcher.printMsg = false;
        const menu: MenuBase = new MenuBase();
        menu.setMsg('This is a menu');
        menu.showMsg();
        expect(catcher.numCaught).to.equal(1);
    });


    it('accepts a list of options to show', () => {
        const menuArgs = [
            ['My option 1', () => true],
            ['My option 2', {}],
            {key: Keys.KEY.NEXT, menu: {}},
            {key: Keys.KEY.PREV, func: () => {}},
            {key: Keys.KEY.GOTO, funcToCall: () => {}}
        ];
        const nArgs = menuArgs.length;
        const menu: MenuBase = new Menu.Base(menuArgs);

        const menuItems = menu.getMenu();
        const menuKeys = Object.keys(menuItems);
        expect(menuKeys).to.have.length(nArgs + 2);
        const codes = [
            Keys.selectIndexToCode(0),
            Keys.selectIndexToCode(1),
            Keys.KEY.NEXT,
            Keys.KEY.PREV,
            Keys.KEY.GOTO
        ];
        codes.forEach((code, i) => {
            const value = menu.select(code);
            if (i === 0 || i >= 3) {
                expect(value).to.be.a('function');
            }
            else {
                expect(value).to.deep.equal({});
            }
        });

    });

});

