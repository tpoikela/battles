
import React from 'react';
import { shallow, render } from 'enzyme';
import chaiEnzyme from 'chai-enzyme';
import chai, { expect } from 'chai';

import GameEquipSlot from '../../../client/jsx/game-equip-slot';

chai.use(chaiEnzyme());

// Props with non-default values passes to the component
const props = {
    item: {toString: () => 'testString'},
    slotName: 'hand', slotNumber: 1
};

describe('Component <GameEquipSlot>', () => {
    it('should render', () => {
        const wrapper = shallow(<GameEquipSlot {...props} />);
        expect(wrapper, 'Component must render with shallow').to.have.length(1);
    });

    it('should call equipSelected callback on click', () => {
        let name = '';
        let number = -1;

        const slotName = 'testSlot';
        const slotNumber = 2;
        const testProps = {
            item: props.item,
            setEquipSelected: (sel) => {
                name = sel.slotName;
                number = sel.slotNumber;
            },
            slotName, slotNumber
        };
        const wrapper = shallow(<GameEquipSlot {...testProps} />);
        wrapper.find('.inv-equip-slot').simulate('click');
        expect(name).to.equal(slotName);
        expect(number).to.equal(slotNumber);

    });
});
