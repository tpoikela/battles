
import RG from '../rg';
import {SystemBase} from './system.base';
import {EventPool} from '../eventpool';
import * as Component from '../component';
import * as Item from '../item';
import {ObjectShell, Parser} from '../objectshellparser';
import {IShell} from '../interfaces';

const NO_DAMAGE_SRC = RG.NO_DAMAGE_SRC;
type Cell = import('../map.cell').Cell;
type Level = import('../level').Level;
type BaseActor = import('../actor').BaseActor;

const POOL = EventPool.getPool();

export class SystemDeath extends SystemBase {

    public enableRandomLootDrops: boolean;
    public normalLootChance: number;
    public betterLootChance: number;

    constructor(compTypes: string[], pool?: EventPool) {
        super(RG.SYS.DEATH, compTypes, pool);

        // If set to true, generates random loot drops
        this.enableRandomLootDrops = true;
        this.normalLootChance = 0.07;
        this.betterLootChance = 0.03;
        this.traceID = -1;
    }

    public updateEntity(ent): void {
        const deathComp = ent.get('DeathEvent');
        const damageSrc = deathComp.getSource();
        if (ent.has('Loot')) {
            const entCell: Cell = ent.getCell();
            ent.get('Loot').dropLoot(entCell);
        }
        this._dropInvAndEq(ent);
        this._killActor(damageSrc, ent, deathComp);
        ent.remove(deathComp);
    }

    /* Removes actor from current level and emits Actor killed event.*/
    public _killActor(src, actor, deathComp): void {
        const level = actor.getLevel();
        const cell = actor.getCell();
        actor.add(new Component.Dead());

        if (this.debugEnabled) {
            let msg = 'Killing actor now';
            msg += JSON.stringify(actor.getCompList());
            this._emitDbgMsg(msg, actor);
        }

        if (level.removeActor(actor)) {
            const nameKilled = actor.getName();

            if (actor.has('Experience')) {
                this._giveExpToSource(src, actor);
            }

            const deathMsg = deathComp.getMsg();
            if (deathMsg) {
                RG.gameDanger({cell, msg: deathMsg});
            }

            let killVerb = 'killed';
            if (actor.has('NonSentient')) {
                killVerb = 'destroyed';
            }

            let killMsg = nameKilled + ' was ' + killVerb;
            if (src !== NO_DAMAGE_SRC) {killMsg += ' by ' + src.getName();}

            RG.gameDanger({cell, msg: killMsg});
            POOL.emitEvent(RG.EVT_ACTOR_KILLED, {actor});
            if (actor.isPlayer()) {
                POOL.emitEvent(RG.EVT_PLAYER_KILLED, {actor});
            }

            const evtComp = new Component.Event();
            evtComp.setArgs({type: RG.EVT_ACTOR_KILLED,
                cause: src});
            actor.add(evtComp);

            if (this.enableRandomLootDrops) {
                this._genRandomLootDrop(actor, level, cell, src);
            }

            // Finally drop a corpse
            this._dropActorCorpse(actor, level, cell, src);
            this._cleanUpComponents(actor);
        }
        else {
            RG.err('System.Damage', 'killActor', 'Couldn\'t remove actor');
        }
    }

    /* When an actor is killed, gives experience to damage's source.*/
    public _giveExpToSource(att, def): void {
        if (att !== NO_DAMAGE_SRC && !att.has('Dead')) {
            const defLevel = def.get('Experience').getExpLevel();
            const defDanger = def.get('Experience').getDanger();
            if (att.has('Experience')) {
                const expPoints = new Component.ExpPoints(defLevel + defDanger);
                att.add(expPoints);
                att.get('Experience').incrNumKilled();
            }
            else {
                console.log(`Killer was ${att.getName()} without Experience`);
            }

            // Give additional battle experience
            if (att.has('InBattle')) {
                this._giveBattleExpToSource(att);
                if (def.has('InBattle')) {
                    this._checkIfKillerIsTraitor(att, def);
                }
            }
        }
    }

    /* Adds additional battle experience given if actor is in a battle. */
    public _giveBattleExpToSource(att) {
        if (!att.has('BattleExp')) {
            const inBattleComp = att.get('InBattle');
            const data = inBattleComp.getData();
            if (data) {
                const name = data.name;
                const comp = new Component.BattleExp();
                comp.setData({kill: 0, name});
                att.add(comp);
            }
            else {
                const msg = `Actor: ${JSON.stringify(att)}`;
                RG.err('System.Damage', '_giveBattleExpToSource',
                    `InBattle data is null. Actor: ${msg}`);
            }
        }
        att.get('BattleExp').getData().kill += 1;
    }

    public _checkIfKillerIsTraitor(att, def): void {
        const attData = att.get('InBattle').getData();
        const defData = def.get('InBattle').getData();
        if (attData.army === defData.army) {
            attData.isTraitor = true;
        }
    }

