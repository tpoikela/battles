
import React from 'react';
import { shallow, render } from 'enzyme';
import chaiEnzyme from 'chai-enzyme';
import chai, { expect } from 'chai';

import GameOverworldMap from '../../../client/jsx/game-overworld-map';

chai.use(chaiEnzyme());

// Props with non-default values passes to the component
const props = {

};

describe('Component <GameOverworldMap>', () => {
    it('should render', () => {
        const wrapper = shallow(<GameOverworldMap {...props} />);
        expect(wrapper, 'Component must render with shallow').to.have.length(1);
    });
});
