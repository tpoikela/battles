
const RG = require('./rg');

RG.Factory = require('./factory');
RG.Factory.Battle = require('./factory.battle');

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

    // Lookup table for battles by level ID
    this.battles = {};

    this.setPlayer = player => {
        this.player = player;
    };
    this.setWorld = world => {this.world = world;};

    this.hasNotify = true;
    this.notify = (evtName, args) => {
        if (evtName === RG.EVT_LEVEL_CHANGED) {
            console.log('GameMaster EVT_LEVEL_CHANGED triggered');
            const {actor, target, src} = args;
            if (actor.isPlayer()) {
                const srcID = src.getID();
                if (this.battles.hasOwnProperty(srcID)) {
                    const battleLevel = this.battles.getLevel().getID();
                    if (battleLevel.getID() === target.getID()) {
                        // Entered a battle
                        console.log('Player entered battle. Getting sel obj');
                        actor.add(new RG.Component.InBattle());
                        // Get army selection object
                        const obj = this.getSelectionObject(actor, this.battles[srcID]);
                        actor.getBrain().setSelectionObject(obj);
                    }
                }
            }
        }
        else if (evtName === RG.EVT_TILE_CHANGED) {
            console.log('EVT_TILE_CHANGED triggered');
            // Should spawn battle etc event
            if (!this.player) {
                console.log('\tBut player is NULL for the moment');
                return;
            }
            console.log('\tPlayer not null. Creating battle');
            const level = this.player.getLevel();
            const id = level.getID();
            if (!this.battles.hasOwnProperty(id)) {
                this.battles[id] = this.fact.createBattle(level);
            }
        }
        else if (evtName === RG.EVT_BATTLE_OVER) {
            const {battle} = args;
            if (battle) {
                this.addBadgesForActors(battle);
                this.moveActorsOutOfBattle(battle);
            }
            else {
                const json = JSON.stringify(args);
                RG.err('Game.Master', 'notify',
                    `Args ${json} does not contain "battle"`);
            }
            console.log('GameMaster registered battle over');
            RG.gameMsg('Battle is over!');
            // TODO delete the battle (but keep the level)
        }
    };
    RG.POOL.listenEvent(RG.EVT_LEVEL_CHANGED, this);
    RG.POOL.listenEvent(RG.EVT_TILE_CHANGED, this);
    RG.POOL.listenEvent(RG.EVT_BATTLE_OVER, this);

    /* Adds BattleBadges after a battle is over. */
    this.addBadgesForActors = battle => {
        const armies = battle.getArmies();
        armies.forEach(army => {
            const actors = army.getActors();
            const ids = actors.map(actor => actor.getID());

            actors.forEach(actor => {
                const badge = new RG.Component.BattleBadge();
                if (army.isDefeated()) {
                    badge.setStatus('Defeated');
                }
                else {
                    badge.setStatus('Won');
                }
                const battleData = {
                    name: battle.getName(),
                    allies: ids
                };
                badge.setData(battleData);
                actor.add(badge);

                let name = actor.getName();
                name = `Battle-tested ${name}`;
                actor.setName(name);
            });
        });
    };

    /* Moves actors out of the battle level into the parent level of the battle
     * (at the moment this is always Area.Tile level. */
    this.moveActorsOutOfBattle = battle => {
        const level = battle.getLevel();
        const conns = level.getConnections();

        if (!conns || conns.length === 0) {
            RG.err('Game.Master', 'moveActorsOutOfBattle',
                'No exit connnection in level');
        }

        const exit = conns[0];
        const targetLevel = exit.getTargetLevel();

        const armies = battle.getArmies();
        armies.forEach(army => {
            const actors = army.getActors();
            actors.forEach(actor => {
                if (level.removeActor(actor)) {
                    targetLevel.addActorToFreeCell(actor);
                }
                else {
                    const json = JSON.stringify(actor.toJSON());
                    RG.err('Game.Master', 'moveActorsOutOfBattle',
                        `removeActor failed for actor ${json}`);
                }
            });
        });

    };

    /* Returns the selection object for player to select an army. */
    this.getSelectionObject = function(player, battle) {
        return {
            showMenu: () => true,
            getMenu: () => {
                RG.gameMsg('Please select an army to join:');
                const armies = battle.getArmies();
                const menuObj = {};
                armies.forEach((army, i) => {
                    menuObj[i] = ' Army ' + army.getName();
                });
                menuObj['Any other key'] = 'Take no side';
                return menuObj;
            },
            select: code => {
                const selection = RG.codeToIndex(code);
                const armies = battle.getArmies();
                if (selection < armies.length) {
                    return () => {
                        armies[selection].addActor(player);
                    };
                }
                return null;
            }
        };
    };

    this.toJSON = function() {
        return {
            battles: this.battles
        };
    };
};

module.exports = GameMaster;
