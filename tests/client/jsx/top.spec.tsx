
import React from 'react';
import { shallow, mount } from 'enzyme';
import chaiEnzyme from 'chai-enzyme';
import chai, { expect } from 'chai';

import GameBoard from '../../../client/jsx/game-board';
import BattlesTop from '../../../client/jsx/top';

chai.use(chaiEnzyme());

describe('Component <BattlesTop>', function() {
    this.timeout(30000);

    it('should render with shallow', () => {
        const wrapper = shallow(<BattlesTop />);
        expect(wrapper, 'Component must render with shallow').to.have.length(1);
    });

    it('should render with mount', () => {
        const wrapper = mount(<BattlesTop />);
        expect(wrapper, 'Component must render with mount').to.have.length(1);
        wrapper.unmount();
    });

    it('should create game and be able to save it', () => {
        const wrapper = mount(<BattlesTop />);
        expect(wrapper, 'Component must render with mount').to.have.length(1);
        wrapper.setState({playMode: 'Arena'});

        const selPlayMode = wrapper.find('#dropdown-select-playmode');
        expect(selPlayMode.length).to.equal(1);
        selPlayMode.simulate('change', {target: {value: 'Arena'}});

        const startButton = wrapper.find('#embark-button');
        startButton.simulate('click');
        // const saveButton = wrapper.find('#save-button');
        // saveButton.simulate('click');
        expect(wrapper.find(GameBoard)).to.have.length(1);
        wrapper.unmount();
    });
});

