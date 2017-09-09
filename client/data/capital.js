/* Contains the code to generate the capital city. */

const RG = require('../src/rg');
RG.Factory = require('../src/factory');

const Objects = require('../data/battles_objects.js');
RG.Effects = require('../data/effects.js');

/* Class to create the capital city of the game. */
export default class Capital {

  constructor(cols, rows, conf = {}) {
    const wallOpts = {
      meanWy: Math.floor(0.9 * rows / 2),
      stdDev: 10,
      filterW: 7
    };
    const mainLevel = RG.FACT.createLevel('wall', cols, rows, wallOpts);

    const subLevelPos = [0.04, 0.20, 0.75, 0.95];

    const widths = [0.5, 0.80, 0.6];

    const parser = new RG.ObjectShell.Parser();
    parser.parseShellData(RG.Effects);
    parser.parseShellData(Objects);

    const levelConf = [
      {nShops: 0, parser},
      {nShops: 5, parser},
      {nShops: 0, parser}
    ];

    for (let i = 0; i < subLevelPos.length - 1; i++) {
      const y0 = Math.floor(rows * subLevelPos[i]);
      const y1 = Math.floor(rows * subLevelPos[i + 1]);
      const levelRows = y1 - y0;

      const levelCols = Math.floor(widths[i] * cols);
      const offsetX = Math.floor((cols - levelCols) / 2);
      const x0 = offsetX;
      console.log(`SubL[${i}]: ${levelCols} x ${levelRows}`);

      levelConf[i].nHouses = Math.floor(
        levelCols * levelRows / 500);

      const level = RG.FACT.createLevel(
        'townwithwall', levelCols, levelRows, levelConf[i]);

      RG.Geometry.insertSubLevel(mainLevel, level, x0, y0);
    }

    this.level = mainLevel;
  }

  getLevel() {
    return this.level;
  }

}


