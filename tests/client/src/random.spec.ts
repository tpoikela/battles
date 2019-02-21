
import { expect } from 'chai';
import {Random} from '../../../client/src/random';

describe('Random', () => {

    let rng = null;

    beforeEach(() => {
        rng = new Random();
    });

    it('has random stability', () => {
        const arr = [1, 2, 3, 4, 5];
        rng.setSeed(1234);
        const randIndex = rng.randIndex(arr);
        rng = new Random();
        rng.setSeed(1234);
        const secondIndex = rng.randIndex(arr);
        expect(randIndex, 'Both indices must be same').to.equal(secondIndex);

    });
});
