
import RG from '../rg';
import {SystemBase} from './system.base';
import {Geometry} from '../geometry';
import {EventPool} from '../eventpool';
import {Animation, TAnimFrame} from '../animation';

type Entity = import('../entity').Entity;

/* System which constructs the animations to play. Animation here means a data
 * structure that the GUI can use to draw the animation. */
export class SystemAnimation extends SystemBase {

    public currAnim: Animation;
    private _enabled: boolean;

    constructor(compTypes: string[], pool: EventPool) {
        super(RG.SYS.ANIMATION, compTypes, pool);
        this._enabled = true;
        this.currAnim = null;
    }

    public enableAnimations() {this._enabled = true;}
    public disableAnimations() {this._enabled = false;}

    /* Construct a missile animation from Missile component. */
    public missileAnimation(ent: Entity, args): void {
        const mComp = args.missile;
        const xEnd = args.to[0];
        const yEnd = args.to[1];
        const xy = mComp.first();
        let xCurr = xy[0];
        let yCurr = xy[1];

        // Grab correct ascii char/css style for the missile
        const missEnt = args.item;
        const char = RG.getChar(RG.TYPE_ITEM, missEnt.getName());
        const cssClass = RG.getCssClass(RG.TYPE_ITEM, missEnt.getName());

        const animation = this._createAnimation(args);
        while (xCurr !== xEnd || yCurr !== yEnd) {
            const frame = {};
            const key = xCurr + ',' + yCurr;
            frame[key] = {};
            frame[key].char = char;
            frame[key].className = cssClass;
            animation.addFrame(frame);

            if (mComp.next()) {
                xCurr = mComp.getX();
                yCurr = mComp.getY();
            }
            else {
                break;
            }
        }
        this._setCurrAnim(animation);
    }

    /* Constructs line animation (a bolt etc continuous thing). */
    public lineAnimation(ent: Entity, args): void {
        let x = args.from[0];
        let y = args.from[1];
        const dX = args.dir[0];
        const dY = args.dir[1];
        let rangeLeft = args.range;

        let lineChar: string = RG.dirToChar(args.dir);
        if (args.lineChar) {
            lineChar = args.lineChar;
        }

        const animation = this._createAnimation(args);
        const frame: TAnimFrame = {};
        if (args.ray) {
            while (rangeLeft > 0) {
                x += dX;
                y += dY;
                frame[x + ',' + y] = {
                    char: lineChar || '*',
                    className: args.className || 'cell-ray'
                };

                let frameCopy: TAnimFrame = {};
                frameCopy = Object.assign(frameCopy, frame);
                animation.addFrame(frameCopy);
                --rangeLeft;
            }
        }
        this._setCurrAnim(animation);
    }

    public cellAnimation(ent: Entity, args): void {
        const animation = this._createAnimation(args);
        const frame = {};
        animation.slowDown = 10;
        args.coord.forEach(xy => {
            frame[xy[0] + ',' + xy[1]] = {
                char: args.cellChar || '*',
                className: args.className || 'cell-animation'
            };
        });

        animation.addFrame(frame);
        this._setCurrAnim(animation);
    }

    public areaAnimation(ent: Entity, args): void {
        const animation = this._createAnimation(args);
        const maxRange = args.range;
        const [cX, cY] = [args.cX, args.cY];

        for (let r = 1; r <= maxRange; r++) {
            const frame = {};
            const coord = Geometry.getBoxAround(cX, cY, r);
            coord.forEach(xy => {
                frame[xy[0] + ',' + xy[1]] = {
                    char: args.cellChar || '*',
                    className: args.className || 'cell-animation'
                };
            });
            animation.addFrame(frame);
        }
        this._setCurrAnim(animation);
    }

    public _createAnimation(args): Animation {
        const animation = new Animation();
        animation.setLevel(args.level);
        return animation;
    }

    public updateEntity(ent: Entity): void {
        if (this._enabled) {
            const allAnimComps = ent.getList('Animation');
            allAnimComps.forEach(animComp => {
                const args = animComp.getArgs();
                if (args.dir) {
                    this.lineAnimation(ent, args);
                }
                else if (args.missile) {
                    this.missileAnimation(ent, args);
                }
                else if (args.cell) {
                    this.cellAnimation(ent, args);
                }
                else if (!RG.isNullOrUndef([args.range, args.cX, args.cY])) {
                    this.areaAnimation(ent, args);
                }
            });
        }
        ent.removeAll('Animation');

        // After processing all animation for all entitities, emit an event
        // to notify the Game Engine about animation
        if (!this.hasEntities()) {
            this.pool.emitEvent(RG.EVT_ANIMATION, {animation: this.currAnim});
            this.currAnim = null;
        }
    }

    private _setCurrAnim(animation): void {
        if (!this.currAnim) {this.currAnim = animation;}
        else {this.currAnim.combine(animation);}
    }
}
