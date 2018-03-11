
import React from 'react';
import { shallow } from 'enzyme';
import chaiEnzyme from 'chai-enzyme';
import chai, { expect } from 'chai';

import GameCharInfo from '../../../client/jsx/game-char-info';

const RG = require('../../../client/src/battles');

chai.use(chaiEnzyme());

// Props with non-default values passes to the component

describe('Component <GameCharInfo>', () => {

    let player = null;
    let props = null;

    beforeEach(() => {
        const gameFact = new RG.Factory.Game();
        const conf = {playerClass: 'Marksman', playerLevel: 'Medium',
        playerRace: 'goblin'};
        player = gameFact.createPlayerUnlessLoaded(conf);
        props = {player};
    });

    it('should render without errors', () => {
        const wrapper = shallow(<GameCharInfo {...props} />);
        expect(wrapper, 'Component must render with shallow').to.have.length(1);
    });

    it('has buttons for selecting different tabs', () => {
        const wrapper = shallow(<GameCharInfo {...props} />);
        expect(wrapper, 'Component must render with shallow').to.have.length(1);
        const buttons = wrapper.find('button');
        expect(buttons.length).to.be.at.least(5);

        const tabButtons = wrapper.find('.tab-select-button');
        expect(tabButtons.length).to.equal(4);

        tabButtons.forEach(btn => btn.simulate('click'));
    });
});
