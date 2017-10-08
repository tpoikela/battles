
import React from 'react';
import { mount, shallow } from 'enzyme';
import chaiEnzyme from 'chai-enzyme';
import chai, { expect } from 'chai';

import GameEditor from '../../../client/editor/game-editor';

chai.use(chaiEnzyme());

// Props with non-default values passes to the component
const props = {

};

describe('Component <GameEditor>', function() {
    this.timeout(5000);

    it('should render with shallow', () => {
        const wrapper = shallow(<GameEditor {...props} />);
        expect(wrapper, 'Component must render with shallow').to.have.length(1);
    });

    it('should respond correctly to button onClick-callbacks', () => {
        const wrapper = shallow(<GameEditor {...props} />);
        expect(wrapper, 'Component must render with mount').to.have.length(1);

        const genActorsBtn = wrapper.find('#btn-gen-actors');
        const genItemsBtn = wrapper.find('#btn-gen-items');
        genActorsBtn.simulate('click');
        genItemsBtn.simulate('click');

        const currLevel = wrapper.state('level');
        expect(currLevel.getActors(), 'Level has actors')
            .to.have.length.above(0);
        expect(currLevel.getItems(), 'Level has items')
            .to.have.length.above(0);

        const genLevelBtn = wrapper.find('#btn-gen-level');
        genLevelBtn.simulate('click');
        let levels = wrapper.state('levelList');
        expect(levels).to.have.length(2);

        const args = {
            stopPropagation: () => null,
            target: {id: '#btn-delete-level-0'}
        };

        const delLevel0Btn = wrapper.find('#btn-delete-level-0');
        delLevel0Btn.simulate('click', args);
        levels = wrapper.state('levelList');
        expect(levels).to.have.length(1);

        const saveLevelBtn = wrapper.find('#btn-save-level');
        saveLevelBtn.simulate('click');
        expect(localStorage.getItem('savedLevel')).to.be.string;

    });

    /* it('can create a full world level', () => {
        const wrapper = shallow(<GameEditor {...props} />);
        const genWorldBtn = wrapper.find('#btn-gen-world');
        wrapper.setState({levelX: 400, levelY: 400});
        genWorldBtn.simulate('click');
        const levels = wrapper.state('levelList');
        expect(levels).to.have.length(2);
    });*/

    it('has insert buttons for entities/elements', () => {
        const wrapper = shallow(<GameEditor {...props} />);
        const buttons = ['#btn-insert-item', '#btn-insert-element',
            '#btn-insert-actor'];

        wrapper.setState({actorName: 'dwarven elite', itemName: 'dagger'});
        buttons.forEach(btnID => {
            const button = wrapper.find(btnID);
            button.simulate('click');
            expect(wrapper.state('errorMsg')).to.equal('');
        });
        const currLevel = wrapper.state('level');
        expect(currLevel.getActors(), 'Level has 1 actor')
            .to.have.length(1);
        // expect(currLevel.getItems(), 'Level has 1 item')
        // .to.have.length(1);

    });

});
