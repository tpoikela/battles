
import React from 'react';
import { shallow, render } from 'enzyme';
import chaiEnzyme from 'chai-enzyme';
import chai, { expect } from 'chai';

import GamePanel from '../../../client/jsx/game-panel';

chai.use(chaiEnzyme());

// Props with non-default values passes to the component

const btnVals = [false, true, false, false];
const viewSizes = [];
const props = {
    saveGame: () => btnVals[0] = !btnVals[0],
    setViewSize: (evt, xy, pn) => {
        viewSizes.push([xy, pn])
    },
    showLoadScreen: () => btnVals[2] = !btnVals[2],
    showStartScreen: () => btnVals[3] = !btnVals[3]
};

describe('Component <GamePanel>', () => {
    it('should render', () => {
        const wrapper = shallow(<GamePanel {...props} />);
        expect(wrapper, 'Component must render with shallow').to.have.length(1);
    });

    it('has buttons for controlling view size', () => {
        const wrapper = shallow(<GamePanel {...props} />);
        const buttons = wrapper.find('button');
        expect(buttons).to.have.length.above(4);

        buttons.forEach(btn => btn.simulate('click'));
        btnVals.forEach((val, index) => {
            expect(val, 'Value ' + index + ' OK').to.equal(true);
        });

        expect(viewSizes).to.have.length(4);

        const viewResult = [['+', 'X'], ['-', 'X'], ['+', 'Y'], ['-', 'Y']];

        expect(viewSizes).to.deep.equal(viewResult);
    });
});
