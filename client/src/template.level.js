
const RG = require('./rg');
RG.Random = require('./random');

RG.Template = require('./template');

const baseTempl1 = `
name:BaseTemplate1
X=#
Y=#

#X#.#X#
Y.....#
#.....#
...#...
#.....#
Y.....#
###.###`;

const baseTempl2 = `
name:BaseTemplate2
X=#
Y=#

#.X.X.#
Y.....#
#..#..#
..###..
#..#..#
Y.....#
###.###`;

const TILE_UNUSED = 'TILE_UNUSED';

RG.Template.Level = function(tilesX, tilesY) {
    this.tilesX = tilesX;
    this.tilesY = tilesY;
    this.genParams = [1, 1, 1, 1];

    this.genParamMin = 1;
    this.genParamMax = 1;

    this.templates = [];
    this.templates.push(RG.Template.createTemplate(baseTempl1));
    this.templates.push(RG.Template.createTemplate(baseTempl2));

    // Initialize an empty map
    this.templMap = [];
    for (let x = 0; x < this.tilesX; x++) {
        this.templMap[x] = [];
        for (let y = 0; y < this.tilesY; y++) {
            this.templMap[x][y] = TILE_UNUSED;
        }
    }

    this.setGenParams = function(arr) {
        this.genParams = arr;
    };

    /* Creates the level. Result is in this.map. */
    this.create = function() {

        // Assign a random template for each tile
        for (let x = 0; x < this.tilesX; x++) {
            for (let y = 0; y < this.tilesY; y++) {
                this.templMap[x][y] = this.getRandomTemplate();
                console.log(`${x},${y}: ` +
                    `${JSON.stringify(this.templMap[x][y])}`);
            }
        }

        // Create gen params for each tile
        this.genParamsX = [];
        this.genParamsY = [];
        for (let x = 0; x < this.tilesX; x++) {
            const paramsX = [1, 3];
            this.genParamsX.push(paramsX);
        }
        for (let y = 0; y < this.tilesY; y++) {
            const paramsY = [2, 1];
            this.genParamsY.push(paramsY);
        }

        this.mapExpanded = [];
        for (let x = 0; x < this.tilesX; x++) {
            this.mapExpanded[x] = [];
            for (let y = 0; y < this.tilesY; y++) {
                const params = this.genParamsX[x].concat(this.genParamsY[y]);
                this.mapExpanded[x][y] = this.templMap[x][y].getChars(params);
                console.log(`${x},${y}: ` +
                    `${JSON.stringify(this.mapExpanded[x][y])}`);
            }
        }

        this.map = [];
        // let xOffset = 0;
        // Now we have an unflattened map: 4-dimensional arrays
        for (let tileX = 0; tileX < this.tilesX; tileX++) {
            const numCols = this.mapExpanded[tileX][0].length;
            console.log(`tileX: ${tileX} numCols: ${numCols}`);
            for (let i = 0; i < numCols; i++) {
                let finalCol = [];
                for (let tileY = 0; tileY < this.tilesY; tileY++) {
                    const tileCol = this.mapExpanded[tileX][tileY][i];
                    finalCol = finalCol.concat(tileCol);
                }
                this.map.push(finalCol);
            }
            // xOffset += numCols;
        }

    };


    this.getRandomTemplate = function() {
        // TODO at some point, we need to check how the entrances in rooms match
        return RG.RAND.arrayGetRand(this.templates);
    };

};


module.exports = RG.Template.Level;
