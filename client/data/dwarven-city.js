
const RG = require('../src/rg');

export default class DwarvenCity {

    constructor(cols, rows, conf = {}) {
      const mainLevel = RG.FACT.createLevel('empty', cols, rows);


      this.level = mainLevel;
    }

    getLevel() {
      return this.level;
    }

}
