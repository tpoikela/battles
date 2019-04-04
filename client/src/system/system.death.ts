
import RG from '../rg';
import {SystemBase} from './system.base';
import {EventPool} from '../eventpool';
import * as Component from '../component';
import * as Item from '../item';
import {ObjectShell} from '../objectshellparser';

const NO_DAMAGE_SRC = RG.NO_DAMAGE_SRC;
type Cell = import('../map.cell').Cell;
const POOL = EventPool.getPool();

export class SystemDeath extends SystemBase {

    constructor(compTypes: string[], pool?: EventPool) {
        super(RG.SYS.DEATH, compTypes, pool);
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
        const [x, y] = actor.getXY();

        actor.add(new Component.Dead());

        if (level.removeActor(actor)) {
            const nameKilled = actor.getName();

            if (actor.has('Experience')) {
                this._giveExpToSource(src, actor);
            }

            const deathMsg = deathComp.getMsg();
            if (deathMsg) {
                RG.gameDanger({cell, msg: deathMsg});
            }
            /*
            const dmgType = dmgComp.getDamageType();
            if (dmgType === 'poison') {
                RG.gameDanger({cell,
                    msg: nameKilled + ' dies horribly of poisoning!'});
            }*/

            let killVerb = 'killed';
            if (actor.has('NonSentient')) {
                killVerb = 'destroyed';
            }

            let killMsg = nameKilled + ' was ' + killVerb;
            if (src !== NO_DAMAGE_SRC) {killMsg += ' by ' + src.getName();}

            RG.gameDanger({cell, msg: killMsg});
            POOL.emitEvent(RG.EVT_ACTOR_KILLED, {actor});

            const evtComp = new Component.Event();
            evtComp.setArgs({type: RG.EVT_ACTOR_KILLED,
                cause: src});
            actor.add(evtComp);

            // Finally drop a corpse
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
            this._cleanUpComponents(actor);
        }
        else {
            RG.err('System.Damage', 'killActor', 'Couldn\'t remove actor');
        }
    }

    /* When an actor is killed, gives experience to damage's source.*/
    public _giveExpToSource(att, def) {
        console.log('_giveExpToSource att is ', att);
        if (att !== NO_DAMAGE_SRC && !att.has('Dead')) {
            const defLevel = def.get('Experience').getExpLevel();
            const defDanger = def.get('Experience').getDanger();
            const expPoints = new Component.ExpPoints(defLevel + defDanger);
            att.add(expPoints);

            // Give additional battle experience
            if (att.has('InBattle')) {
                this._giveBattleExpToSource(att);
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
    }

    public _cloneComponentsToCorpse(actor, corpse): void {
        const compTypes = ['Named', 'Health', 'Stats', 'Combat', 'Experience'];
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

    /* When an actor dies, it can be spawned as undead. */
    public _addSpawnableUndeadActor(actor): void {
        if (actor.getType() === 'undead' || actor.has('Undead')) {
            return;
        }
        const baseName = actor.get('Named').getBaseName();
        const parser = ObjectShell.getParser();
        const found = parser.dbGet({name: baseName,
            categ: RG.TYPE_ACTOR});
        if (found) {
            const shell = found;
            const newShell = JSON.parse(JSON.stringify(shell));
            newShell.type = 'undead';
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
            parser.parseObjShell(RG.TYPE_ACTOR, newShell);
            console.log('Added new actor ', newShell.name, 'to parser');
        }
    }

}
