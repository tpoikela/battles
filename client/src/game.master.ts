
import RG from './rg';

import {FactoryBattle, BattleConf} from './factory.battle';
import {OW} from './ow-constants';
import {Menu} from './menu';
import {Random} from './random';
import {Army, Battle, BattleJSON} from './game.battle';
import {Level} from './level';
import {SentientActor} from './actor';
import {WorldTop} from './world';
import {BBox} from './bbox';
import {Cell} from './map.cell';
import {FactoryLevel} from './factory.level';
import {Geometry} from './geometry';
import {World, City, CityQuarter, AreaTile} from './world';
import {LevelSurroundings} from './level-surroundings';
import {ElementStairs} from './element';

import {EventPool, EvtArgs} from './eventpool';
import * as Component from './component';
import * as IF from './interfaces';

const dbg = require('debug');
const debug = dbg('bitn:GameMaster');

const POOL = EventPool.getPool();
const RNG = Random.getRNG();

type BrainPlayer = import('./brain').BrainPlayer;
type BattleObj = Battle | BattleJSON;

interface BattleObjMap {
    [key: number]: BattleObj[];
}

/* GameMaster objects reacts to various events caused by player and other
 * actors, and shapes the game world based on them. For example,
 * GameMaster can:
 *   - start battles on the area player entered
 *   - spawn special events and actors
 *   - spawn special items etc.
 */
export class GameMaster {
    public player: SentientActor;
    public game: any ; // GameMain; TODO fix typings
    public fact: FactoryBattle;
    public pool: EventPool;
    public battles: BattleObjMap;
    public hasBattleSpawned: {[key: string]: boolean};

    // Key is level ID of the battle level (NOT parent area level)
    public battlesDone: {[key: number]: boolean};

    public hasNotify: boolean;
    public world: WorldTop;

    constructor(game, pool: EventPool = POOL) {
        this.player = null;
        this.game = game;
        this.fact = new FactoryBattle();
        this.pool = pool;

        // Lookup table for battles by level ID
        this.battles = {};
        this.battlesDone = {};
        this.hasBattleSpawned = {};
        this.hasNotify = true;

        this.pool.listenEvent(RG.EVT_LEVEL_CHANGED, this);
        this.pool.listenEvent(RG.EVT_TILE_CHANGED, this);
        this.pool.listenEvent(RG.EVT_BATTLE_OVER, this);
        this.pool.listenEvent(RG.EVT_CREATE_BATTLE, this);
        this.pool.listenEvent(RG.EVT_CREATE_ZONE, this);
    }

    public setDebug(enable: boolean): void {
        debug.enabled = enable;
    }

    public setBattles(battles: BattleObjMap): void {
        this.battles = battles;
    }

    public setPool(pool: EventPool): void {this.pool = pool;}
    public setGame(game): void {this.game = game;}

    public setPlayer(player: SentientActor): void {
        this.player = player;
    }

    public setWorld(world: WorldTop): void {this.world = world;}

    public notify(evtName: string, args: EvtArgs) {
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
            // With this event, a creation of new battle can be requested. The
            // resulting battle is placed into args.response. notify() is
            // synchronous, thus new battle is available after notifying the
            // event
            debug('EVT_CREATE_BATTLE');
            const {areaTile} = args;
            if (args.response) {
                RG.err('GameMaster', 'notify<EVT_CREATE_BATTLE>',
                    `Args has response already: ${JSON.stringify(args)}`);
            }
            const parentLevel: Level = areaTile.getLevel();
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
            if (!this.hasBattleSpawned[parentLevel.getID()]) {
                this.createBattleIntoAreaTileLevel(parentLevel);
            }
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
                this.createBattleEvent(battle);
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
        else if (evtName === RG.EVT_CREATE_ZONE) {
            const {areaTile, level, cell, zoneConf} = args;
            this.createZoneIntoAreaTileLevel(areaTile, level, cell, zoneConf);
        }
    }

