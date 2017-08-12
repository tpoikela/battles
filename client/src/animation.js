
const RG = require('./rg');

RG.Animation = {};

/* Very simple "animation" object handed to the Screen object. slowDown can be
 * used to repeat the frame for addFrame() multiple times.
 *  Each frame should be an object such as
 *  {
 *    '1,1': {char: '-', className: 'css-class'},
 *    '2,2': {char: '-', className: 'css-class'}
 *  }
 * Screen will always render specified chars to the given locations over normal
 * map cells.
 * */
RG.Animation.Animation = function() {

    this.numFrames = 0;
    this.currFrame = 0;

    // "Slows" down the animation by this factor
    this.slowDown = 2;

    this.frames = [];

    this.addFrame = function(frame) {
        for (let i = 0; i < this.slowDown; i++) {
            ++this.numFrames;
            this.frames.push(frame);
        }
    };

    /* Advances animation to the next frame, and returns the frame */
    this.nextFrame = function() {
        const frame = this.frames[this.currFrame++];
        return frame;
    };

    this.hasFrames = function() {
        return this.currFrame < this.frames.length;
    };

};

module.exports = RG.Animation;
