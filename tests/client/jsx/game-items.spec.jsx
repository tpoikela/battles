
import React from 'react';
import { shallow, render } from 'enzyme';
import chaiEnzyme from 'chai-enzyme';
import chai, { expect } from 'chai';

import GameItemSlot from '../../../client/jsx/game-item-slot';
import GameItems from '../../../client/jsx/game-items';

const RG = {};
RG.Item = require('../../../client/src/item');
RG.Actor = require('../../../client/src/actor');
RG.Factory = require('../../../client/src/factory');

chai.use(chaiEnzyme());

const player = new RG.Actor.Rogue('player');

const item1 = new RG.Item.Base('base item');
const weapon = new RG.Item.Weapon('sword');
const inv = new RG.Item.Container(player);
inv.addItem(weapon);
inv.addItem(item1);

// Props with non-default values passes to the component
const props = {
    inv,
    setSelectedItem: item => true
};

describe('Component <GameItems>', () => {
    it('should render', () => {
        const wrapper = shallow(<GameItems {...props} />);
        expect(wrapper, 'Component must render with shallow').to.have.length(1);
    });

    it('should have <GameItemSlot>s', () => {
        const wrapper = shallow(<GameItems {...props} />);
        const slots = wrapper.find(GameItemSlot);
        expect(slots).to.have.length(2);

    });

});