    /* Returns the bbox for the battle. This is coordinates for the battle
     * inside the tile level. It corresponds to player's current owPos. */
    public getLevelBbox(ow, area, tileXY, owPos, level): BBox {
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

        return BBox.fromBBox({
            ulx: localOwX * oneOwTileInCols,
            uly: localOwY * oneOwTileInRows,
            lrx: (localOwX + 1) * oneOwTileInCols - 1,
            lry: (localOwY + 1) * oneOwTileInRows - 1
        });
    }

        /* Adds player to the battle level. */
    public tryToAddPlayerToBattle(args) {
        const {actor, target, src} = args;
        const srcID = src.getID();
        if (this.battles.hasOwnProperty(srcID)) {
            debug('tryToAddPlayerToBattle', srcID, '->', target.getID());
            const battle = this.getBattle(srcID, target.getID());
            if (!battle || (battle as BattleJSON).isJSON) {
                return; // Cannot join serialized battle anyway
            }
            const battleObj = battle as Battle;
            const battleLevel = battleObj.getLevel();

            if (battleLevel.getID() === target.getID()) {
                if (this.actorCanEnter(actor, battleObj)) {
                    // Entered a battle
                    const comp = new Component.InBattle();
                    comp.setData({name: battleObj.getName()});
                    actor.add(comp);
                    // Get army selection object
                    const obj = this.getSelArmyObject(actor, battleObj);
                    actor.getBrain().setSelectionObject(obj);
                }
                else if (battleObj.isOver()) {
                    RG.gameMsg('Looks like the battle is already fought..');
                }
                else {
                    RG.gameMsg('You cannot join the fight anymore, deserter.');
                }
            }
        }

    }

    public addBattle(parentId: number, battle: BattleObj): void {
        if (!this.battles.hasOwnProperty(parentId)) {
            this.battles[parentId] = [];
        }
        this.battles[parentId].push(battle);
    }

    public getBattle(parentId: number, battleId: number): BattleObj {
        const battle = this.battles[parentId].find(b => {
            if ((b as BattleJSON).isJSON) {
                return false;
            }
            else {
                const id = (b as Battle).getLevel().getID();
                return id === battleId;
            }
        });
        return battle;
    }

    public getBattles(parentId: number): BattleObj[] {
        return this.battles[parentId];
    }

    /* Returns true if the actor can still enter the battle as an army member.
     * */
    public actorCanEnter(actor, battle: Battle): boolean {
        if (battle.isOver()) {return false;}
        if (this.actorDesertedBattle(actor, battle)) {return false;}
        return true;
    }

    /* Removes the player from a battle. */
    public removePlayerFromBattle(args): void {
        const {actor, target, src} = args;
        const areaID = target.getID();
        const srcID = src.getID();
        const battle = this.getBattle(areaID, srcID) as Battle;
        const battleLevID = battle.getLevel().getID();

        const inBattleComp = actor.get('InBattle');
        const battleData = inBattleComp.getData();

        if (srcID !== battleLevID) {
            const msg = `Level ID mismatch: ${srcID} !== ${battleLevID}`;
            RG.err('GameMaster', 'removePlayerFromBattle', msg);
        }

        // Mark player as deserter, TODO add confirm object
        if (!battle.isOver() && battleData.army) {
            const badge = new Component.BattleBadge();
            badge.setData({status: 'Fled', name: battle.getName(),
                army: battleData.army});
            actor.add(badge);
            actor.remove('InBattle');
            actor.add(new Component.BattleOver());
        }
        else if (!battle.isOver() && !battleData.army) {
            actor.remove('InBattle');
        }
    }

    /* Adds BattleBadges after a battle is over. */
    public addBadgesForActors(battle) {
        const armies = battle.getArmies();
        armies.forEach(army => {
            const actors = army.getActors();
            const ids = actors.map(actor => actor.getID());

            actors.forEach(actor => {
                if (!this.actorDesertedBattle(actor, battle)) {
                    const badge = new Component.BattleBadge();
                    const battleData = {
                        name: battle.getName(),
                        id: battle.getID(),
                        army: army.getName(),
                        allies: ids,
                        status: army.isDefeated() ? 'Lost' : 'Won'
                    };
                    badge.setData(battleData);
                    actor.add(badge);

                    actor.remove('InBattle');
                    actor.add(new Component.BattleOver());
                }
            });
        });
    }

