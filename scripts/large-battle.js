
require('babel-register');

const RG = require('../client/src/battles');
const Screen = require('../client/gui/screen');
const GoalsTop = require('../client/src/goals-top');
const FactoryBattle = require('../client/src/factory.battle');
const RGTest = require('../tests/roguetest');

const factBattle = new FactoryBattle();
const game = new RG.Game.Main();
const catcher = new RGTest.MsgCatcher();
catcher.disable();

const [x, y] = [80, 40];
// const level = RG.FACT.createLevel('forest',
// x, y, {ratio: 0.7, nForests: 30});
const level = RG.FACT.createLevel('empty', x, y);

const battleName = 'Demon war';
const battle = new RG.Game.Battle(battleName);
battle.setLevel(level);

const armyDemons = new RG.Game.Army('Demons');
const armyHumans = new RG.Game.Army('Humans');

const parser = RG.ObjectShell.getParser();
for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 4; j++) {
        const human = parser.createRandomActor(
            {
                func: actor => actor.type === 'human' &&
                actor.brain === 'GoalOriented' &&
                actor.danger >= 4
            }
        );
        armyHumans.addActor(human);
        addInBattle(human);
    }
    const demon = parser.createRandomActor(
        {
            func: actor => actor.type === 'demon' &&
            actor.danger <= 12
        }
    );
    armyDemons.addActor(demon);
    addInBattle(demon);
}

const cmdActor = parser.createActor('Hyrkhian commander');
const humanCommander = createCommander(cmdActor);
armyHumans.addActor(humanCommander);
humanCommander.setFOVRange(10);

const bb = parser.createActor('Blizzard beast');
const demonCmd = createCommander(bb);
armyDemons.addActor(demonCmd);
demonCmd.setFOVRange(10);

const brainType = humanCommander.getBrain().getType();
console.log('Commander brainType: ' + brainType);

battle.addArmy(armyDemons, 0, 0, {horizontal: true, numRows: 2});
battle.addArmy(armyHumans, 2, 20, {horizontal: true, numRows: 8});

factBattle.makeArmiesAsEnemies([armyHumans, armyDemons]);
game.addBattle(battle);
const screen = new Screen(x / 2, y / 2);
level.getMap()._optimizeForRowAccess();

const maxTurns = 200;
let nTurns = 0;
// const intervalId = setInterval(updateGame, 1000 / 60);
for (let i = 0; i < 25000; i++) {
    updateGame();
}
screen.renderFullMap(level.getMap());
screen.printRenderedChars();

// END //

function createCommander(actor) {
    const brain = new RG.Brain.GoalOriented(actor);
    const topGoal = new GoalsTop.ThinkCommander(actor);
    actor.setBrain(brain);
    brain.setGoal(topGoal);
    actor.add(new RG.Component.Commander());
    addInBattle(actor);
    return actor;
}

function updateGame() {
    game.simulate();
    if (nTurns % 100000 === 0) {
        console.log(`[TURN ${nTurns}] ===============`);
        screen.renderFullMap(level.getMap());
        screen.printRenderedChars();
        console.log('\n');
    }
    ++nTurns;
    if (nTurns >= maxTurns) {
        // clearInterval(intervalId);
    }
}

/* Adds InBattle component for the actor. */
function addInBattle(actor) {
    const comp = new RG.Component.InBattle();
    comp.setData({name: battleName});
    actor.add(comp);
}
