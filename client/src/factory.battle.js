
import Constraints from './constraints';

const RG = require('./rg');
RG.Factory = require('./factory');

RG.Factory.Battle = function(game) {
    this.game = game;

    /* Creates one battle into the level. TODO: Decide how to modify difficulty
     * etc. TODO: Refactor into Factory.Battle. */
    this.createBattle = function(level) {
        // TODO refactor into factory method createBattle()
        const id = level.getID();
        const battle = new RG.Game.Battle('Battle of level ' + id);
        const forestConf = RG.getForestConf(80, 40);
        const battleLevel = RG.FACT.createLevel('forest', 80, 40,
            forestConf);
        battle.setLevel(battleLevel);
        const stairsBattle = new RG.Element.Stairs(false);
        battleLevel.addElement(stairsBattle, 1, 1);
        const parser = RG.ObjectShell.getParser();

        const factions = ['human', 'dwarf', 'dogfolk', 'wolfclan', 'goblin',
            'catfolk', 'bearfolk', 'wildling', 'undead'];
        const fact1 = RG.RAND.arrayGetRand(factions);
        let fact2 = RG.RAND.arrayGetRand(factions);
        while (fact1 === fact2) {
            fact2 = RG.RAND.arrayGetRand(factions);
        }

        const numArmies = 2;
        const facts = [fact1, fact2];
        const maxDanger = 5;

        for (let i = 0; i < numArmies; i++) {
            const army = new RG.Game.Army(facts[i]);
            const constr = [
                {op: 'eq', prop: 'type', value: facts[i]},
                {op: 'lte', prop: 'danger', value: maxDanger}
            ];
            const actorFunc = new Constraints().getConstraints(constr);
            for (let i = 0; i < 20; i++) {
                const actor = parser.createRandomActor({func: actorFunc});
                if (actor) {
                    army.addActor(actor);
                }
            }

            const armyX = 20;
            const armyY = 20;
            battle.addArmy(army, armyX, armyY);
        }

        const stairsArea = new RG.Element.Stairs(true);
        level.addElement(stairsArea, 4, 4);
        stairsArea.connect(stairsBattle);
        this.game.addBattle(battle);
        return battle;
    };

};

module.exports = RG.Factory.Battle;

