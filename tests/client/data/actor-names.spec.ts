
import {expect} from 'chai';
import {ActorNames} from '../../../client/data/actor-names';

describe('ActorNames', () => {
    it('generates names for unique actors', () => {

        for (let i = 0; i < 500; i++) {
            // const name = ActorNames.getName();
            const name = ActorNames.getModName();
            const msg = `Name ${name} is OK`;
            expect(ActorNames.isNameOk(name), msg).to.equal(true);
        }

    });
});
