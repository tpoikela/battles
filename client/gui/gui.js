
// Set to 1 for some debug information
var $DEBUG = 0;

function debug(msg) {
    if ($DEBUG) {
        console.log('DEBUG:' + msg);
    }
}

const GUI = {};

/* Object which manages the shown part of the level.*/
GUI.Viewport = function(viewportX, viewportY) {

    // Size of the viewport, feel free to adjust
    this.viewportX = viewportX;
    this.viewportY = viewportY;

    /* Returns an object containing all cells in viewport, and viewport
     * coordinates.
     */
    this.getCellsInViewPort = function(x, y, map) {
        let startX = x - this.viewportX;
        let endX = x + this.viewportX;
        let startY = y - this.viewportY;
        let endY = y + this.viewportY;
        const maxX = map.cols - 1;
        const maxY = map.rows - 1;

        // If player is too close to level edge, viewport must be expanded from
        // the other side.
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

        for (let yy = startY; yy <= endY; yy++) {
            this[yy] = [];
            for (let xx = startX; xx <= endX; xx++) {
                this[yy].push(map._map[xx][yy]);
            }
        }

        this.startX = startX;
        this.endX = endX;
        this.startY = startY;
        this.endY = endY;
        this.rows = map.rows;
    };

    this.getCellRow = function(y) {return this[y];};

};

module.exports = GUI;
