
import React from 'react';
import { shallow, render } from 'enzyme';
import chaiEnzyme from 'chai-enzyme';
import chai, { expect } from 'chai';

import GameRow from '../../../client/jsx/game-row';
import GameBoard from '../../../client/jsx/game-board';

chai.use(chaiEnzyme());

// Props with non-default values passes to the component
const props = {

};

describe('Component <GameBoard>', () => {
    it('should render shallowly', () => {
        const wrapper = shallow(<GameBoard {...props} />);
        expect(wrapper, 'Component must render with shallow').to.have.length(1);
    });

    it('should render multiple rows', () => {
        const props = {
            startY: 3,
            endY: 4,
            charRows: [['a'], ['b']],
            classRows: [['class-a'], ['class-b']],
        };
        const wrapper = shallow(<GameBoard {...props} />);
        const rows = wrapper.find(GameRow);
        expect(rows).to.have.length(2);
    });


});
