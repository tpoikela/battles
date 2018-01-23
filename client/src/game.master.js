
const RG = require('./rg');

RG.Factory = require('./factory');

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
    this.fact = new RG.Factory.Battle(game);

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
                const id = actor.getLevel().getID();
                if (this.battles.hasOwnProperty(id)) {
                    // Entered a battle

                    // Get army selection object
                }
            }
        }
        else if (evtName === RG.EVT_TILE_CHANGED) {
            console.log('EVT_TILE_CHANGED triggered');
            // Should spawn battle etc event
            if (!this.player) {
                return;
            }
            const level = this.player.getLevel();
            const id = level.getID();
            if (!this.battles.hasOwnProperty(id)) {
                this.battles[id] = this.fact.createBattle(level);
            }
        }
        else if (evtName === RG.EVT_BATTLE_OVER) {
            console.log('GameMaster registered battle over');
            RG.gameMsg('Battle is over!');
            // TODO delete the battle (but keep the level)
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
