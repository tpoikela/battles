
import RG from './rg';
import {TCoord, IBBox} from './interfaces';
import {Random} from './random';

const RNG: Random = Random.getRNG();

type TLine = [TCoord, TCoord];

const SIDE_TOP = 0;
const SIDE_LEFT = 1;
const SIDE_RIGHT = 2;
const SIDE_BOTTOM = 3;

/* Bounding box (BBox) is defined 4 points:
 * upper-left X: ulx (smaller X)
 * upper-left Y: uly (smaller Y)
 * lower-right X: lrx (higher X)
 * lower-right Y: lry (higher Y)
 */

export class BBox {

    /* Create from existing bbox interface. */
    public static fromBBox(bbox: IBBox): BBox {
        return new BBox(
            bbox.ulx, bbox.uly, bbox.lrx, bbox.lry
        );
    }

    constructor(
        public ulx: number, public uly: number,
        public lrx: number, public lry: number)
    {
        if (ulx > lrx || uly > lry) {
            RG.err('BBox', 'constructor',
                `Illegal bbox: ${ulx},${uly} -> ${lrx},${lry}`);
        }

    }

    /* Computes distance from given xy to edge of bbox. Returns 0 if xy is within the bbox. */
    public getDist(xy: TCoord): TCoord {
        const [x, y] = xy;
        if (this.hasXY(x, y)) {return [0, 0];}
        const dX = this.getDistX(x);
        const dY = this.getDistY(y);
        return [dX, dY];
    }

    public getDistX(x: number): number {
        if (x < this.ulx) {
            return this.ulx - x;
        }
        else {
            return x - this.lrx;
        }
    }

    public getDistY(y: number): number {
        if (y < this.uly) {
            return this.uly - y;
        }
        else {
            return y - this.lry;
        }
    }

    public getArea(): number {
        return this.getSizeX() * this.getSizeY();
    }

    public getSizeX(): number {
        return (this.lrx - this.ulx) + 1;
    }

    public getSizeY(): number {
        return (this.lry - this.uly) + 1;
    }

    public hasXY(x: number, y: number): boolean {
        return (x >= this.ulx && x <= this.lrx) &&
            (y >= this.uly && y <= this.lry);
    }

    public getRandXY(): TCoord {
        const x = RNG.getUniformInt(this.ulx, this.lrx);
        const y = RNG.getUniformInt(this.uly, this.lry);
        return [x, y];
    }

    /* Returns true if there is at least one overlapping coordinate
     * in the given bbox. */
    public overlaps(rhs: BBox): boolean {
        // Check for X-coord overlap first
        if (this.overlapsX(rhs)) {
            return this.overlapsY(rhs);
        }
        return false;
    }

    /* Returns true if the X-coordinates overlap. */
    public overlapsX(rhs: BBox): boolean {
        if (rhs.ulx >= this.ulx && rhs.ulx <= this.lrx) {
            return true;
        }
        else if (rhs.lrx >= this.ulx && rhs.lrx <= this.lrx) {
            return true;
        }
        return false;
    }

    /* Returns true if the Y-coordinates overlap. */
    public overlapsY(rhs: BBox): boolean {
        if (rhs.uly >= this.uly && rhs.uly <= this.lry) {
            return true;
        }
        else if (rhs.lry >= this.uly && rhs.lry <= this.lry) {
            return true;
        }
        return false;
    }

    public getBorderXY(dir: string, offset: number = 0): TCoord[] {
        const res: TCoord[] = [];
        let adjust = offset || 0;
        if (/N/.test(dir)) {
            for (let x = this.ulx; x <= this.lrx; ++x) {
                res.push([x, this.uly + adjust]);
            }
        }
        if (/S/.test(dir)) {
            for (let x = this.ulx; x <= this.lrx; ++x) {
                if (adjust > 0) {adjust = -adjust;}
                res.push([x, this.lry + adjust]);
            }
        }
        if (/E/.test(dir)) {
            for (let y = this.uly; y <= this.lry; ++y) {
                if (adjust > 0) {adjust = -adjust;}
                res.push([this.lrx + adjust, y]);
            }
        }
        if (/W/.test(dir)) {
            for (let y = this.uly; y <= this.lry; ++y) {
                res.push([this.ulx + adjust, y]);
            }
        }
        return res;
    }

    public getSides(): TLine[] {
        const res: TLine[] = [
            [[this.ulx, this.uly], [this.lrx, this.uly]], // Top
            [[this.ulx, this.uly], [this.ulx, this.lry]], // Left
            [[this.lrx, this.uly], [this.lrx, this.lry]], // Right
            [[this.ulx, this.lry], [this.lrx, this.lry]], // Bottom
        ];
        return res;
    }

    public getMatchingSide(rhs: BBox): [number, TLine] | null {
        const sides: TLine[] = this.getSides();
        const rhsSides: TLine[] = rhs.getSides();
        for (let i = 0; i < sides.length; i++) {
            const side = sides[i];
            for (let j = 0;  j < rhsSides.length; j++) {
                const rhsSide = rhsSides[j];
                if (sidesMatch(side, rhsSide)) {
                    return [i, side];
                }
            }
        }
        return null;
    }

    public combine(rhs: BBox): BBox | null {
        const side = this.getMatchingSide(rhs);
        if (side) {
            const [n, line] = side;
            if (n === SIDE_TOP) {
                // rhs above this bbox
                return new BBox(rhs.ulx, rhs.uly, this.lrx, this.lry);
            }
            else if (n === SIDE_LEFT) {
                // rhs left of this bbox
                return new BBox(rhs.ulx, rhs.uly, this.lrx, this.lry);
            }
            else if (n === SIDE_RIGHT) {
                // rhs right of this bbox
                return new BBox(this.ulx, this.uly, rhs.lrx, rhs.lry);
            }
            else {
                return new BBox(this.ulx, this.uly, rhs.lrx, rhs.lry);
            }
        }
        return null;
    }

    /* Returns a box of coordinates given starting point and end points
     * (inclusive). */
    public getCoord(): TCoord[] {
        const res: TCoord[] = [];
        for (let x = this.ulx; x <= this.lrx; x++) {
            for (let y = this.uly; y <= this.lry; y++) {
                res.push([x, y]);
            }
        }
        return res;
    }

    /* Creates a new BBox with given x,y offsets. */
    public withOffsetXY(x: number, y: number): BBox {
        return new BBox(this.ulx + x, this.uly + y,
                        this.lrx + x, this.lry + y
        );
    }

    /* Returns center for the bbox. If getSizeX/Y return odd numbers, the center
     * will be exact for that coordinate. Otherwise, center will be rounded. */
    public getCenter(): TCoord {
        const xSize = this.getSizeX();
        const ySize = this.getSizeY();
        return [
            this.ulx + Math.round(xSize / 2),
            this.uly + Math.round(ySize / 2)
        ];
    }

}

/* Returns true if the 2 given sides match (have same start/end). */
function sidesMatch(lhs: TLine, rhs: TLine): boolean {
    const [cl0, cl1] = lhs;
    const [cr0, cr1] = rhs;
    if (cl0[0] === cr0[0] && cl0[1] === cr0[1]) {
        if (cl1[0] === cr1[0] && cl1[1] === cr1[1]) {
            return true;
        }
    }
    return false;
}
