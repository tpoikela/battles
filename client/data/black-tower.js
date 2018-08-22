
/* Contains the code for final Black tower. */

const RG = require('../src/rg');
const CastleGenerator = require('../src/castle-generator');
RG.Factory = require('../src/factory');

export default class BlackTower {

    constructor(cols, rows, conf) {
        this.cols = cols || 100;
        this.rows = rows || 50;
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
            tilesX: 20,
            tilesY: 10
        };
        let levels = [
            castleGen.createLevel(this.cols, this.rows, castleConf)
        ];
        delete castleConf.nGates;
        levels = levels.concat([
            castleGen.createLevel(this.cols, this.rows, castleConf),
            castleGen.createLevel(this.cols, this.rows, castleConf),
            castleGen.createLevel(this.cols, this.rows, castleConf),
            castleGen.createLevel(this.cols, this.rows, castleConf)
        ]);

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

}
