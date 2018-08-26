
/* Contains the code for final Black tower. */

const RG = require('../src/rg');
const CastleGenerator = require('../src/castle-generator');
RG.Factory = require('../src/factory');
const Vault = require('./tiles.vault');
const Geometry = require('../src/geometry');

const tileSize = 9;

export default class BlackTower {

    constructor(cols, rows, conf) {
        this.nLevels = conf.nLevels || 5;
        this.cols = cols || 100;
        this.rows = rows || 50;
        this.tilesX = Math.round(this.cols / tileSize);
        this.tilesY = Math.round(this.rows / tileSize);
        /* if (this.tilesX % 2 === 0) {++this.tilesX;}
        if (this.tilesY % 2 === 0) {++this.tilesY;}*/
        this.conf = conf;
    }

    getLevels() {
        const castleGen = new CastleGenerator();
        const castleConf = {
            wallType: 'wallice',
            // floorType: 'floorice',
            genParams: [2, 2, 2, 2],
            nGates: 2,
            roomCount: -1,
            tilesX: this.tilesX,
            tilesY: this.tilesY
        };
        const levels = [
            castleGen.createLevel(this.cols, this.rows, castleConf)
        ];
        delete castleConf.nGates;

        for (let i = 0; i < this.nLevels - 2; i++) {
            levels.push(
                castleGen.createLevel(this.cols, this.rows, castleConf)
            );
        }

        // Last level has a huge vault in the center point
        const [midXTile, midYTile] = [
            Math.round(this.tilesX / 2),
            Math.round(this.tilesY / 2)
        ];
        castleConf.callbacks = {};
        const afterInitCb = level => {
            Vault.templates.all.forEach(templ => {level.addTemplate(templ);});
            Vault.func.createHugeVault(midXTile - 1, midYTile - 2, level,
                'vault_center1', 'entrance_n');
        };
        castleConf.callbacks.afterInit = afterInitCb;
        const lastLevel = castleGen.createLevel(this.cols, this.rows,
            castleConf);
        levels.push(lastLevel);

        this.addProps(levels);

        levels.forEach((level, i) => {
            castleGen.removeMarkers(level, {
                markersPreserved: false,
                shouldRemoveMarkers: true
            });

            const maxDanger = this.getDanger(i) + 5;
            const populConf = {
                maxDanger,
                actorFunc: actor => actor.base === 'WinterBeingBase'
            };
            castleGen.populateStoreRooms(level, populConf);
        });

        this.generateYard(levels);

        return levels.map((level, i) => ({nLevel: i, level}));
    }

    getDanger(nLevel) {
        return 7 + 3 * nLevel; // arbitraty, to tune
    }

    /* Adds properties like actors and items into levels. */
    addProps(levels) {
        const factZone = new RG.Factory.Zone();
        levels.forEach((level, i) => {
            const maxDanger = this.getDanger(i);
            const conf = {
                nLevel: i,
                minValue: 50 + 10 * i,
                maxValue: 65 + 20 * (i + 1),
                sqrPerItem: 200,
                sqrPerActor: 40 - 2 * i,
                maxDanger,
                actor: actor => actor.base === 'WinterBeingBase'
            };
            factZone.addItemsAndActors(level, conf);

            // Level up each actor to at least maxDanger level
            const actors = level.getActors();
            actors.forEach(actor => {
                const exp = actor.get('Experience');
                if (exp) {
                    const danger = exp.getDanger();
                    const levelGap = maxDanger - danger;
                    const currLevel = exp.getExpLevel();
                    const newLevel = currLevel + levelGap;
                    if (newLevel > currLevel) {
                        RG.levelUpActor(actor, newLevel);
                    }
                }
            });
        });
    }

    /* Generate the outside yard for the first level. */
    generateYard(levels) {
        const level0 = levels[0];
        const scaleYard = 1.4;

        const [cols, rows] = level0.getColsRows();
        const yardRows = Math.round(rows * scaleYard);
        const yardCols = Math.round(cols * scaleYard);
        const yardLevel = RG.FACT.createLevel('arctic', yardCols, yardRows);

        const startX = Math.round((yardCols - cols) / 2);
        const startY = Math.round((yardRows - rows) / 2);
        Geometry.mergeLevels(yardLevel, level0, startX, startY);
        yardLevel.getExtras().connectEdges = true;

        levels[0] = yardLevel;
    }

}
