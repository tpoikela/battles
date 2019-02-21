
import React from 'react';
import { shallow, render } from 'enzyme';
import chaiEnzyme from 'chai-enzyme';
import chai, { expect } from 'chai';

import DropdownSelect from '../../../client/jsx/dropdown-select';

chai.use(chaiEnzyme());

describe('Component <DropdownSelect>', () => {

    let props: any = null;

    beforeEach(() => {
        // Props with non-default values passes to the component
        props = {
            titleName: 'SelectTitle',
            options: [],
            callback: () => {},
            currValue: 'Selected'
        };

    });


    it('should render', () => {
        const wrapper = shallow(<DropdownSelect {...props} />);
        expect(wrapper, 'Component must render with shallow').to.have.length(1);
    });

    it('should have a number of <option>s', () => {
        props.options = ['good', 'bad', 'ugly', 'rest'];
        const wrapper = shallow(<DropdownSelect {...props} />);
        const optElems = wrapper.find('option');
        expect(optElems).to.have.length(4);
    });

    it('should have onChange callback', () => {
        let selOpt = null;
        props = {options: ['a', 'b'],
            callback: (opt) => {selOpt = opt;},
            currValue: 'a', titleName: 'XXX'
        };
        const wrapper = shallow(<DropdownSelect {...props} />);
        expect(wrapper.find('select')).to.have.length(1);

        expect(wrapper.find('option').get(0)).to.be.selected;
    });
});
