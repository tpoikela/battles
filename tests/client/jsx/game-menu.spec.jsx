
import React from 'react';
import { shallow } from 'enzyme';
import chaiEnzyme from 'chai-enzyme';
import chai, { expect } from 'chai';

import GameMenu from '../../../client/jsx/game-menu';

const RG = require('../../../client/src/battles');
const ActorClass = require('../../../client/src/actor-class');

chai.use(chaiEnzyme());

// Props with non-default values passes to the component
const props = {
    width: 80,
    height: 28,
    menuObj: {}
};

describe('Component <GameMenu>', () => {
    it('should render', () => {
        const wrapper = shallow(<GameMenu {...props} />);
        expect(wrapper, 'Component must render with shallow').to.have.length(1);
    });

    it('has one span per rendered text row', () => {
        const wrapper = shallow(<GameMenu {...props} />);
        const spans = wrapper.find('span');
        expect(spans).to.have.length(props.height);

        const spanElemProps = spans.get(0).props;
        expect(spanElemProps.dangerouslySetInnerHTML.__html)
            .to.have.length.above(79);
    });

    it('shows the level info when leveling up', () => {
        const actor = new RG.Actor.Rogue('leveler');
        actor.get('Experience').setExpLevel(4);
        const actorClass = new ActorClass.Adventurer(actor);
        actorClass.advanceLevel();

        const menuObjItem = ActorClass.getLevelUpObject(4, actorClass);
        const menuObj = menuObjItem.getMenu();
        menuObj.post = ['Rendered as post-menu item'];
        const props = {
            width: 80, height: 28, menuObj
        };
        const wrapper = shallow(<GameMenu {...props} />);
        const spanElems = wrapper.find('span');
        for (let i = 0; i < 10; i++) {
            const spanElem = spanElems.get(i);
            const text = spanElem.props.dangerouslySetInnerHTML.__html;
            console.log(text);
        }
    });
});
