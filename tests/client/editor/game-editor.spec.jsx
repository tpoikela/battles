
import React from 'react';
import { mount, render } from 'enzyme';
import chaiEnzyme from 'chai-enzyme';
import chai, { expect } from 'chai';

import GameEditor from '../../../client/editor/game-editor';

chai.use(chaiEnzyme());

// Props with non-default values passes to the component
const props = {

};

describe('Component <GameEditor>', () => {
    it('should render', () => {
        const wrapper = mount(<GameEditor {...props} />);
        expect(wrapper, 'Component must render with shallow').to.have.length(1);
    });
});
