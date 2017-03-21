
// Set to 1 for some debug information
var $DEBUG = 0;

function debug(msg) {
    if ($DEBUG) {
        console.log("DEBUG:" + msg);
    }
}

var GUI = {};

/** Object which manages the shown part of the level.*/
GUI.Viewport = function(viewportX, viewportY, map) {

    // Size of the viewport, feel free to adjust
    this.viewportX = viewportX;
    this.viewportY = viewportY;

    /** Returns an object containing all cells in viewport, and viewport
     * coordinates.
     */
    this.getCellsInViewPort = function(x, y, map) {
        var startX = x - this.viewportX;
        var endX = x + this.viewportX;
        var startY = y - this.viewportY;
        var endY = y + this.viewportY;
        var maxX = map.cols - 1;
        var maxY = map.rows - 1;

        // If player is too close to level edge, viewport must be expanded from
        // the other side.
        var leftStartX = this.viewportX - x;
        if (leftStartX > 0) {
            endX += leftStartX;
        }
        else {
            var leftEndX = x + this.viewportX - maxX;
            if (leftEndX > 0) startX -= leftEndX;
        }

        var leftStartY = this.viewportY - y;
        if (leftStartY > 0) {
            endY += leftStartY;
        }
        else {
            var leftEndY = y + this.viewportY - maxY;
            if (leftEndY > 0) startY -= leftEndY;
        }

        // Some sanity checks for level edges
        if (startX < 0) startX = 0;
        if (startY < 0) startY = 0;
        if (endX > map.cols-1) endX = map.cols - 1;
        if (endY > map.rows-1) endY = map.rows - 1;

        for (var yy = startY; yy <= endY; yy++) {
            this[yy] = [];
            for (var xx = startX; xx <= endX; xx++) {
                this[yy].push(map.getCell(xx, yy));
            }
        }

        this.startX = startX;
        this.endX = endX;
        this.startY = startY;
        this.endY = endY;
        this.rows = map.rows;
    },

    this.getCellRow = function(y) {return this[y];};

};

module.exports = GUI;
