
import React from 'react';
import { shallow } from 'enzyme';
import chaiEnzyme from 'chai-enzyme';
import chai, { expect } from 'chai';

import GameEquipSlot from '../../../client/jsx/game-equip-slot';
import GameEquipment from '../../../client/jsx/game-equipment';

chai.use(chaiEnzyme());

// Props with non-default values passes to the component
const props = {
    eq: {
        getEquipped: () => ({toString: () => 'xxx'}),
        getSlotTypes: () => ['hand', 'feet']
    },
    setEquipSelected: () => true
};

describe('Component <GameEquipment>', () => {
    it('should render', () => {
        const wrapper = shallow(<GameEquipment {...props} />);
        expect(wrapper, 'Component must render with shallow').to.have.length(1);
    });


    it('should have a number of <EquipSlot>s ', () => {
        const wrapper = shallow(<GameEquipment {...props} />);
        const slots = wrapper.find(GameEquipSlot);
        expect(slots).to.have.length(2);
    });
});
