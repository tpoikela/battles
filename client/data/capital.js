/* Contains the code to generate the capital city. */

const RG = require('../src/rg');
RG.Factory = require('../src/factory');
RG.Path = require('../src/path');

RG.ObjectShell = require('../src/objectshellparser');
RG.Element = require('../src/element');

/* Class to create the capital city of the game. */
export default class Capital {

  constructor(cols, rows, conf = {}) {
    const wallOpts = {
      meanWy: Math.floor(0.9 * rows / 2),
      stdDev: 10,
      filterW: 7
    };
    if (conf.transpose) {
      wallOpts.north = true;
      wallOpts.south = true;
      wallOpts.east = false;
      wallOpts.west = false;
      wallOpts.meanWx = Math.floor(0.9 * cols / 2);
    }

    // Not exact position, but give proportions

    const subLevelPos = [0.03, 0.20, 0.75, 0.95];
    const widths = [0.5, 0.80, 0.6];

    const parser = RG.ObjectShell.getParser();

    const levelConf = [
      {nShops: 1, parser, nGates: 2},
      {nShops: 5, parser, nGates: 2},
      {nShops: 1, parser, nGates: 2}
    ];

    const subLevels = [];
    for (let i = 0; i < subLevelPos.length - 1; i++) {
      const y0 = Math.floor(rows * subLevelPos[i]);
      const y1 = Math.floor(rows * subLevelPos[i + 1]);
      let levelRows = y1 - y0;
      let levelCols = Math.floor(widths[i] * cols);

      if (conf.transpose) {
        const x0 = Math.floor(cols * subLevelPos[i]);
        const x1 = Math.floor(cols * subLevelPos[i + 1]);
        levelCols = x1 - x0;
        levelRows = Math.floor(widths[i] * rows);
      }

      levelConf[i].nHouses = Math.floor(
        levelCols * levelRows / 500);

      const level = RG.FACT.createLevel(
        'townwithwall', levelCols, levelRows, levelConf[i]);
      subLevels.push(level);
    }

    const y0 = subLevelPos[0] * cols;
    const tileConf = {x: 0, y: y0, centerX: true};
    if (conf.transpose) {
      tileConf.centerY = true;
      tileConf.centerX = false;
      tileConf.y = 0;
      tileConf.x = subLevelPos[0] * rows;
    }

    const mainLevel = RG.FACT.createLevel('wall', cols, rows, wallOpts);
    RG.Geometry.tileLevels(mainLevel, subLevels, tileConf);
    const mainMap = mainLevel.getMap();

    // Add entrance stairs
    if (conf.transpose) {
        const midY = Math.floor(rows / 2);
        const stairsWest = new RG.Element.Stairs(false, mainLevel);
        mainLevel.addStairs(stairsWest, 0, midY);
        const stairsEast = new RG.Element.Stairs(false, mainLevel);
        mainLevel.addStairs(stairsEast, cols - 1, midY);

        const path = RG.Path.getMinWeightPath(mainMap, 0, midY, cols - 1, midY);
        RG.Path.addPathToMap(mainMap, path);
    }
    else {
        const midX = Math.floor(cols / 2);
        const stairsNorth = new RG.Element.Stairs(false, mainLevel);
        mainLevel.addStairs(stairsNorth, midX, 0);
        const stairsSouth = new RG.Element.Stairs(false, mainLevel);
        mainLevel.addStairs(stairsSouth, midX, rows - 1);

        const path = RG.Path.getMinWeightPath(mainMap, midX, 0, midX, rows - 1,
            RG.Path.getShortestPassablePathWithDoors);
        RG.Path.addPathToMap(mainMap, path);
    }

    // Create the actors for this level
    const actorConf = {
        footman: 100,
        archer: 50,
        elite: 25,
        commander: 5
    };
    const actors = [];
    Object.keys(actorConf).forEach(key => {
      const name = `Hyrkhian ${key}`;
      const num = actorConf[key];
      for (let i = 0; i < num; i++) {
          const actor = parser.createActor(name);
          actors.push(actor);
      }
    });
    RG.Factory.addPropsToFreeCells(mainLevel, actors, RG.TYPE_ACTOR);

    const items = [parser.createItem('Longsword')];
    RG.Factory.addPropsToFreeCells(mainLevel, items, RG.TYPE_ITEM);

    this.level = mainLevel;
  }

  setConfig() {

  }

  buildLevel() {

  }

  getLevel() {
    return this.level;
  }

}


