
import React from 'react';
import { shallow } from 'enzyme';
import chaiEnzyme from 'chai-enzyme';
import chai, { expect } from 'chai';
// import Modal from 'react-modal';

import GameBoard from '../../../client/jsx/game-board';
import GameOverworldMap from '../../../client/jsx/game-overworld-map';

const OW = require('../../../client/src/overworld.map');

chai.use(chaiEnzyme());

// Props with non-default values passes to the component
const props = {

};

describe('Component <GameOverworldMap>', () => {
    it('should render', () => {
        const wrapper = shallow(<GameOverworldMap {...props} />);
        expect(wrapper, 'Component must render with shallow').to.have.length(1);
    });


    it('has multiple tabs to shown', () => {
        let toggled = false;
        const conf = {
            owTilesX: 40,
            owTilesY: 20
        };
        const props = {
            ow: OW.createOverWorld(conf),
            toggleScreen: () => {toggled = !toggled;},
            playerOwPos: [5, 5],
            showOWMap: true
        };
        const wrapper = shallow(<GameOverworldMap {...props} />);
        let board = wrapper.find(GameBoard);
        expect(board).to.have.length(0);

        wrapper.setState({tabShown: 'Region'});
        wrapper.update();

        board = wrapper.find(GameBoard);
        expect(board).to.have.length(1);
    });
});
