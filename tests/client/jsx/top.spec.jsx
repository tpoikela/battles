
import React from 'react';
import { shallow, mount, render } from 'enzyme';
import chaiEnzyme from 'chai-enzyme';
import chai, { expect } from 'chai';

import BattlesTop from '../../../client/jsx/top';

import Storage from '../../helpers/mockstorage';

window.localStorage = window.localStorage || new Storage();

chai.use(chaiEnzyme());

describe('Component <BattlesTop>', () => {
    it('should render with shallow', () => {
        const wrapper = shallow(<BattlesTop />);
        expect(wrapper, 'Component must render with shallow').to.have.length(1);
    });

    it('should render with mount', () => {
        const wrapper = mount(<BattlesTop />);
        expect(wrapper, 'Component must render with mount').to.have.length(1);
    });
});
