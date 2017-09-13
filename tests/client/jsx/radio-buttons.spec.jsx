
import React from 'react';
import { shallow, render } from 'enzyme';
import chaiEnzyme from 'chai-enzyme';
import chai, { expect } from 'chai';

import RadioButtons from '../../../client/jsx/radio-buttons';

chai.use(chaiEnzyme());

const btnNames = [];
// Props with non-default values passes to the component
const props = {
    buttons: ['A', 'B', 'C'],
    currValue: 'B',
    callback: name => btnNames.push(name)
};

describe('Component <RadioButtons>', () => {
    it('should render', () => {
        const wrapper = shallow(<RadioButtons {...props} />);
        expect(wrapper, 'Component must render with shallow').to.have.length(1);
    });

    it('renders one <button> per element in buttons', () => {
        const wrapper = shallow(<RadioButtons {...props} />);
        const buttons = wrapper.find('button');
        expect(buttons).to.have.length(3);

        buttons.forEach(btn => btn.simulate('click'));

        btnNames.forEach((name, i) => {
            expect(btnNames[i]).to.equal(props.buttons[i]);
        });
    });
});
