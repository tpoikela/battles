
import React from 'react';
import { shallow, render } from 'enzyme';
import chaiEnzyme from 'chai-enzyme';
import chai, { expect } from 'chai';

import GameStartScreen from '../../../client/jsx/game-start-screen';

chai.use(chaiEnzyme());

// Props with non-default values passes to the component
const props = {
  settings: {},
  deleteGame: () => true,
  loadGame: () => true,
  savedPlayerList: ['p1', 'p2', 'Player'],
  setPlayerName: () => true,
  playerName: 'Player',
  seedName: 'SeedName',
  setSeedName: () => true,
  setLoot: () => true,
  setMonsters: () => true,
  setLevelSize: () => true,
  setPlayerLevel: () => true,
  setGameLength: () => true,
  setPlayMode: () => true,
  setPlayerClass: () => true,

  newGame: () => true,
  selectedGame: 'Player',
  selectGame: () => true,

  toggleEditor: () => true

};

describe('Component <GameStartScreen>', () => {
    it('should render', () => {
        const wrapper = shallow(<GameStartScreen {...props} />);
        expect(wrapper, 'Component must render with shallow').to.have.length(1);
    });
});
