
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
            castleGen.create(this.cols, this.rows, castleConf)
        ];
        delete castleConf.nGates;
        levels = levels.concat([
            castleGen.create(this.cols, this.rows, castleConf),
            castleGen.create(this.cols, this.rows, castleConf),
            castleGen.create(this.cols, this.rows, castleConf),
            castleGen.create(this.cols, this.rows, castleConf)
        ]);

        this.addProps(levels);

        return levels.map((level, i) => ({nLevel: i, level}));
    }

    /* Adds properties like actors and items into levels. */
    addProps(levels) {
        const factZone = new RG.Factory.Zone();
        levels.forEach((level, i) => {
            const maxDanger = 7 + 3 * i;
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
