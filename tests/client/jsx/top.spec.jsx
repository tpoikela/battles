
import React from 'react';
import { shallow, mount } from 'enzyme';
import chaiEnzyme from 'chai-enzyme';
import chai, { expect } from 'chai';

import BattlesTop from '../../../client/jsx/top';

import Storage from '../../helpers/mockstorage';

window.localStorage = window.localStorage || new Storage();

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
    });

    it('should create game and be able to save it', () => {
        const wrapper = mount(<BattlesTop />);
        expect(wrapper, 'Component must render with mount').to.have.length(1);
        wrapper.setState({playMode: 'OverWorld'});

        const selPlayMode = wrapper.find('#dropdown-select-playmode');
        selPlayMode.simulate('change', {target: {value: 'OverWorld'}});

        const startButton = wrapper.find('#embark-button');
        startButton.simulate('click');
        const saveButton = wrapper.find('#save-button');
        saveButton.simulate('click');
    });
});

