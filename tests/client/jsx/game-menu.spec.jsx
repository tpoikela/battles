
import React from 'react';
import { shallow, render } from 'enzyme';
import chaiEnzyme from 'chai-enzyme';
import chai, { expect } from 'chai';

import GameMenu from '../../../client/jsx/game-menu';

chai.use(chaiEnzyme());

// Props with non-default values passes to the component
const props = {
    width: 80,
    height: 28,
    menuObj: {}
};

describe('Component <GameMenu>', () => {
    it('should render', () => {
        const wrapper = shallow(<GameMenu {...props} />);
        expect(wrapper, 'Component must render with shallow').to.have.length(1);
    });

    it('has one span per rendered text row', () => {
        const wrapper = shallow(<GameMenu {...props} />);
        const spans = wrapper.find('span');
        expect(spans).to.have.length(props.height);

        const spanElemProps = spans.get(0).props;
        expect(spanElemProps.dangerouslySetInnerHTML.__html)
            .to.have.length.above(79);
    });
});