    public actorDesertedBattle(actor, battle): boolean {
        const badgeList = actor.getList('BattleBadge');
        const badge = badgeList.find(b => (
            b.getData().id === battle.getID()
        ));
        if (badge) {return true;}
        return false;
    }

    /* Moves actors out of the battle level into the parent level of the battle
     * (at the moment this is always Area.Tile level. */
    public moveActorsOutOfBattle(battle) {
        const level = battle.getLevel();
        const conns = level.getConnections();

        if (!conns || conns.length === 0) {
            RG.err('Game.Master', 'moveActorsOutOfBattle',
                'No exit connnection in level');
        }

        const exit = conns[0];
        const targetLevel = exit.getTargetLevel();
        if (this.hasBattleSpawned[targetLevel.getID()]) {
            this.hasBattleSpawned[targetLevel.getID()] = false;
        }

        const armies: Army[] = battle.getArmies();
        armies.forEach((army: Army) => {
            const actors = army.getActors();
            actors.forEach(actor => {
                if (actor.isInLevel(level)) {

                    if (!actor.isPlayer()) {
                        // TODO should move actor using systems
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
                        const selObj = this.getLeaveBattleMenu(actor, level);
                        (actor.getBrain() as BrainPlayer).setSelectionObject(selObj);
                    }
                }
            });
        });

    }

