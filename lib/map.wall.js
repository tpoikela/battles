
const ROT = require('./rot');

/* Can be used to generate "mountain walls". These are thick walls centered or
 * aligned to one of the sides of the level.
 *
 */
ROT.Map.Wall = function(width, height, options) {
    ROT.Map.call(this, width, height);

    this._options = {
      north: false,
      south: false,
      east: true,
      west: true,
      alignVertical: 'center',
      alignHorizontal: 'center',
      meanWx: 5,
      meanWy: 5,
      stdDev: 3,
      filterW: 3,
      rng: ROT.RNG
    };

    if (options) {
        // Grab only relevant options
        for (const p in this._options) {
            if (this._options.hasOwnProperty(p)) {
                if (options.hasOwnProperty(p)) {
                    this._options[p] = options[p];
                }
            }
        }
    }

};
ROT.Map.Wall.extend(ROT.Map);

ROT.Map.Wall.prototype.create = function(callback) {
    const map = this._fillMap(0);

    const canConnectNorth = this._options.north;
    const canConnectSouth = this._options.south;
    const canConnectEast = this._options.east;
    const canConnectWest = this._options.west;
    const {alignVertical, alignHorizontal} = this._options;

    const subX = this._width;
    const subY = this._height;

    const midX = Math.floor(subX / 2);
    const midY = Math.floor(subY / 2);

    const MEAN_WX = this._options.meanWx;
    const MEAN_WY = this._options.meanWy;
    const STDDEV_W = this._options.stdDev;
    const filterW = this._options.filterW;

    let width = null;

    let startY = -1;
    let endY = -1;
    if (canConnectNorth && canConnectSouth) {
        startY = 0;
        endY = subY - 1;
    }
    else if (canConnectNorth) {
        startY = 0;
        endY = midY - 1;
    }
    else if (canConnectSouth) {
        startY = midY;
        endY = subY - 1;
    }

    this._wallNS = [];
    let widths = this.getWidthMovingAvg(endY + 1, MEAN_WX, STDDEV_W,
        subX, filterW);

    // Draw line from center to north
    if (canConnectNorth || canConnectSouth) {
        for (let y = startY; y <= endY; y++) {
            width = widths[y - startY];
            const tile = [];
            if (width === 1) {width = MEAN_WX;}

            let xStart = midX - (width - 1);
            let xEnd = midX + (width - 1);
            // Choose the x-position
            if (alignHorizontal === 'center') {
                // Skip
            }
            else if (alignHorizontal === 'left') {
                xStart = 0;
                xEnd = xStart + (width - 1);
            }
            else if (alignHorizontal === 'right') {
                xStart = this._width - (width - 1);
                xEnd = this._width - 1;
            }

            for (let x = xStart; x <= xEnd; x++) {
                map[x][y] = 1;
                tile.push([x, y]);
            }
            this._wallNS.push(tile);
        }
    }

    let startX = -1;
    let endX = -1;
    if (canConnectEast && canConnectWest) {
        startX = 0;
        endX = subX - 1;
    }
    else if (canConnectEast) {
        startX = midX;
        endX = subX - 1;
    }
    else if (canConnectWest) {
        startX = 0;
        endX = midX - 1;
    }

    this._wallEW = [];
    widths = this.getWidthMovingAvg(endX + 1, MEAN_WY, STDDEV_W, subY, filterW);
    if (canConnectEast || canConnectWest) {
        for (let x = startX; x <= endX; x++) {
            width = widths[x - startX];
            const tile = [];
            if (width === 1) {width = MEAN_WY;}

            let yStart = midY - (width - 1);
            let yEnd = midY + (width - 1);
            // Choose the x-position
            if (alignVertical === 'center') {
                // Skip
            }
            else if (alignVertical === 'top') {
                yStart = 0;
                yEnd = yStart + (width - 1);
            }
            else if (alignVertical === 'bottom') {
                yStart = this._height - (width - 1);
                yEnd = this._height - 1;
            }

            for (let y = yStart; y <= yEnd; y++) {
                map[x][y] = 1;
                tile.push([x, y]);
            }
            this._wallEW.push(tile);
        }
    }

    // Service the callback finally
	for (let i = 0; i < this._width; i++) {
		for (let j = 0; j < this._height; j++) {
			callback(i, j, map[i][j]);
		}
	}

};

/* Gets the width using moving average algorithm. */
ROT.Map.Wall.prototype.getWidthMovingAvg = function(
    nElem, mean, stddev, subSize, filterW
) {
    const unfiltered = [];
    for (let i = 0; i < nElem; i++) {
        unfiltered.push(this.getWallWidth(mean, stddev, subSize));
    }

    const filtered = [];
    for (let i = 0; i < filterW; i++) {
        filtered.push(unfiltered[i]);
    }

    // Filter array with algorith
    for (let i = filterW; i < (nElem - filterW); i++) {
        const filtVal = getFiltered(unfiltered, i, filterW);
        filtered.push(filtVal);
    }

    for (let i = (nElem - filterW); i < nElem; i++) {
        // Hack for now, find correct solution
        if (filtered.length < unfiltered.length) {
            filtered.push(unfiltered[i]);
        }
    }

    return filtered;
};

ROT.Map.Wall.prototype.getWallWidth = function(mean, stddev, subSize) {
    const rng = this._options.rng;
    let width = Math.floor(rng.getNormal(mean, stddev));
    // width = Math.floor(width + coeff * width);

    if (width > subSize / 2) {
        width = subSize / 2 - 1;
    }
    else if (width < 1) {
        width = 1;
    }
    return width;
};

function getFiltered(arr, i, filterW) {
    const num = 2 * filterW + 1;
    let sum = 0;
    for (let n = i - filterW; n <= i + filterW; n++) {
        sum += arr[n];
    }
    return Math.floor(sum / num);
}

module.exports = ROT.Map.Wall;
