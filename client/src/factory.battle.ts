
import {Constraints} from './constraints';

import RG from './rg';
import {World} from './world';
import {Battle, Army} from './game.battle';
import {Random} from './random';
import {FactoryLevel} from './factory.level';
import {ObjectShell} from './objectshellparser';
import * as Brain from './brain';
import * as Component from './component';
import * as GoalsTop from './goals-top';
import * as Element from './element';
import {LevelSurroundings} from './level-surroundings';
import {Geometry} from './geometry';

import {BBox} from './bbox';

type Level = import('./level').Level;
type SentientActor = import('./actor').SentientActor;
type Stairs = Element.ElementStairs;
const ElementStairs = Element.ElementStairs;

const RNG = Random.getRNG();

const FACTIONS = ['avianfolk', 'human', 'dwarf', 'dogfolk', 'wolfclan',
    'goblin', 'catfolk', 'bearfolk', 'wildling', 'undead'];

export interface BattleConf {
    cols?: number;
    rows?: number;
    name?: string;
    numRows?: number;
    numArmies?: number;
    armySize?: number;
    armies?: string[];
    centerX?: boolean;
    centerY?: boolean;
    bbox?: BBox;
    maxDanger?: number;
    levelType?: string;
}

/* Factory used for creating battles. */
export class FactoryBattle {
    public minCommDanger: number;

    constructor() {
        this.minCommDanger = 5;
    }

