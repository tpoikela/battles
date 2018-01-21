
/* This file contains Brain objects for virtual actors such as spawners. */

const RG = require('./rg');
RG.Brain = require('./brain');

/* Brains for virtual actors such as spawners. */
RG.Brain.Virtual = function(actor) {
    RG.Brain.Base.call(this, actor);
    this.setType('Virtual');
};
RG.extend2(RG.Brain.Virtual, RG.Brain.Base);

RG.Brain.Spawner = function(actor) {
    RG.Brain.Virtual.call(this, actor);
    this.setType('Spawner');

    /* Spawns an actor to the current level (if any). */
    this.decideNextAction = function() {
      const spawnOK = RG.RAND.getUniform();
      console.log(`spawnOk is ${spawnOK}`);
      if (spawnOK < 0.10) {
        console.log(`spawnOk is ${spawnOK}`);
        return () => {
          const level = this.getActor().getLevel();
          const freeCell = level.getFreeRandCell();
          const [x, y] = [freeCell.getX(), freeCell.getY()];

          const parser = RG.ObjectShell.getParser();
          const newActor = parser.createActor('goblin');
          level.addActor(newActor, x, y);
          RG.gameMsg(`You feel danger at ${x}, ${y}`);
        };
      }
      console.log('Spawner: Return empty event');
      return () => {};
    };

};
RG.extend2(RG.Brain.Spawner, RG.Brain.Virtual);

module.exports = RG.Brain;
