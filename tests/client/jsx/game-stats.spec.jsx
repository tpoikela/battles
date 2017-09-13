
import React from 'react';
import { shallow, render } from 'enzyme';
import chaiEnzyme from 'chai-enzyme';
import chai, { expect } from 'chai';

import GameStats from '../../../client/jsx/game-stats';

const RG = {};
RG.Actor = require('../../../client/src/actor');

const level = {
    getLevelNumber: () => 1,
    getParent: () => 'Dungeon'
};

const player = new RG.Actor.Rogue('player');
player.setIsPlayer(true);
player.setLevel(level);

chai.use(chaiEnzyme());

// Props with non-default values passes to the component
const props = {
  showMap: false,
  player,
  selectedItem: {getName: () => 'Item'},
  setViewType: () => true,
  selectedCell: null
};

describe('Component <GameStats>', () => {
    it('should render', () => {
        const wrapper = shallow(<GameStats {...props} />);
        expect(wrapper, 'Component must render with shallow').to.have.length(1);
    });
});
