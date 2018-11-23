
import React from 'react';
import { shallow, render } from 'enzyme';
import chaiEnzyme from 'chai-enzyme';
import chai, { expect } from 'chai';

import GameItemSlot from '../../../client/jsx/game-item-slot';

chai.use(chaiEnzyme());

let selected = null;

// Props with non-default values passes to the component
const props = {
    item: {toString: () => 'item string', name: 'My item'},
    setSelectedItem: item => selected = item

};

describe('Component <GameItemSlot>', () => {
    it('should render', () => {
        const wrapper = shallow(<GameItemSlot {...props} />);
        expect(wrapper, 'Component must render with shallow').to.have.length(1);
    });

    it('can be clicked render', () => {
        const wrapper = shallow(<GameItemSlot {...props} />);
        const div = wrapper.find('div');
        div.simulate('click');
        expect(selected.name).to.equal('My item');

    });
});
