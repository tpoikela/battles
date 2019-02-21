
import React from 'react';
import { shallow, render } from 'enzyme';
import chaiEnzyme from 'chai-enzyme';
import chai, { expect } from 'chai';

import GameMessages from '../../../client/jsx/game-messages';

chai.use(chaiEnzyme());

// Props with non-default values passes to the component
const props = {
    message: ['Msg1', 'Msg2', 'Msg3']
};

describe('Component <GameMessages>', () => {
    it('should render', () => {
        const wrapper = shallow(<GameMessages {...props} />);
        expect(wrapper, 'Component must render with shallow').to.have.length(1);
    });

    it('renders one <span> per msg', () => {
        const wrapper = shallow(<GameMessages {...props} />);
        const spans = wrapper.find('span');
        expect(spans).to.have.length(props.message.length);
    });
});
