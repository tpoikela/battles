
const RG = require('./rg');

RG.Animation = {};

RG.Animation.Animation = function() {

    this.numFrames = 0;
    this.currFrame = 0;

    this.frames = [];

    this.addFrame = function(frame) {
        ++this.numFrames;
        this.frames.push(frame);
    };

    /* Advances animation to the next frame. */
    this.nextFrame = function() {
        const frame = this.frames[this.currFrame++];
        return frame;
    };

    this.hasFrames = function() {
        return this.currFrame < this.frames.length;
    };

};

module.exports = RG.Animation;
