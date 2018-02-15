
const RG = require('./rg');

RG.Factory = require('./factory');
RG.Factory.Battle = require('./factory.battle');

const debug = require('debug')('bitn:GameMaster');

/* GameMaster objects reacts to various events caused by player and other
 * actors, and shapes the game world based on them. For example,
 * GameMaster can:
 *   - start battles on the area player entered
 *   - spawn special events and actors
 *   - spawn special items etc.
 */
const GameMaster = function(game) {
    this.player = null;
    this.game = game;
    this.fact = new RG.Factory.Battle(game);

    // Lookup table for battles by level ID
    this.battles = {};

    this.battlesDone = {};

    this.setPool = pool => {this.pool = pool;};
    this.setGame = game => {this.game = game;};

    this.setPlayer = player => {
        this.player = player;
    };
    this.setWorld = world => {this.world = world;};

    this.hasNotify = true;
    this.notify = (evtName, args) => {
        if (evtName === RG.EVT_LEVEL_CHANGED) {
            debug('EVT_LEVEL_CHANGED');
            const {actor} = args;
            if (actor.isPlayer()) {
                if (!actor.has('InBattle')) {
                    this.addPlayerToBattle(args);
                }
                else {
                    this.removePlayerFromBattle(args);
                }
            }
        }
        else if (evtName === RG.EVT_TILE_CHANGED) {
            debug('EVT_TILE_CHANGED');
            // Should spawn battle etc event
            if (!this.player) {
                debug('\tBut player is NULL for the moment');
                return;
            }
            debug('\tPlayer not null. Creating battle');
            const level = this.player.getLevel();
            const id = level.getID();
            if (!this.battles.hasOwnProperty(id)) {
                this.battles[id] = this.fact.createBattle(level);
                this.game.addBattle(this.battles[id]);
            }
        }
        else if (evtName === RG.EVT_BATTLE_OVER) {
            const {battle} = args;
            debug(`EVT_BATTLE_OVER: ${battle.getName()}`);
            const id = battle.getLevel().getID();
            const parentId = battle.getLevel().getParent();

            if (!this.battles.hasOwnProperty(parentId)) {
                return;
            }

            debug(`1. battlesDone for ${id}: ${this.battlesDone[id]}`);
            if (!this.battlesDone[id] && battle) {
                debug(`2. battlesDone for ${id}: ${this.battlesDone[id]}`);
                this.battlesDone[id] = true;
                debug(`3. battlesDone for ${id}: ${this.battlesDone[id]}`);
                this.addBadgesForActors(battle);
                this.moveActorsOutOfBattle(battle);
                const bName = battle.getName();
                RG.gameMsg(`Battle ${bName} is over!`);
            }
            else {
                const json = JSON.stringify(args);
                RG.err('Game.Master', 'notify',
                    `Args ${json} does not contain "battle"`);
            }
            debug('GameMaster registered battle over');
            // TODO delete the battle (but keep the level)
        }
    };
    RG.POOL.listenEvent(RG.EVT_LEVEL_CHANGED, this);
    RG.POOL.listenEvent(RG.EVT_TILE_CHANGED, this);
    RG.POOL.listenEvent(RG.EVT_BATTLE_OVER, this);

    /* Adds player to the battle level. */
    this.addPlayerToBattle = function(args) {
        const {actor, target, src} = args;
        const srcID = src.getID();
        if (this.battles.hasOwnProperty(srcID)) {
            const battle = this.battles[srcID];
            const battleLevel = battle.getLevel();
            if (battleLevel.getID() === target.getID()) {
                if (this.actorCanEnter(actor, battle)) {
                    // Entered a battle
                    const comp = new RG.Component.InBattle();
                    comp.setData({name: battle.getName()});
                    actor.add(comp);
                    // Get army selection object
                    const obj = this.getSelArmyObject(actor, battle);
                    actor.getBrain().setSelectionObject(obj);
                }
                else if (battle.isOver()) {
                    RG.gameMsg('Looks like the battle is already fought..');
                }
                else {
                    RG.gameMsg('You cannot join the fight anymore, deserter.');
                }
            }
        }

    };

    /* Returns true if the actor can still enter the battle as an army member.
     * */
    this.actorCanEnter = (actor, battle) => {
        if (battle.isOver()) {return false;}
        if (this.actorDesertedBattle(actor, battle)) {return false;}
        return true;
    };

    /* Removes the player from a battle. */
    this.removePlayerFromBattle = function(args) {
        const {actor, target, src} = args;
        const areaID = target.getID();
        const srcID = src.getID();
        const battle = this.battles[areaID];
        const battleLevID = battle.getLevel().getID();

        const inBattleComp = actor.get('InBattle');
        const battleData = inBattleComp.getData();

        if (srcID !== battleLevID) {
            const msg = `Level ID mismatch: ${srcID} !== ${battleLevID}`;
            RG.err('GameMaster', 'removePlayerFromBattle', msg);
        }

        // Mark player as deserter, TODO add confirm object
        if (!battle.isOver() && battleData.army) {
            const badge = new RG.Component.BattleBadge();
            badge.setData({status: 'Fled', name: battle.getName(),
                army: battleData.army});
            actor.add(badge);
            actor.remove('InBattle');
            actor.add(new RG.Component.BattleOver());
        }
    };

    /* Adds BattleBadges after a battle is over. */
    this.addBadgesForActors = battle => {
        const armies = battle.getArmies();
        armies.forEach(army => {
            const actors = army.getActors();
            const ids = actors.map(actor => actor.getID());

            actors.forEach(actor => {
                if (!this.actorDesertedBattle(actor, battle)) {
                    const badge = new RG.Component.BattleBadge();
                    const battleData = {
                        name: battle.getName(),
                        army: army.getName(),
                        allies: ids,
                        status: army.isDefeated() ? 'Lost' : 'Won'
                    };
                    badge.setData(battleData);
                    actor.add(badge);

                    actor.remove('InBattle');
                    actor.add(new RG.Component.BattleOver());
                }
            });
        });
    };

    this.actorDesertedBattle = (actor, battle) => {
        const badgeList = actor.getList('BattleBadge');
        const badge = badgeList.find(b => (
            b.getData().name === battle.getName()
        ));
        if (badge) {return true;}
        return false;
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
                if (!actor.isPlayer()) {
                    if (level.removeActor(actor)) {
                        debug(`Removed actor ${actor.getID()},${actor.getName()}`);
                        targetLevel.addActorToFreeCell(actor);
                    }
                    else {
                        const json = JSON.stringify(actor.toJSON());
                        RG.err('Game.Master', 'moveActorsOutOfBattle',
                            `level.removeActor failed for actor ${json}`);
                    }
                }
                else {
                    const selObj = this.getSelLeaveBattle(actor, level);
                    actor.getBrain().setSelectionObject(selObj);
                }
            });
        });

    };

    /* Returns the selection object for player to select an army. */
    this.getSelArmyObject = function(player, battle) {
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
                    const army = armies[selection];
                    return () => {
                        army.addActor(player);
                        player.get('InBattle').updateData({army: army.getName});
                        const actors = army.getActors();
                        actors.forEach(actor => {
                            actor.addFriend(player);
                        });
                    };
                }
                return null;
            }
        };
    };

    this.getSelLeaveBattle = function(player, level) {
        const selObj = function() {
            this.showMenu = () => true;
            this.getMenu = () => {
                RG.gameMsg('Battle is over! Do you want to leave battle?');
                return {
                    0: 'Leave immediately',
                    1: 'Stay behind to scavenge the bodies of the dead.'
                };
            };
            this.select = code => {
                const selection = RG.codeToIndex(code);
                if (selection === 0) {
                    return () => {
                        const exit = level.getConnections()[0];
                        if (!exit.useStairs(player)) {
                            RG.err('GameMaster', 'moveActorsOutOfBattle',
                                'Cannot move player out of battle via useStairs');
                        }
                        else {
                            const name = player.getName();
                            RG.gameMsg(`${name} leaves the battlefield`);
                        }
                    };
                }
                if (selection === 1) {
                    // TODO add some dishonor for the player or some necromancy
                    // effect etc
                    return null;
                }
                return this;
            };
        };
        return new selObj();
    };

    /* Serializes the object into JSON. */
    this.toJSON = function() {
        const keys = Object.keys(this.battles);
        const battles = {};
        keys.forEach(id => {
            battles[id] = this.battles[id].toJSON();
        });
        return {
            battles,
            battlesDone: this.battlesDone
        };
    };
};

module.exports = GameMaster;
