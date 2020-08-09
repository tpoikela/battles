
import {expect} from 'chai';
import {Keys} from '../../../client/src/keymap';
import {MenuArg, Menu, MenuBase,
    PlayerMissileMenu} from '../../../client/src/menu';
import {RGTest} from '../../roguetest';
import {RGUnitTests} from '../../rg.unit-tests';
import {SentientActor} from '../../../client/src/actor';

const {KEY} = Keys;

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

describe('Menu.PlayerMissileMenu', () => {
    it('handles missile targeting', () => {
        let cmdDone = false;
        const player = RGTest.createPlayer();
        const orc = new SentientActor('orc');
        const level = RGUnitTests.wrapIntoLevel([player, orc]);
        RGUnitTests.moveEntityTo(player, 1, 1);
        orc.getBrain().addEnemy(player);
        RGUnitTests.moveEntityTo(orc, 3, 3);
        const brain = player.getBrain();
        const menuArgs: MenuArg[] = [
            {key: KEY.TARGET, func: () => {
                cmdDone = true;
                brain.decideNextAction({cmd: 'missile'});
            }}
        ];
        const menu = new PlayerMissileMenu(menuArgs, player);
        menu.select(KEY.NEXT);
        const target = brain.getTarget();
        expect(target.getX()).to.equal(orc.getX());
        expect(target.getY()).to.equal(orc.getY());
        menu.select(KEY.PREV);
        menu.select(KEY.TARGET);
        /* TODO fix this
        expect(cmdDone, 'Cmd was executed OK').to.equal(true);
        expect(player.has('AttackRanged')).to.equal(true);
        menu.select(KEY.QUIT_MENU);
        */
    });
});
