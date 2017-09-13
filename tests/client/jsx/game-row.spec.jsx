
import React from 'react';
import { shallow, render } from 'enzyme';
import chaiEnzyme from 'chai-enzyme';
import chai, { expect } from 'chai';

import GameRow from '../../../client/jsx/game-row';

chai.use(chaiEnzyme());

// Props with non-default values passes to the component
const props = {
    rowChars: [],
    rowClasses: [],
    rowClass: ''
};

describe('Component <GameRow>', () => {
    it('should render shallowly', () => {
        const wrapper = shallow(<GameRow {...props} />);
        expect(wrapper, 'Component must render with shallow').to.have.length(1);
    });

    it('has one row with specified style.', () => {
        const props = {
            rowChars: ['a', 'b', 'c'],
            rowClasses: ['class-a', 'class-b', 'class-c'],
            rowClass: 'my-custom-class'
        };
        const wrapper = shallow(<GameRow {...props} />);
        const rowDiv = wrapper.find('.' + props.rowClass);
        expect(rowDiv).to.have.length(1);
        const spanElems = wrapper.find('span');
        expect(spanElems).to.have.length(3);
    });

    it('can use RLE to reduce the span count', () => {
        const props = {
            useRLE: true,
            rowChars: [[10, 'a'], [1, 'b'], [3, 'c']],
            rowClasses: [[10, 'class-a'], [1, 'class-b'], [3, 'class-c']],
        };
        const wrapper = shallow(<GameRow {...props} />);
        const spanElems = wrapper.find('span');
        expect(spanElems).to.have.length(3);
    });
});
