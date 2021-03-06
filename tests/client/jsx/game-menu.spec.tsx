
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
        const level = RG.FACT.createLevel('arena', 10, 10);
        level.addActor(actor, 1, 1);
        const actorClass = new ActorClass.Adventurer(actor);
        const props = {
            width: 80, height: 28, menuObj: {}
        };
        const wrapper = shallow(<GameMenu {...props} />);

        for (let level = 2; level <= 5; level++) {
            const reToMatch = [
                {match: false, re: /was increased/},
                {match: false, re: /leveler is/},
                {match: false, re: /Rendered as post-menu item/},
                {match: false, re: /Another post-menu item/}
            ];

            actor.get('Experience').setExpLevel(level);
            actorClass.advanceLevel();
            const menuObjItem = ActorClass.getLevelUpObject(level, actorClass);
            const menuObj = menuObjItem.getMenu();
            menuObj.post = ['Rendered as post-menu item',
                'Another post-menu item'];

            props.menuObj = menuObj;
            wrapper.setProps(props);

            const spanElems = wrapper.find('span');
            for (let i = 0; i < 10; i++) {
                const spanElem = spanElems.get(i);
                const text = spanElem.props.dangerouslySetInnerHTML.__html;
                reToMatch.forEach(reProp => {
                    if (reProp.re.test(text)) {
                        reProp.match = true;
                    }
                });
            }

            reToMatch.forEach(reProp => {
                expect(reProp.match, reProp.re).to.equal(true);
            });
        }

    });
});
