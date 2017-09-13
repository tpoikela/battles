
import React from 'react';
import { shallow, render } from 'enzyme';
import chaiEnzyme from 'chai-enzyme';
import chai, { expect } from 'chai';

import DropdownSelect from '../../../client/jsx/dropdown-select';

chai.use(chaiEnzyme());

// Props with non-default values passes to the component
const props = {
    options: []
};

describe('Component <DropdownSelect>', () => {
    it('should render', () => {
        const wrapper = shallow(<DropdownSelect {...props} />);
        expect(wrapper, 'Component must render with shallow').to.have.length(1);
    });

    it('should have a number of <option>s', () => {
        const props = {
            options: ['good', 'bad', 'ugly', 'rest']
        };
        const wrapper = shallow(<DropdownSelect {...props} />);
        const optElems = wrapper.find('option');
        expect(optElems).to.have.length(4);
    });

    it('should have onChange callback', () => {
        let selOpt = null;
        const props = {options: ['a', 'b'],
            callback: (opt) => {selOpt = opt;},
            currValue: 'a'
        };
        const wrapper = shallow(<DropdownSelect {...props} />);
        expect(wrapper.find('select')).to.have.length(1);

        expect(wrapper.find('option').get(0)).to.be.selected;
    });
});
