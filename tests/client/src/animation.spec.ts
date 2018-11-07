
import { expect } from 'chai';

const Animation = require('../../../client/src/animation').Animation;

describe('Animation', () => {
    it('can be combined with other animations', () => {
        const anim1 = new Animation();
        const anim2 = new Animation();
        const fr1 = {'1,2': {cell: '*', className: 'xxx'}};

        anim1.slowDown = 1;
        anim1.addFrame(fr1);

        anim2.slowDown = 2;
        anim2.addFrame(fr1);

        expect(anim1.frames).to.have.length(1);
        anim1.combine(anim2);
        expect(anim2.frames).to.have.length(2);
        expect(anim1.frames).to.have.length(2);
    });
});
