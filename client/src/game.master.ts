
import RG from './rg';

import {FactoryBattle} from './factory.battle';
import {OWMap} from './overworld.map';
import {OW} from './ow-constants';
import {Menu} from './menu';
import {Random} from './random';

import {EventPool} from '../src/eventpool';

const dbg = require('debug');
const debug = dbg('bitn:GameMaster');

const POOL = EventPool.getPool();

const RNG = Random.getRNG();
/* GameMaster objects reacts to various events caused by player and other
 * actors, and shapes the game world based on them. For example,
 * GameMaster can:
 *   - start battles on the area player entered
 *   - spawn special events and actors
 *   - spawn special items etc.
 */
export const GameMaster = function(game, pool = POOL) {
    this.player = null;
    this.game = game;
    this.fact = new FactoryBattle(game);
    this.pool = pool;

    // Lookup table for battles by level ID
    this.battles = {};
    this.battlesDone = {};

    this.setBattles = battles => {
        this.battles = battles;
    };

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
                    this.tryToAddPlayerToBattle(args);
                }
                else {
                    this.removePlayerFromBattle(args);
                }
            }
        }
        else if (evtName === RG.EVT_CREATE_BATTLE) {
            debug('EVT_CREATE_BATTLE');
            const {areaTile} = args;
            if (args.response) {
                RG.err('GameMaster', 'notify<EVT_CREATE_BATTLE>',
                    `Args has response already: ${JSON.stringify(args)}`);
            }
            const parentLevel = areaTile.getLevel();
            const battle = this.createBattleIntoAreaTileLevel(parentLevel);
            if (battle) {
                args.response = {battle};
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
            const parentLevel = this.player.getLevel();
            this.createBattleIntoAreaTileLevel(parentLevel);
        }
        else if (evtName === RG.EVT_EXPLORED_ZONE_LEFT) {
            // TODO check for creating a new battle on the map
            RG.diag('Explored zone left');
        }
        else if (evtName === RG.EVT_BATTLE_OVER) {
            const {battle} = args;
            debug(`EVT_BATTLE_OVER: ${battle.getName()}`);
            const id = battle.getLevel().getID();

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
    this.pool.listenEvent(RG.EVT_LEVEL_CHANGED, this);
    this.pool.listenEvent(RG.EVT_TILE_CHANGED, this);
    this.pool.listenEvent(RG.EVT_BATTLE_OVER, this);
    this.pool.listenEvent(RG.EVT_CREATE_BATTLE, this);

    /* Returns the bbox for the battle. This is coordinates for the battle
     * inside the tile level. It corresponds to player's current owPos. */
    this.getLevelBbox = function(ow, area, tileXY, owPos, level) {
        // Info needed:
        // local ow pos
        // one ow pos in level cells
        const [owSizeX, owSizeY] = [ow.getSizeX(), ow.getSizeY()];
        const [owX, owY] = owPos;
        const [areaX, areaY] = [area.getSizeX(), area.getSizeY()];
        const [cols, rows] = level.getColsRows();

        const owTilesPerAreaTileX = owSizeX / areaX;
        const owTilesPerAreaTileY = owSizeY / areaY;
        const oneOwTileInCols = areaX * cols / owSizeX;
        const oneOwTileInRows = areaY * rows / owSizeY;
        const localOwX = owX % owTilesPerAreaTileX;
        const localOwY = owY % owTilesPerAreaTileY;

        return {
            ulx: localOwX * oneOwTileInCols,
            uly: localOwY * oneOwTileInRows,
            lrx: (localOwX + 1) * oneOwTileInCols - 1,
            lry: (localOwY + 1) * oneOwTileInRows - 1
        };
    };

    /* Adds player to the battle level. */
    this.tryToAddPlayerToBattle = function(args) {
        const {actor, target, src} = args;
        const srcID = src.getID();
        if (this.battles.hasOwnProperty(srcID)) {
            const battle = this.getBattle(srcID);
            if (battle.isJSON) {
                return; // Cannot join serialized battle anyway
            }
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

    this.addBattle = function(parentId, battle) {
        this.battles[parentId].push(battle);
    };

    this.getBattle = function(parentId) {
        const battle = this.battles[parentId][0];
        return battle;
    };

    this.getBattles = function(parentId) {
        return this.battles[parentId];
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
        const battle = this.getBattle(areaID);
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
        else if (!battle.isOver() && !battleData.army) {
            actor.remove('InBattle');
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



};

/* Moves actors out of the battle level into the parent level of the battle
 * (at the moment this is always Area.Tile level. */
GameMaster.prototype.moveActorsOutOfBattle = function(battle) {
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
            if (actor.isInLevel(level)) {

                if (!actor.isPlayer()) {
                    if (level.removeActor(actor)) {
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
            }
        });
    });

};

    /* Returns the selection object for player to select an army. */
GameMaster.prototype.getSelArmyObject = function(player, battle) {
    const armies = battle.getArmies();
    const selArmyFunc = selection => {
        const army = armies[selection];
        const battleLevel = battle.getLevel();
        let armyActors = army.getActors();
        const nActors = armyActors.length;

        const pIndex = RNG.getUniformInt(0, nActors - 1);
        const replacedActor = armyActors[pIndex];
        const [pX, pY] = replacedActor.getXY();

        // Remove substituted actor from army/level
        replacedActor.get('Action').disable();
        army.removeActor(replacedActor);
        battleLevel.removeActor(replacedActor);

        armyActors = army.getActors();
        army.addActor(player);

        player.get('InBattle').updateData({army: army.getName});
        armyActors.forEach(actor => {
            actor.addFriend(player);
        });

        armies.forEach(enemyArmy => {
            if (enemyArmy !== army) {
                const enemies = enemyArmy.getActors();
                enemies.forEach(enemy => {
                    enemy.addEnemy(player);
                });
            }
        });

        if (!battleLevel.moveActorTo(player, pX, pY)) {
            RG.err('GameMaster', 'getSelArmyObject',
                `Could not move player to ${pX},${pY}`);
        }
    };

    const choices = armies.map((army, i) => {
        return [' Army ' + army.getName(), selArmyFunc.bind(this, i)];
    });
    choices.push(['Take no side', Menu.EXIT_MENU]);
    const menu = new Menu.SelectRequired(choices);
    menu.addPre('Please select an army to join:');
    return menu;
};

GameMaster.prototype.getSelLeaveBattle = function(player, level) {
    const leaveFunc = () => {
      const exit = level.getConnections()[0];
      if (!exit.useStairs(player)) {
        RG.err('GameMaster', 'moveActorsOutOfBattle',
          'Cannot move player via useStairs');
      }
      else {
        const name = player.getName();
        RG.gameMsg(`${name} leaves the battlefield`);
      }
    };
    const choices = [
      ['Leave immediately', leaveFunc],
      ['Stay behind to scavenge the bodies of the dead.', Menu.EXIT_MENU]
    ];
    const menu = new Menu.SelectRequired(choices);
    menu.addPre('Battle is over! Do you want to leave battle?');
    return menu;
};

/* Serializes the object into JSON. */
GameMaster.prototype.toJSON = function() {
    const keys = Object.keys(this.battles);
    const battles = {};
    keys.forEach(id => {
        const battlesTile = this.getBattles(id);
        battlesTile.forEach(battle => {
            if (battles.hasOwnProperty(id)) {
                RG.warn('Game.Master', 'toJSON',
                    `Battle for ID ${id} exists already`);
            }
            else {
                battles[id] = [];
            }

            if (typeof battle.toJSON === 'function') {
                battles[id].push(battle.toJSON());
            }
            else if (battle.name) {
                battles[id].push(battle);
            }
            else {
                RG.err('GameMaster', 'toJSON',
                    'Does not look like proper battle object.');
            }
        });
    });
    return {
        battles,
        battlesDone: this.battlesDone
    };
};

/* Used by the ChunkManager to serialize the battle when player move far
 * enough from the tile. */
GameMaster.prototype.unloadBattles = function(tileLevel) {
    const id = tileLevel.getID();
    if (this.battles.hasOwnProperty(id)) {
        const battles = this.getBattles(id);
        this.battles[id] = [];
        battles.forEach(battle => {
            if (typeof battle.toJSON === 'function') {
                if (!battle.isOver()) {
                    // Important, otherwise cannot be GC'd
                    battle.removeListeners();
                }
                this.battles[id].push(battle.toJSON());
            }
            else {
                RG.err('GameMaster', 'unloadBattle',
                    `Unload for level ${id} failed`);
            }
        });
    }
};

GameMaster.prototype.biomeToLevelType = function(biome) {
    switch (biome) {
        case OW.BIOME.ARCTIC: return 'arctic';
        case OW.BIOME.TUNDRA: return 'arctic';
        case OW.BIOME.ALPINE: return 'mountain';
        case OW.BIOME.TAIGA: return 'forest';
        default: return 'forest';
    }
};

GameMaster.prototype.getBattleLevels = function() {
    const levels = [];
    Object.values(this.battles).forEach(battle => {
        levels.push(battle.getLevel());
    });
    return levels;

};

GameMaster.prototype.createBattleIntoAreaTileLevel = function(parentLevel) {
    const parentId = parentLevel.getID();

    const ow = this.game.getOverWorld();
    let maxDanger = 4;
    let armySize = 20;
    const battleConf = {};
    let levelType = 'forest';

    let bbox = parentLevel.getBbox();

    if (ow) {
        const world = this.game.getCurrentWorld();
        const area = world.getAreas()[0];
        const xy = area.findTileXYById(parentId);

        // TODO use actual starting position
        const startX = 2;
        const startY = area.getSizeY() - 1;
        const dX = Math.abs(startX - xy[0]);
        const dY = Math.abs(startY - xy[1]);
        maxDanger += dX + dY;
        armySize += 20 * dY + 10 * dX;

        const msg = `dx,dy: ${dX},${dY} armySize ${armySize}`;
        debug(`${msg} , danger: ${maxDanger}`);

        const owPos = this.game.getPlayerOwPos();
        if (owPos && owPos.length > 1) {
            const biome = ow.getBiome(owPos[0], owPos[1]);
            levelType = this.biomeToLevelType(biome);
            debug('Creating battle on tile ' + xy);
            bbox = this.getLevelBbox(ow, area, xy, owPos, parentLevel);
        }
    }
    battleConf.maxDanger = maxDanger;
    battleConf.armySize = armySize;
    battleConf.levelType = levelType;
    battleConf.bbox = bbox;

    if (!this.battles.hasOwnProperty(parentId)) {
        this.battles[parentId] = [];
        const battle = this.fact.createBattle(parentLevel, battleConf);
        this.addBattle(parentId, battle);
        this.game.addBattle(this.getBattle(parentId), parentId);
        return battle;
    }
    return null;
};
