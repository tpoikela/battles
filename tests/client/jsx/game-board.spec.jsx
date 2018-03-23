
import React from 'react';
import { shallow, mount } from 'enzyme';
import chaiEnzyme from 'chai-enzyme';
import chai, { expect } from 'chai';

import GameRow from '../../../client/jsx/game-row';
import GameBoard from '../../../client/jsx/game-board';

const RG = require('../../../client/src/battles');
const Screen = require('../../../client/gui/screen');


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

    it('can render Screen object as GameRows', () => {
      const conf = {
        x: 80, y: 28, maxDanger: 4, maxValue: 100,
        sqrPerActor: 40, sqrPerItem: 40, nLevel: 1,
        dungeonType: 'crypt'
      };
      const fact = new RG.Factory.Zone();
      const crypt = fact.createDungeonLevel(conf);
      const map = crypt.getMap();
      const screen = new Screen(map.cols, map.rows);
      screen.renderFullMapWithRLE(map);
      const newProps = Object.assign({}, props);
      newProps.charRows = screen.getCharRows();
      newProps.classRows = screen.getClassRows();
      newProps.startY = 0;
      newProps.endY = map.cols - 1;
      const wrapper = mount(<GameBoard {...newProps} />);
      const rows = wrapper.find('GameRow');
      expect(rows.length).to.be.above(20);

    });

});
