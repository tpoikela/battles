
import React from 'react';
import { shallow, render } from 'enzyme';
import chaiEnzyme from 'chai-enzyme';
import chai, { expect } from 'chai';

const RG = {};
RG.Inv = require('../../../client/src/inv');
RG.Item = require('../../../client/src/item');
RG.Actor = require('../../../client/src/actor');
RG.Factory = require('../../../client/src/factory');

import GameItems from '../../../client/jsx/game-items';
import GameInventory from '../../../client/jsx/game-inventory';

chai.use(chaiEnzyme());

// Props with non-default values passes to the component
const player = new RG.Actor.Rogue('player');
const props = {
    player,
    eq: new RG.Inv.Equipment(player),
    inv: new RG.Item.Container(player)
};

describe('Component <GameInventory>', () => {
    it('should render', () => {
        const wrapper = shallow(<GameInventory {...props} />);
        expect(wrapper, 'Component must render with shallow').to.have.length(1);
    });

    it('should have <GameItems>', () => {
        const wrapper = shallow(<GameInventory {...props} />);
        expect(wrapper.find(GameItems)).to.have.length(1);
    });
});