    public _dropInvAndEq(actor): void {
        const [x, y] = actor.getXY();
        if (!actor.getInvEq) {
            return;
        }
        const invEq = actor.getInvEq();
        const items = invEq.getInventory().getItems();
        const actorLevel = actor.getLevel();

        items.forEach(item => {
            if (invEq.removeNItems(item, item.getCount())) {
                const rmvItem = invEq.getRemovedItem();
                actorLevel.addItem(rmvItem, x, y);
            }
        });

        const eqItems = invEq.getEquipment().getItems();
        eqItems.forEach(item => {
            actorLevel.addItem(item, x, y);
        });
    }

    public _cleanUpComponents(actor): void {
        const compTypes = ['Coldness', 'Expiration', 'Fading'];
        compTypes.forEach(compType => {
            const compList = actor.getList(compType);
            compList.forEach(comp => {
                if (typeof comp.cleanup === 'function') {
                    comp.cleanup();
                }
                actor.remove(comp);
            });
        });
        // actor.get('Action').disable();
    }

    public _cloneComponentsToCorpse(actor, corpse): void {
        const compTypes = ['Health', 'Stats', 'Combat', 'Experience'];
        compTypes.forEach(compType => {
            const comp = actor.get(compType).clone();
            corpse.add(comp);
        });

        const maybeTypes = ['Undead'];
        if (actor.hasAny(maybeTypes)) {
            maybeTypes.forEach(compType => {
                if (actor.has(compType)) {
                    const comp = actor.get(compType).clone();
                    corpse.add(comp);
                }
            });
        }
    }

    /* Drops the actor corpse to the ground. */
    protected _dropActorCorpse(actor, level: Level, cell: Cell, src): void {
        const nameKilled: string = actor.getName();
        const [x, y] = cell.getXY();
        if (actor.has('Corporeal')) {
            const corpse = new Item.Corpse(nameKilled + ' corpse');
            corpse.setActorName(actor.get('Named').getBaseName());
            this._cloneComponentsToCorpse(actor, corpse);

            // TODO move some components like stats, resistance etc
            // This way, eating corpse can move these around

            // Update rendering info for corpse item
            const cssClass = RG.getCssClass(RG.TYPE_ACTOR, nameKilled);
            RG.addCellStyle(RG.TYPE_ITEM, corpse.getName(), cssClass);

            level.addItem(corpse, x, y);
            if (actor.has('QuestTarget')) {
                const qEvent = new Component.QuestTargetEvent();
                qEvent.setEventType('kill');
                qEvent.setArgs({corpse});
                qEvent.setTargetComp(actor.get('QuestTarget'));
                src.add(qEvent);
            }

            this._addSpawnableUndeadActor(actor);
        }
    }

    protected _genRandomLootDrop(actor, level: Level, cell: Cell, src): void {
        if (!canHaveRandomLoot(actor)) {
            return;
        }
        if (!RG.isSuccess(this.normalLootChance)) {
            return;
        }

        const defLevel = actor.get('Experience').getExpLevel();
        const defDanger = actor.get('Experience').getDanger();
        const minValue = defLevel * 10 + defDanger * 10;
        let maxValue =  defLevel * 10 + defDanger * 30;
        if (RG.isSuccess(this.betterLootChance)) {
            maxValue *= 2;
        }

        const parser = ObjectShell.getParser();
        const func = shell => shell.value >= minValue && shell.value <= maxValue;
        const item = parser.createRandomItem({func});
        if (item) {
            const [x, y] = cell.getXY();
            const ok = level.addItem(item, x, y);
            if (!ok) {
                RG.warn('System.Death', '_genRandomLootDrop',
                `Failed to add item to ${x},${y}`);
            }
        }
    }

    /* Creates required shell for actor to be created as undead. */
    protected _addSpawnableUndeadActor(actor): void {
        if (actor.getType() === 'undead' || actor.has('Undead')) {
            return;
        }
        const baseName = actor.get('Named').getBaseName();
        const parser: Parser = ObjectShell.getParser();
        const found: IShell = parser.dbGet({name: baseName,
            categ: RG.TYPE_ACTOR});
        if (found) {
            const shell = found;
            const newShell = JSON.parse(JSON.stringify(shell));
            newShell.type = 'undead';
            newShell.enemies = RG.ACTOR_RACES;
            newShell.tag = 'killed';
            if (newShell.addComp) {
                if (Array.isArray(newShell.addComp)) {
                    newShell.addComp.push('Undead');
                }
                else {
                    newShell.addComp = [newShell.addComp, 'Undead'];
                }
            }
            else {
                newShell.addComp = ['Undead'];
            }
            newShell.name = 'undead ' + newShell.name;
            newShell.color = {fg: 'Cyan', bg: 'Black'};
            if (!parser.hasObj(RG.TYPE_ACTOR, newShell.name)) {
                parser.parseObjShell(RG.TYPE_ACTOR, newShell);
            }
        }
    }

}

/* Some sanity checks that rats/bats do not drop random items. */
function canHaveRandomLoot(actor): boolean {
    if (/(animal)/.test(actor.getType())) {
        const defDanger = actor.get('Experience').getDanger();
        return defDanger >= 7;
    }
    return true;
}
