
type Level = import('./level').Level;

export interface TAnimFrameEntry {
    char: string;
    className: string;
}

export interface TAnimFrame {
    [key: string]: TAnimFrameEntry;
}

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
export class Animation {

    public levelID: number;
    public numFrames: number;
    public currFrame: number;

    // "Slows" down the animation by this factor
    public slowDown: number;

    public frames: TAnimFrame[];

    constructor() {
        this.levelID = -1;
        this.numFrames = 0;
        this.currFrame = 0;

        // "Slows" down the animation by this factor
        this.slowDown = 2;

        this.frames = [];
    }

    public setLevel(level: Level): void {
        this.levelID = level.getID();
    }

    public addFrame(frame: TAnimFrame): void {
        for (let i = 0; i < this.slowDown; i++) {
            ++this.numFrames;
            this.frames.push(frame);
        }
    }

    /* Advances animation to the next frame, and returns the frame */
    public nextFrame(): TAnimFrame {
        const frame = this.frames[this.currFrame++];
        return frame;
    }

    public hasFrames(): boolean {
        return this.currFrame < this.frames.length;
    }

    /* Combines the frames of two animations together. */
    public combine(animation: Animation): void {
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
    }

    /* Returns true if any frame in the animation contains at least one coordinates
     * from the given coordinate map. */
    public hasCoord(coordMap: {[key: string]: any}): boolean {
        const nFrames = this.frames.length;
        for (let n = 0; n < nFrames; n++) {
            const frame: TAnimFrame = this.frames[n];
            for (const key in frame) {
                if (coordMap[key]) {
                    return true;
                }
            }
        }
        return false;
    }
}
