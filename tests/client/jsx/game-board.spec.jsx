
import React from 'react';
import { shallow, mount, render } from 'enzyme';
import chaiEnzyme from 'chai-enzyme';
import chai, { expect } from 'chai';

import GameRow from '../../../client/jsx/game-row';
import GameBoard from '../../../client/jsx/game-board';

chai.use(chaiEnzyme());

describe('Component <GameBoard>', () => {

    let props = null;
    let resXY = null;

    beforeEach(() => {
        resXY = [];
        props = {
            startY: 3,
            endY: 4,
            charRows: [['a'], ['b']],
            classRows: [['class-a'], ['class-b']],
            onCellClick: (x, y) => resXY.push([x, y])
        };
    });

    it('should render shallowly', () => {
        const wrapper = shallow(<GameBoard {...props} />);
        expect(wrapper, 'Component must render with shallow').to.have.length(1);
    });

    it('should render multiple rows', () => {
        const wrapper = shallow(<GameBoard {...props} />);
        const rows = wrapper.find(GameRow);
        expect(rows).to.have.length(2);
    });

    it('should render with mount', () => {
        const wrapper = mount(<GameBoard {...props} />);
        const divs = wrapper.find('div');
        expect(divs).to.have.length(3);

        wrapper.find('.game-board').simulate('click');
        expect(resXY).to.have.length(1);
        wrapper.find('.game-board').simulate('click');
        expect(resXY).to.have.length(2);
    });

});
