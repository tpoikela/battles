
import RG from './rg';
import {TCoord, TCoord3D} from './interfaces';
import {Geometry} from './geometry';

type CellMap = import('./map').CellMap;

type LightPassesCb = (x: number, y: number, z: number) => boolean;

const MIN_Z = 0;
const MAX_Z = 3;

export class Fov3D {


    protected _passCb: LightPassesCb;
    protected _map: CellMap;
    protected _maxZ: number;

    protected _distSquare: number;
    protected _seen: {[key: string]: boolean};
    protected _alreadySeen: {[key: string]: boolean};

    constructor(map: CellMap, cb: (x, y, z) => boolean) {
        this._passCb = cb;
        this._map = map;
        this._maxZ = MAX_Z; // TODO get from map
        this._distSquare = 0;
        this._maxZ = this.calcMapMaxZ(map);
        this._seen = {};
        this._alreadySeen = {};
    }

    public canSeeCell(pos: TCoord3D, r: number, dest: TCoord3D): boolean {
        let res = false;
        const rr = this._init(r);
        const [xx, yy, zz] = dest;
        const cb = (x, y, z) => {
            if (xx === x && yy === y && zz === z) {
                res = true;
            }
        };
        this._internalViewTo(pos, rr, xx, yy, zz, cb);
        return res;
    }

    public _init(r: number): number {
        const rr = r + 1;
        this._distSquare = rr * rr;
        this._seen = {};
        this._alreadySeen = {};
        return rr;
    }

    public compute(x: number, y: number, z: number, r: number, compCb): void {
        const pos: TCoord3D = [x, y, z];
        const rr = this._init(r);

        // Z-dim is limited to what's actually used in the game, maxZ could be
        // same as 'rr' in fully 3D world
        compCb(x, y, z, true);
        const key = RG.toKey([x, y, z]);
        this._seen[key] = true;

        // Get the bbox border
        // const bbox = {ulx: x - rr, uly: y - rr, lrx: x + rr, lry: y + rr};
        // const coord: TCoord[] = Geometry.getBorderForBbox(bbox);

        const x0 = x - rr;
        const y0 = y - rr;
        const maxX = x + rr;
        const maxY = y + rr;

        for (let zz = MIN_Z; zz <= this._maxZ;  ++zz) {
            /*
            coord.forEach((xy: TCoord) => {
            });
            */
            // for (let xx = x0; xx <= maxX; xx++) {
            for (let yy = y0; yy <= maxY; yy++) {
                this._internalViewTo(pos, rr, x0, yy, zz, compCb);
                this._internalViewTo(pos, rr, maxX, yy, zz, compCb);
            }
            for (let xx = x0; xx <= maxX; xx++) {
                this._internalViewTo(pos, rr, xx, y0, zz, compCb);
                this._internalViewTo(pos, rr, xx, maxY, zz, compCb);
            }
            // }
            /*
            for (let i = -rr; i <= rr; i++) {
                this._internalViewTo(pos, rr, i, rr, zz, compCb);
                this._internalViewTo(pos, rr, i, -rr, zz, compCb);
                this._internalViewTo(pos, rr, rr, i, zz, compCb);
                this._internalViewTo(pos, rr, -rr, i, zz, compCb);
            }
            */
        }
    }

    public _compute(x: number, y: number, z: number, r: number, compCb): void {
        const pos: TCoord3D = [x, y, z];
        const rr = r + 1;
        this._distSquare = rr * rr;
        this._seen = {};
        this._alreadySeen = {};

        // Z-dim is limited to what's actually used in the game, maxZ could be
        // same as 'rr' in fully 3D world
        compCb(x, y, z, true);
        const key = RG.toKey([x, y, z]);
        this._seen[key] = true;

        for (let zz = MIN_Z; zz <= this._maxZ;  ++zz) {
            for (let i = -rr; i <= rr; i++) {
                this._internalViewTo(pos, rr, i, rr, zz, compCb);
                this._internalViewTo(pos, rr, i, -rr, zz, compCb);
                this._internalViewTo(pos, rr, rr, i, zz, compCb);
                this._internalViewTo(pos, rr, -rr, i, zz, compCb);
            }
        }
    }

    // Ported from https://github.com/thebracket/bgame
    // File: bgame/src/systems/physics/visibility_system.cpp
    protected _internalViewTo(pos: TCoord3D, r, x, y, z, compCb): void {
        let blocked = false
        // const dest: TCoord3D = [pos[0] + x, pos[1] + y, pos[2] + z];
        const dest: TCoord3D = [x, y, z];

        const key = RG.toKey(dest);
        if (this._alreadySeen[key]) {
            return;
        }
        this._alreadySeen[key] = true;

        const coord = Geometry.lineFuncUnique3D(pos, dest);
        const nsize = coord.length;

        for (let i = 0; i < nsize; i++) {
            const [atX, atY, atZ] = coord[i];
            if (blocked) {return;}
            if (this._map.hasXY(atX, atY)) {
                const atXYZ: TCoord3D = [atX, atY, atZ];
                const distance = Geometry.distance3DSquared(pos, atXYZ);

                if (distance < this._distSquare) {
                    const key2 = RG.toKey(atXYZ);
                    if (!this._seen[key2]) {
                        compCb(atX, atY, atZ, !blocked);
                        this._seen[key2] = true;
                    }

                    const zz = this._map._map[atX][atY].getBaseElem().getZ();
                    let passes = false;
                    if (atZ >= zz) {
                        passes = this._map._map[atX][atY].lightPasses(); // delegate to cell
                    }
                    // hasXY is true already
                    // if (!this._passCb(atX, atY, atZ)) {
                    if (!passes) {
                        blocked = true;
                        if (pos[0] === atX && pos[1] === atY && pos[2] === atZ) {
                            blocked = false;
                        }
                    }
                }
            }
        }

    }

    public calcMapMaxZ(map: CellMap): number {
        let maxZ = 0;
        RG.forEach2D(map._map, (x, y, cell) => {
            if (cell) {
                if (cell.getZ() > maxZ) {
                    maxZ = cell.getZ();
                }
            }
        });
        return maxZ;
    }

};
