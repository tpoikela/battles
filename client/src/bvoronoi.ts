
import {TCoord} from './interfaces';

const Voronoi = require('voronoi');

interface VoronoiSite {
    x: number;
    y: number;
    voronoiId?: number;
}

interface Diagram {
    [key: string]: any;
}

const CELL_NOT_FOUND = -1;

/* Voronoi diagram wrapper. */
export class BVoronoi {

    public diagram: Diagram;
    public sites: VoronoiSite[];
    public sizeX: number;
    public sizeY: number;

    constructor() {
    }

    public compute(sites: VoronoiSite[], bbox): Diagram {
        const vor = new Voronoi();
        this.diagram = vor.compute(sites, bbox);
        this.sites = sites;
        this.sizeX = bbox.xr - bbox.xl;
        this.sizeY = bbox.yb - bbox.yt;
        return this.diagram;
    }

    public getPointsByCell(): {[key: string]: TCoord[]} {
        const pointById: {[key: string]: TCoord[]} = {};

        for (let x = 0; x < this.sizeX; x++) {
            for (let y = 0; y < this.sizeY; y++) {
                const xy: TCoord = [x, y];
                const cellId = this.getCellId(xy);
                if (!pointById[cellId]) {
                    pointById[cellId] = [];
                }
                pointById[cellId].push(xy);

            }
        }
        return pointById;
    }

    public getCellId(xy: TCoord): number {
        let closestId = CELL_NOT_FOUND;
        let d = Number.MAX_SAFE_INTEGER;

        this.sites.forEach((cell: VoronoiSite) => {
            const {x, y, voronoiId} = cell;
            if (typeof voronoiId !== 'undefined') {
                const dist = distSqr(xy, [x, y]);
                if (dist < d) {
                    d = dist;
                    closestId = voronoiId;
                }
            }
        });

        return closestId;
    }
}

function distSqr(xy0: TCoord, xy1: TCoord): number {
    return (
        (xy0[0] - xy1[0])**2 + (xy0[1] - xy1[1])**2
    );
}
