
import { expect } from 'chai';

import {Animation, Frame} from '../../../client/src/animation';

describe('Animation', () => {

    it('consists of several frames', () => {
        const fr: Frame = {
            '0,0': {char: 'X', className: 'KKK'},
            '0,1': {char: 'W', className: 'WWW'}
        }
        const anim1 = new Animation();
        anim1.addFrame(fr);
        expect(anim1.hasFrames()).to.equal(true);

        const coordMap = {'0,0': true};
        expect(anim1.hasCoord(coordMap)).to.equal(true);

        const coordMap2 = {'2,2': true};
        expect(anim1.hasCoord(coordMap2)).to.equal(false);
    });

    it('can be combined with other animations', () => {
        const anim1 = new Animation();
        const anim2 = new Animation();
        const fr1 = {'1,2': {char: '*', className: 'xxx'}};

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
