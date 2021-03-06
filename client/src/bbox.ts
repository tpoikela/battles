
import RG from './rg';
import {TCoord} from './interfaces';
import {Random} from './random';

const RNG: Random = Random.getRNG();

/* Bounding box (BBox) is defined 4 points:
 * upper-left X: ulx (smaller X)
 * upper-left Y: uly (smaller Y)
 * lower-right X: lrx (higher X)
 * lower-right Y: lry (higher Y)
 */

interface IBBox {
    ulx: number;
    uly: number;
    lrx: number;
    lry: number;
}

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

    public withOffsetXY(x: number, y: number): BBox {
        return new BBox(this.ulx + x, this.uly + y,
                        this.lrx + x, this.lry + y
        );
    }

}
