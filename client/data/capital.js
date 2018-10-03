/* Contains the code to generate the capital city. */

const RG = require('../src/rg');
const Placer = require('../src/placer');
RG.Path = require('../src/path');

RG.ObjectShell = require('../src/objectshellparser');
RG.Element = require('../src/element');

const {Stairs} = RG.Element;

/* Class to create the capital city of the game. */
export default class Capital {

  constructor(cols, rows, conf = {}) {
    if (RG.isNullOrUndef([cols, rows])) {
        RG.err('Capital', 'constructor',
            'Use new Capital(cols, rows, conf?)');
    }

    // Generate the main level with mountain wall
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
    const mainLevel = RG.FACT.createLevel('wall', cols, rows, wallOpts);
    const mainMap = mainLevel.getMap();

    // Not exact position, but give proportions for sub-levels
    const subLevelPos = [0.03, 0.20, 0.75, 0.95];
    const widths = [0.5, 0.80, 0.6];

    const parser = RG.ObjectShell.getParser();
    const levelConf = [
      {nShops: 2, parser, nGates: 2},
      {nShops: 5, parser, nGates: 2},
      {nShops: 2, parser, nGates: 2}
    ];

    // Create subLevels for each interval in subLevelPos array
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


    // Calculate position and tile sub-levels into main level
    const y0 = Math.floor(subLevelPos[0] * cols);
    const tileConf = {x: 0, y: y0, centerX: true};
    if (conf.transpose) {
      tileConf.centerY = true;
      tileConf.centerX = false;
      tileConf.y = 0;
      tileConf.x = Math.floor(subLevelPos[0] * rows);
    }
    RG.Geometry.tileLevels(mainLevel, subLevels, tileConf);

    // Add entrance stairs and create path through the level
    if (conf.transpose) {
      const midY = Math.floor(rows / 2);
      const stairsWest = new Stairs('stairsUp', mainLevel);
      mainLevel.addStairs(stairsWest, 0, midY);
      const stairsEast = new Stairs('stairsUp', mainLevel);
      mainLevel.addStairs(stairsEast, cols - 1, midY);

      const path = RG.Path.getMinWeightPath(mainMap, 0, midY, cols - 1, midY);
      RG.Path.addPathToMap(mainMap, path);
    }
    else {
      const midX = Math.floor(cols / 2);
      const stairsNorth = new Stairs('stairsUp', mainLevel);
      mainLevel.addStairs(stairsNorth, midX, 0);
      const stairsSouth = new Stairs('stairsUp', mainLevel);
      mainLevel.addStairs(stairsSouth, midX, rows - 1);

      const path = RG.Path.getMinWeightPath(mainMap, midX, 0, midX, rows - 1,
          RG.Path.getShortestPassablePathWithDoors);
      RG.Path.addPathToMap(mainMap, path);
    }

    // Create the actors and items for this level
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

    const nTrainers = 3;
    for (let i = 0; i < nTrainers; i++) {
      const trainer = parser.createActor('trainer');
      actors.push(trainer);
    }

    Placer.addPropsToFreeCells(mainLevel, actors, RG.TYPE_ACTOR);

    const items = [parser.createItem('Longsword')];
    Placer.addPropsToFreeCells(mainLevel, items, RG.TYPE_ITEM);

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


