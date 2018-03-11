
import React from 'react';
import { shallow } from 'enzyme';
import chaiEnzyme from 'chai-enzyme';
import chai, { expect } from 'chai';
import GameItems from '../../../client/jsx/game-items';
import GameInventory from '../../../client/jsx/game-inventory';

const RG = {};
RG.Inv = require('../../../client/src/inv');
RG.Item = require('../../../client/src/item');
RG.Actor = require('../../../client/src/actor');
RG.Factory = require('../../../client/src/factory');
const RGTest = require('../../roguetest');


chai.use(chaiEnzyme());


describe('Component <GameInventory>', () => {

    let numClicks = 0;
    const resCmds = [];

    // Props with non-default values passes to the component
    const player = new RG.Actor.Rogue('player');
    RGTest.wrapIntoLevel([player]);
    const props = {
        doInvCmd: cmd => {
            ++numClicks;
            resCmds.push(cmd);
        },
        player,
        eq: new RG.Inv.Equipment(player),
        inv: new RG.Item.Container(player),
        equipSelected: {slotName: 'hand'}
    };

    it('should render', () => {
        const wrapper = shallow(<GameInventory {...props} />);
        expect(wrapper, 'Component must render with shallow').to.have.length(1);
    });

    it('should have <GameItems>', () => {
        const wrapper = shallow(<GameInventory {...props} />);
        expect(wrapper.find(GameItems)).to.have.length(1);
    });

    it('has buttons for manipulating items', () => {
        const wrapper = shallow(<GameInventory {...props} />);
        const buttons = wrapper.find('button');
        buttons.forEach(btn => btn.simulate('click'));
        expect(numClicks).to.equal(4);

        resCmds.forEach(cmd => {
            expect(cmd).to.have.property('callback');
        });
    });
});
