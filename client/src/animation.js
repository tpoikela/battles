
const RG = require('./rg');

RG.Animation = {};

/* Very simple "animation" object handed to the Screen object. slowDown can be
 * used to repeat the frame for addFrame() multiple times.
 *  Each frame should be an object such as
 *  {
 *    '1,1': {char: '-', className: 'css-class'},
 *    '2,2': {char: '-', className: 'css-class'}
 *  }
 * Screen object will always render specified chars to the given locations
 * over normal map cells.
 * */
RG.Animation.Animation = function() {
    this.levelID = -1;
    this.numFrames = 0;
    this.currFrame = 0;

    // "Slows" down the animation by this factor
    this.slowDown = 2;

    this.frames = [];
};

RG.Animation.Animation.prototype.setLevel = function(level) {
    this.levelID = level.getID();
};

RG.Animation.Animation.prototype.addFrame = function(frame) {
    for (let i = 0; i < this.slowDown; i++) {
        ++this.numFrames;
        this.frames.push(frame);
    }
};

/* Advances animation to the next frame, and returns the frame */
RG.Animation.Animation.prototype.nextFrame = function() {
    const frame = this.frames[this.currFrame++];
    return frame;
};

RG.Animation.Animation.prototype.hasFrames = function() {
    return this.currFrame < this.frames.length;
};

/* Combines the frames of two animations together. */
RG.Animation.Animation.prototype.combine = function(animation) {
    let frameIndex = 0;
    while (animation.hasFrames()) {
        const frame = animation.nextFrame();
        if (frameIndex < this.frames.length) {
            const frameKeys = Object.keys(frame);
            for (let i = 0; i < frameKeys.length; i++) {
                const xy = frameKeys[i];
                this.frames[frameIndex][xy] = frame[xy];
            }
        }
        else {
            this.frames.push(frame);
        }
        ++frameIndex;
    }
};

/* Returns true if any frame in the animation contains at least one coordinates
 * from the given list. */
RG.Animation.Animation.prototype.hasCoord = function(coordMap) {
    const nFrames = this.frames.length;
    for (let n = 0; n < nFrames; n++) {
        const frame = this.frames[n];
        for (const key in frame) {
            if (coordMap[key]) {
                return true;
            }
        }
    }
    return false;
};

module.exports = RG.Animation;