    /* Creates one battle into the level. TODO: Decide how to modify difficulty
     * etc. */
    public createBattle(parentLevel, conf: BattleConf = {}): Battle {
        const cols = conf.cols || 80;
        const rows = conf.rows || 40;

        const id = parentLevel ? parentLevel.getID() : 0;
        const name = conf.name || 'Battle of level ' + id;

        let battleLevel = this.createBattleLevel(cols, rows, conf);
        if (parentLevel) {
            // Add connecting stairs between battle and area
            const stairsArea = new ElementStairs('battle', parentLevel);
            const map = parentLevel.getMap();

            // TODO randomize this position
            if (conf.bbox) {
                const {bbox} = conf;
                let xy = RNG.getRandInBbox(bbox);
                let cell = map.getCell(xy[0], xy[1]);
                let watchdog = RG.WATCHDOG;
                while (cell.hasProps()) {
                    xy = RNG.getRandInBbox(bbox);
                    cell = map.getCell(xy[0], xy[1]);
                    if (--watchdog === 0) {break;}
                }
                parentLevel.addStairs(stairsArea, xy[0], xy[1]);

                const cellsAround = Geometry.getCellsAround(map, cell);
                const levelSurround = new LevelSurroundings();
                battleLevel = levelSurround.surround(battleLevel, {cellsAround});
            }
            else {
                parentLevel.addStairs(stairsArea, 4, 4);
            }

            World.addExitsToEdge(battleLevel);
            World.connectAreaConnToLevel(stairsArea, battleLevel, parentLevel);

        }

        const battle = new Battle(name);
        battle.setLevel(battleLevel);

        const [fact1, fact2] = this.getFactions(conf);

        let numRows = conf.numRows || 2;
        const armySize = conf.armySize || 20;
        const numArmies = conf.numArmies || 2;
        const facts = conf.armies || [fact1, fact2];

        // Scale army X size to fit into the level
        let armySizeX = Math.ceil(armySize / numRows);
        while (armySizeX > cols) {
            ++numRows;
            armySizeX = Math.ceil(armySize / numRows);
        }

        // Generate all armies based on constraints
        const armies: Army[] = [];
        for (let i = 0; i < numArmies; i++) {
            const army = this.createArmy(battle, facts[i], conf);

            // Assign random but legal coords to the army
            let armyX = RNG.getUniformInt(0, cols - 1);
            let armyY = RNG.getUniformInt(0, rows - 1);
            if ((armyX + armySizeX) > (cols - 1)) {
                armyX = cols - armySizeX;
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

            // Check that the placement is legal
            if (armyX > (cols - 1) || armyX < 0) {
                RG.err('FactoryBattle', 'createBattle',
                    `armyX ${armyX} out of bounds 0-${cols - 1}`);
            }
            if (armyY > (rows - 1) || armyY < 0) {
                RG.err('FactoryBattle', 'createBattle',
                    `armyY ${armyY} out of bounds 0-${rows - 1}`);
            }

            const battleConf = {horizontal: true, numRows};
            battle.addArmy(army, armyX, armyY, battleConf);
            armies.push(army);
        }

        this.makeArmiesAsEnemies(armies);

        return battle;
    }

    public getFactions(conf): string[] {
        let fact1 = null;
        let fact2 = null;
        if (conf.factions) {
            [fact1, fact2] = conf.factions;
        }
        else {
            fact1 = RNG.arrayGetRand(FACTIONS);
            fact2 = RNG.arrayGetRand(FACTIONS);
            while (fact1 === fact2) {
                fact2 = RNG.arrayGetRand(FACTIONS);
            }
        }
        return [fact1, fact2];
    }

    /* Creates an army of specified faction. */
    public createArmy(battle: Battle, faction: string, conf): Army {
        const parser = ObjectShell.getParser();
        const armySize = conf.armySize || 20;
        const maxDanger = conf.danger || 5;

        const army = new Army(faction);
        const armyId = army.getID();
        army.addAlignment(faction, 1);
        const constr = [
            {op: 'eq', prop: 'type', value: faction},
            {op: 'lte', prop: 'danger', value: maxDanger}
        ];
        const actorFunc = new Constraints().getConstraints(constr);
        for (let i = 0; i < armySize - 1; i++) {
            const actor = parser.createRandomActor({func: actorFunc});
            if (actor) {
                const comp = new Component.InBattle();
                comp.setData({name: battle.getName(),
                    army: army.getName()});
                actor.add(comp);
                if (!actor.has('Groups')) {
                    actor.add(new Component.Groups());
                }
                actor.get('Groups').addGroup(armyId);
                army.addActor(actor);
            }
        }

        // Create commander for this army
        const commFunc = actor => (
            actor.type === faction &&
            actor.danger >= this.minCommDanger
        );
        const commander = parser.createRandomActor({func: commFunc});
        if (commander) {
            this.addCommanderAbilities(commander);
            const comp = new Component.InBattle();
            comp.setData({name: battle.getName(),
                army: army.getName()});
            commander.add(comp);
            army.addActor(commander);
        }
        else {
            RG.warn('FactoryBattle', 'createArmy',
                'No commander for army generated');
        }

        // Army loses if 10% of actors remain, this gives some losing
        // survivors, makes things more interesting
        army.setDefeatThreshold(Math.round(0.1 * armySize));
        return army;
    }

    public makeArmiesAsEnemies(armies: Army[]): void {
        // Make army actors into each others enemies
        armies.forEach(army1 => {
            armies.forEach(army2 => {
                if (army1.getID() !== army2.getID()) {
                    const id2 = army2.getID();
                    army1.getActors().forEach(a1 => {
                        a1.getBrain().getMemory().addEnemyGroup(id2);
                    });
                }
            });

            // Make the actors in army friends
            army1.getActors().forEach(actor1 => {
                actor1.getBrain().getMemory().addFriendGroup(army1.getID());
            });
        });
    }

    public createBattleLevel(cols, rows, conf): Level {
        const levelType = conf.levelType || 'forest';
        const forestConf = RG.getForestConf(cols, rows);
        const battleLevel = FactoryLevel.createLevel(levelType, cols, rows,
            forestConf);
        // TODO add surrounding of the level
        return battleLevel;
    }

    public addCommanderAbilities(actor: SentientActor): void {
        const brain = new Brain.BrainGoalOriented(actor);
        const topGoal = new GoalsTop.ThinkCommander(actor);
        actor.setBrain(brain);
        brain.setGoal(topGoal);
        actor.add(new Component.Commander());
        actor.setFOVRange(10);
    }
}

