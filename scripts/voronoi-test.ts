
import {Random} from '../client/src/random';
import {CellMap} from '../client/src/map';
import {Level} from '../client/src/level';
import {TCoord} from '../client/src/interfaces';
import * as Element from '../client/src/element';
import {BVoronoi} from '../client/src/bvoronoi';

const Marker = Element.ElementMarker;
const RNG = Random.getRNG();

const sizeX = 80;
const sizeY = 80;

const vor = new BVoronoi();
const bbox = {xl: 0, xr: sizeX - 1, yt: 0, yb: sizeY - 1};

const nSites = 80;
const sites = [];

for (let i = 0; i < nSites; i++) {
    const [x, y] = [RNG.getUniformInt(0, sizeX - 1),
        RNG.getUniformInt(0, sizeY - 1)];
    console.log('x,y is', x, y);
    sites.push({x, y});
}

console.log('Sites are', sites);

const diagram = vor.compute(sites, bbox);

console.log('After comp Sites are', sites);
console.log('Voronoi diagram:', JSON.stringify(diagram.cells, null, 1));

const cellMap = new CellMap(sizeX, sizeY);
const level = new Level();
level.setMap(cellMap);

const pointById: {[key: string]: TCoord[]} = vor.getPointsByCell();

Object.keys(pointById).forEach((id: string) => {
    const coord: TCoord[] = pointById[id];
    coord.forEach((xy: TCoord) => {
        const marker = new Marker(getMarkerChar(id));
        level.addElement(marker, xy[0], xy[1]);
    });
});

level.debugPrintInASCII();

//----------
// HELPERS
//----------

function getMarkerChar(id: string): string {
    return String.fromCharCode(48 + parseInt(id, 10));
}

