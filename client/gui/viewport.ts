
import {Cell} from '../src/map.cell';
import {CellMap} from '../src/map';

/* Viewport object which manages the shown part of a level or a map. */
export class Viewport {
    public viewportX: number;
    public viewportY: number;
    public coord: {[key: string]: Cell[]};

    public startX: number;
    public endX: number;
    public startY: number;
    public endY: number;
    public rows: number;

    constructor(viewportX: number, viewportY: number) {
        // Size of the viewport
        this.viewportX = viewportX;
        this.viewportY = viewportY;
    }

    /* Sets the viewport dimensions. */
    public setViewportXY(x: number, y: number): void {
        this.viewportX = x;
        this.viewportY = y;
    }

    /* Sets the cells in the current viewport. x,y is the position of the
     * player, the map Map.CellList of current level.
     */
    public initCellsInViewPort(x: number, y: number, map: CellMap): void {
        let startX = x - this.viewportX;
        let endX = x + this.viewportX;
        let startY = y - this.viewportY;
        let endY = y + this.viewportY;
        const maxX = map.cols - 1;
        const maxY = map.rows - 1;

        // If player is too close to map edge, viewport must be expanded from
        // the other side to keep its size constant.
        const leftStartX = this.viewportX - x;
        if (leftStartX > 0) {
            endX += leftStartX;
        }
        else {
            const leftEndX = x + this.viewportX - maxX;
            if (leftEndX > 0) {
                startX -= leftEndX;
            }
        }

        const leftStartY = this.viewportY - y;
        if (leftStartY > 0) {
            endY += leftStartY;
        }
        else {
            const leftEndY = y + this.viewportY - maxY;
            if (leftEndY > 0) {
                startY -= leftEndY;
            }
        }

        // Some sanity checks for level edges
        if (startX < 0) {
            startX = 0;
        }
        if (startY < 0) {
            startY = 0;
        }
        if (endX > map.cols - 1) {
            endX = map.cols - 1;
        }
        if (endY > map.rows - 1) {
            endY = map.rows - 1;
        }

        this.coord = {};
        for (let yy = startY; yy <= endY; yy++) {
            this.coord[yy] = [] as Cell[];
            for (let xx = startX; xx <= endX; xx++) {
                this.coord[yy].push(map.getCell(xx, yy));
            }
        }

        this.startX = startX;
        this.endX = endX;
        this.startY = startY;
        this.endY = endY;
        this.rows = map.rows;
    }

    /* Returns the specified cell row in the viewport. */
    public getCellRow(y): Cell[] {return this.coord[y];}

    public debugPrint(): void {
        const [startY, endY] = [this.startY, this.endY];
        for (let yy = startY; yy <= endY; yy++) {
            const row = this.coord[yy];
            console.log(row.join(''));
        }
    }
}

