
import { expect } from 'chai';
import {GameObject} from '../../../client/src/game-object';

describe('GameObject', () => {
    it('it has unique object ID', () => {
        const obj1 = new GameObject();
        const obj2 = new GameObject();
        expect(obj1.getID()).to.not.equal(obj2.getID());
    });
});
