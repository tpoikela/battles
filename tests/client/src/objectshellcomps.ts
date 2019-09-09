
// import RG from '../../../client/src/rg';
import chai from 'chai';
import {ObjectShellComps} from '../../../client/src/objectshellcomps';
import {chaiBattles} from '../../helpers/chai-battles';

import {SentientActor} from '../../../client/src/actor';

const expect = chai.expect;
chai.use(chaiBattles);

describe('ObjectShellComps', () => {

    let compGen = null;
    let actor = null;

    beforeEach(() => {
        compGen = new ObjectShellComps();
        actor = new SentientActor('test actor');
    });

    it('It can add simple components from string', () => {
        compGen.addComponents({addComp: 'Flying'}, actor);
        expect(actor).to.have.component('Flying');
    });

    it('can add component and set some values', () => {
        const shellData = {addComp: {comp: 'Stats', func: {setStrength: 17}}};
        const loreData = {addComp: {comp: 'Lore', func: {
            setTopics: {mainQuest: ['You should do X, or ...']}
        }}};
        compGen.addComponents(shellData, actor);
        expect(actor.get('Stats').getStrength()).to.equal(17);

        compGen.addComponents(loreData, actor);
        expect(actor).to.have.component('Lore');

        const loreComp = actor.get('Lore');
        const topics = loreComp.getLoreTopics();
        const mainQuest = topics.mainQuest;
        expect(mainQuest).to.have.length(1);
    });

    it('can add 2 comps with same type', () => {
        const shellData = {
            addComp: [
                {comp: 'Lore', func: {setTopics: {data: 123}}},
                {comp: 'Lore', func: {setTopics: {mainQuest: ['abc']}}},
            ]
        };
        compGen.addComponents(shellData, actor);
        const loreComps = actor.getList('Lore');
        expect(loreComps).to.have.length(2);

    });

});