    /* Returns the selection object for player to select an army. */
    public getSelArmyObject(player, battle: Battle) {
        const armies = battle.getArmies();

        // This function called when player selects an army to join
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
            if (!player.has('Groups')) {
                player.add(new Component.Groups());
            }
            player.get('Groups').addGroup(army.getID());
            army.getActors().forEach(actor => {
                if (actor.isEnemy(player)) {
                    actor.getBrain().getMemory().removeEnemy(player);
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
    }

    public getLeaveBattleMenu(player, level) {
        const leaveFunc = () => {
          const exit = level.getConnections()[0];
          // UseStairs work only on top of stairs cell, move player there
          if (level.moveActorTo(player, exit.getX(), exit.getY())) {
              const useStairs = new Component.UseStairs();
              player.add(useStairs);
              const name = player.getName();
              RG.gameMsg(`${name} leaves the battlefield`);
          }
          else {
              RG.err('GameMaster', 'moveActorsOutOfBattle',
                  'Cannot move player to stairs cell');
          }
        };
        const choices = [
          ['Leave immediately', leaveFunc],
          ['Stay behind to scavenge the bodies of the dead.', Menu.EXIT_MENU]
        ];
        const menu = new Menu.SelectRequired(choices);
        menu.addPre('Battle is over! Do you want to leave battle?');
        return menu;
    }


    public createBattleEvent(battle: Battle): void {
        const level = battle.getLevel();
        const battleEvent = new Component.BattleEvent();
        battleEvent.setEventType(RG.EVT_BATTLE_OVER);
        battleEvent.setBattle(battle);
        level.add(battleEvent);
    }

    /* Serializes the object into JSON. */
    public toJSON() {
        const keys = Object.keys(this.battles);
        const battles: any = {};
        keys.forEach((id: string) => {
            const battlesTile: BattleObj[] = this.getBattles(parseInt(id, 10));
            battlesTile.forEach((battle: BattleObj) => {
                if (!battles.hasOwnProperty(id)) {
                    battles[id] = [];
                }

                if (typeof (battle as Battle).toJSON === 'function') {
                    battles[id].push((battle as Battle).toJSON());
                }
                else if ((battle as BattleJSON).name) {
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
            battlesDone: this.battlesDone,
            hasBattleSpawned: this.hasBattleSpawned
        };
    }

    /* Used by the ChunkManager to serialize the battle when player move far
     * enough from the tile. */
    public unloadBattles(tileLevel: Level) {
        const id = tileLevel.getID();
        if (this.battles.hasOwnProperty(id)) {
            const battles = this.getBattles(id);
            this.battles[id] = [];
            battles.forEach(battle => {
                if (typeof (battle as Battle).toJSON === 'function') {
                    const battleObj = battle as Battle;
                    if (!battleObj.isOver()) {
                        // Important, otherwise cannot be GC'd
                        battleObj.removeListeners();
                    }
                    this.battles[id].push(battleObj.toJSON());
                }
                else {
                    RG.err('GameMaster', 'unloadBattle',
                        `Unload for level ${id} failed`);
                }
            });
        }
    }

    public biomeToLevelType(biome) {
        switch (biome) {
            case OW.BIOME.ARCTIC: return 'arctic';
            case OW.BIOME.TUNDRA: return 'arctic';
            case OW.BIOME.ALPINE: return 'mountain';
            case OW.BIOME.TAIGA: return 'forest';
            default: return 'forest';
        }
    }

    public getBattleLevels(): Level[] {
        const levels: Level[] = [];
        // TODO fix typings
        Object.values(this.battles).forEach((battlesPerID: BattleObj[]) => {
            battlesPerID.forEach(battle => {
                if (!(battle as BattleJSON).isJSON) {
                    levels.push((battle as Battle).getLevel());
                }
            });
        });
        return levels;

    }

    public createBattleIntoAreaTileLevel(parentLevel: Level): Battle {
        if (!parentLevel) {
            RG.err('GameMaster', 'createBattleIntoAreaTileLevel',
                `Parent level is null`);
        }
        const parentId = parentLevel.getID();

        const ow = this.game.getOverWorld();
        let maxDanger = 4;
        let armySize = 20;
        const battleConf: BattleConf = {};
        let levelType = 'forest';

        let bbox: BBox = parentLevel.getBbox();

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
            if (owPos) {
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

        const battle = this.fact.createBattle(parentLevel, battleConf);
        this.addBattle(parentId, battle);
        const battleId = battle.getLevel().getID();
        this.game.addBattle(this.getBattle(parentId, battleId), parentId);
        this.hasBattleSpawned[parentId] = true;
        return battle;
    }

    public createZoneIntoAreaTileLevel(
        areaTile: AreaTile,
        parentLevel: Level, cell: Cell, conf: IF.ZoneConf
    ): void {
        const cols = 60;
        const rows = 30;

        const id = parentLevel.getID();
        const name = conf.name || 'Wilderness';

        const factLevel = new FactoryLevel();
        let createdLevel = factLevel.createLevel('empty', cols, rows);
        if (parentLevel) {
            const cityZone = new City(conf.name);
            const quarter = new CityQuarter(conf.name);
            //TODO: Could we set this in areaTile.addZone
            cityZone.tileX = areaTile.getTileX();
            cityZone.tileY = areaTile.getTileY();
            cityZone.addSubZone(quarter);
            areaTile.addZone('city', cityZone);

            // Add connecting stairs between battle and area
            const stairsArea = new ElementStairs('wilderness', parentLevel);
            const map = parentLevel.getMap();
            const [x, y] = cell.getXY();
            parentLevel.addStairs(stairsArea, x, y);

            const cellsAround = Geometry.getCellsAround(map, cell);
            console.log('cellsAround are', cellsAround);
            const levelSurround = new LevelSurroundings();
            const surrConf = {cellsAround, surroundX: 20, surroundY: 15};
            createdLevel = levelSurround.surround(createdLevel, surrConf)!;
            quarter.addLevel(createdLevel);

            World.addExitsToEdge(createdLevel);
            World.connectAreaConnToLevel(stairsArea, createdLevel, parentLevel);
            // If we don't add level to game, engine will crash
            this.game.addLevel(createdLevel);
            const msg = 'You discover a new place!';
            RG.gameMsg({cell, msg});
        }


    }

}
