
const RG = require('./rg');

/* GameMaster objects reacts to various events caused by player and other
 * actors, and shapes the game world based on them. For example,
 * GameMaster can:
 *   - start battles on the area player entered
 *   - spawn special events and actors
 *   - spawn special items etc.
 */
const GameMaster = function(pool, game) {
    this.eventPool = pool;
    this.player = null;
    this.game = game;

    this.setPlayer = player => {
        console.log('GameMaster setPlayer');
        this.player = player;
    };
    this.setWorld = world => {this.world = world;};

    // Lookup table by level ID
    this.battles = {};

    this.hasNotify = true;
    this.notify = (evtName, args) => {
        if (evtName === RG.EVT_LEVEL_CHANGED) {
            const actor = args.actor;
            if (actor.isPlayer()) {
                // Should spawn something nasty
            }
        }
        else if (evtName === RG.EVT_TILE_CHANGED) {
            console.log('EVT_TILE_CHANGED triggered');
            // Should spawn battle etc event
            if (!this.player) {
                console.log('GameMaster player is null');
                return;
            }
            const level = this.player.getLevel();
            const id = level.getID();
            if (!this.battles.hasOwnProperty(id)) {
                this.battles[id] = 1;
                // TODO refactor into factory method createBattle()
                const battle = new RG.Game.Battle('Battle of level ' + id);
                const forestConf = RG.getForestConf(80, 40);
                const battleLevel = RG.FACT.createLevel('forest', 80, 40,
                    forestConf);
                battle.setLevel(battleLevel);
                const stairsBattle = new RG.Element.Stairs(false);
                battleLevel.addElement(stairsBattle, 1, 1);
                const army1 = new RG.Game.Army('goblins');
                const army2 = new RG.Game.Army('humans');
                const parser = RG.ObjectShell.getParser();
                for (let i = 0; i < 20; i++) {
                    const goblin = parser.createActor('goblin');
                    army1.addActor(goblin);
                    const fighter = parser.createActor('fighter');
                    army2.addActor(fighter);
                }
                battle.addArmy(army1, 10, 10);
                battle.addArmy(army2, 20, 20);

                const stairsArea = new RG.Element.Stairs(true);
                level.addElement(stairsArea, 4, 4);
                stairsArea.connect(stairsBattle);
                this.game.addBattle(battle);
            }
        }
        else if (evtName === RG.EVT_BATTLE_OVER) {
            console.log('GameMaster registered battle over');
            RG.gameMsg('Battle is over!');
        }
    };
    RG.POOL.listenEvent(RG.EVT_LEVEL_CHANGED, this);
    RG.POOL.listenEvent(RG.EVT_TILE_CHANGED, this);
    RG.POOL.listenEvent(RG.EVT_BATTLE_OVER, this);

    this.toJSON = function() {
        return {

        };
    };
};

module.exports = GameMaster;
