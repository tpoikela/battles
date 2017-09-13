
import React from 'react';
import { shallow, render } from 'enzyme';
import chaiEnzyme from 'chai-enzyme';
import chai, { expect } from 'chai';

import GameItemSlot from '../../../client/jsx/game-item-slot';

chai.use(chaiEnzyme());

// Props with non-default values passes to the component
const props = {
    item: {toString: () => 'item string'}

};

describe('Component <GameItemSlot>', () => {
    it('should render', () => {
        const wrapper = shallow(<GameItemSlot {...props} />);
        expect(wrapper, 'Component must render with shallow').to.have.length(1);
    });
});
