
import Constraints from './constraints';

const RG = require('./rg');
RG.Factory = require('./factory');
RG.Game = require('./game');
RG.Game.Battle = require('./game.battle').Battle;
RG.Game.Army = require('./game.battle').Army;
RG.World = require('./world');

const FACTIONS = ['human', 'dwarf', 'dogfolk', 'wolfclan', 'goblin',
    'catfolk', 'bearfolk', 'wildling', 'undead'];


/* Factory used for creating battles. */
RG.Factory.Battle = function() {

    /* Creates one battle into the level. TODO: Decide how to modify difficulty
     * etc. TODO: Refactor into Factory.Battle. */
    this.createBattle = function(level, conf = {}) {
        const cols = conf.cols || 80;
        const rows = conf.cols || 40;
        const levelType = conf.levelType || 'forest';

        const id = level ? level.getID() : 0;
        const name = conf.name || 'Battle of level ' + id;

        const battle = new RG.Game.Battle(name);
        const forestConf = RG.getForestConf(cols, rows);
        const battleLevel = RG.FACT.createLevel(levelType, cols, rows,
            forestConf);
        battle.setLevel(battleLevel);

        const [fact1, fact2] = this.getFactions(conf);

        const numRows = conf.numRows || 2;
        const armySize = conf.armySize || 20;
        const numArmies = conf.numArmies || 2;
        const facts = conf.armies || [fact1, fact2];

        // Generate all armies based on constraints
        const armies = [];
        for (let i = 0; i < numArmies; i++) {
            const army = this.createArmy(battle, facts[i], conf);

            // Assign random but legal coords to the army
            let armyX = RG.RAND.getUniformInt(0, cols - 1);
            let armyY = RG.RAND.getUniformInt(0, rows - 1);
            if ((armyX + armySize) > (cols - 1)) {
                armyX = cols - armySize;
            }
            if ((armyY + numRows) > (rows - 1)) {
                armyY = rows - 1 - numRows;
            }

            if (conf.centerX) {
                armyX = Math.floor(cols / 2);
                armyX -= Math.floor(armySize / numRows / 2);
            }
            if (conf.centerY) {
                armyY = Math.floor(rows / 2);
                armyY -= i * (numRows + 2);
            }

            const battleConf = {horizontal: true, numRows};
            battle.addArmy(army, armyX, armyY, battleConf);
            armies.push(army);
        }

        this.makeArmiesAsEnemies(armies);


        if (level) {
            // Add connecting stairs between battle and area
            // TODO add passage tiling for the level
            // const stairsBattle = new RG.Element.Stairs('stairsUp');
            // battleLevel.addElement(stairsBattle, 1, 1);
            const stairsArea = new RG.Element.Stairs('battle', level);

            // const randCell = level.getFreeRandCell();
            // level.addElement(stairsArea, randCell.getX(), randCell.getY());

            level.addStairs(stairsArea, 4, 4);

            RG.World.addExitsToEdge(battleLevel);

            const battleExits = battleLevel.getConnections();
            stairsArea.connect(battleExits[0]);
            for (let i = 1; i < battleExits.length; i++) {
                battleExits[i].setTargetLevel(level);
                battleExits[i].setTargetStairs(stairsArea);
            }

        }
        return battle;
    };

    this.getFactions = conf => {
        let fact1 = null;
        let fact2 = null;
        if (conf.factions) {
            [fact1, fact2] = conf.factions;
        }
        else {
            fact1 = RG.RAND.arrayGetRand(FACTIONS);
            fact2 = RG.RAND.arrayGetRand(FACTIONS);
            while (fact1 === fact2) {
                fact2 = RG.RAND.arrayGetRand(FACTIONS);
            }
        }
        return [fact1, fact2];
    };

    /* Creates an army of specified faction. */
    this.createArmy = (battle, faction, conf) => {
        const parser = RG.ObjectShell.getParser();
        const armySize = conf.armySize || 20;
        const maxDanger = conf.danger || 5;

        const army = new RG.Game.Army(faction);
        const constr = [
            {op: 'eq', prop: 'type', value: faction},
            {op: 'lte', prop: 'danger', value: maxDanger}
        ];
        const actorFunc = new Constraints().getConstraints(constr);
        for (let i = 0; i < armySize; i++) {
            const actor = parser.createRandomActor({func: actorFunc});
            if (actor) {
                const comp = new RG.Component.InBattle();
                comp.setData({name: battle.getName(),
                    army: army.getName()});
                actor.add(comp);
                army.addActor(actor);
            }
        }

        // Army loses if 10% of actors remain, this gives some losing
        // survivors, makes things more interesting
        army.setDefeatThreshold(Math.round(0.1 * armySize));
        return army;
    };

    this.makeArmiesAsEnemies = armies => {
        // Make army actors into each others enemies
        armies.forEach(army1 => {
            armies.forEach(army2 => {
                if (army1.getName() !== army2.getName()) {
                    army1.getActors().forEach(a1 => {
                        army2.getActors().forEach(a2 => {
                            a1.addEnemy(a2);
                            a2.addEnemy(a1);
                        });
                    });
                }
            });

            // Make the actors in army friends
            army1.getActors().forEach(actor1 => {
                army1.getActors().forEach(actor2 => {
                    if (actor1.getID() !== actor2.getID()) {
                        actor1.addFriend(actor2);
                        actor2.addFriend(actor1);
                    }
                });
            });
        });
    };

};

module.exports = RG.Factory.Battle;

