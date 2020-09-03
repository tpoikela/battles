
import RG from './rg';
import {TCoord3D} from './interfaces';
import {Geometry} from './geometry';

type CellMap = import('./map').CellMap;

type LightPassesCb = (x: number, y: number, z: number) => boolean;

const MIN_Z = 0;
const MAX_Z = 3;

export class Fov3D {

    protected _passCb: LightPassesCb;
    protected _map: CellMap;
    protected _seen: {[key: string]: boolean};
    protected _maxZ: number;

    constructor(map: CellMap, cb: (x, y, z) => boolean) {
        this._passCb = cb;
        this._map = map;
        this._maxZ = MAX_Z; // TODO get from map
    }


    public compute(x: number, y: number, z: number, r: number, compCb): void {
        const pos: TCoord3D = [x, y, z];
        const rr = r + 1;
        this._seen = {};

        // Z-dim is limited to what's actually used in the game, maxZ could be
        // same as 'rr' in fully 3D world
        for (let zz = MIN_Z; zz < this._maxZ;  ++zz) {
            for (let i = -rr; i <= rr; i++) {
                this.internalViewTo(pos, rr, i, rr, zz, compCb);
                this.internalViewTo(pos, rr, i, -rr, zz, compCb);
                this.internalViewTo(pos, rr, rr, i, zz, compCb);
                this.internalViewTo(pos, rr, -rr, i, zz, compCb);
            }
        }
    }

    // Ported from https://github.com/thebracket/bgame
    // File: bgame/src/systems/physics/visibility_system.cpp
    protected internalViewTo(pos: TCoord3D, r, x, y, z, compCb): void {
        const distSquare = r * r;
        let blocked = false
        const [x0, y0, z0] = pos;
        const src: TCoord3D = [x0, y0, z0];
        const dest: TCoord3D = [x0 + x, y0 + y, z0 + z];
        // console.log('Starting at ', src);
        // console.log('Ending at ', dest);

        Geometry.lineFuncUnique3D(src, dest, (atX, atY, atZ) => {
            if (blocked) {return;}
            if (this._map.hasXY(atX, atY)) {
                const distance = Geometry.distance3DSquared(pos, [atX, atY, atZ]);
                if (distance < distSquare) {
                    //std::cout << " - Visit " << atX << ", " << atY << ", " << atZ << "\n";
                    // const auto idx = mapidx(atX, atY, atZ);
                    // if (!blocked) {reveal(idx, view);}
                    // if (region::flag(idx, SOLID)) blocked = true;
                    const key = RG.toKey([atX, atY, atZ]);
                    if (!this._seen[key]) {
                        compCb(atX, atY, atZ, !blocked);
                        this._seen[key] = true;
                    }

                    if (!this._passCb(atX, atY, atZ)) {
                        blocked = true;
                        if (pos[0] === atX && pos[1] === atY && pos[2] === atZ) {
                            blocked = false;
                        }
                    }
                }
            }
        });
    }

};
