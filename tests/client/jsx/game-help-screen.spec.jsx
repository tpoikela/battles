
import React from 'react';
import { shallow, render, mount } from 'enzyme';
import chaiEnzyme from 'chai-enzyme';
import chai, { expect } from 'chai';

import GameHelpScreen, {TextHelp} from '../../../client/jsx/game-help-screen';

chai.use(chaiEnzyme());

// Props with non-default values passes to the component
const props = {

};

describe('Component <GameHelpScreen>', () => {
    it('should render', () => {
        const wrapper = shallow(<GameHelpScreen {...props} />);
        expect(wrapper, 'Component must render with shallow').to.have.length(1);
    });

    it('has a number of <TextHelp> components', () => {
        const wrapper = shallow(<GameHelpScreen {...props} />);
        const textPrim = wrapper.find(TextHelp);
        expect(textPrim).to.have.length.above(10);
    });

    it('has the full manual as HTML', () => {
        const wrapper = mount(<GameHelpScreen {...props} />);
        expect(wrapper.find('#manual-text')).to.have.length(1);
    });
});
