
import RG from '../rg';
import {SystemBase} from './system.base';
import {SystemQuest} from './system.quest';
import * as Component from '../component';
import {emitZoneEvent} from './system.utils';

/* Battle system handles battle-related components such as badges from battle
 * survivors etc. */
export class SystemBattle extends SystemBase {

    constructor(compTypes, pool?) {
        super(RG.SYS.BATTLE, compTypes, pool);
        this.compTypesAny = true; // Triggered on at least one component
    }

    public updateEntity(ent) {
        if (ent.has('BattleOver')) {
            const overComp = ent.get('BattleOver');
            if (ent.has('BattleExp')) {
                const data = ent.get('BattleExp').getData();
                const bName = data.name;
                const badge = this._getBadgeForBattle(bName, ent);
                if (data.kill > 0) {
                    SystemBase.addSkillsExp(ent, 'Battle', data.kill);
                    if (badge) {
                        badge.updateData({kill: data.kill});
                    }
                    else {
                        const msg = `No badge found for battle`;
                        RG.err('System.Battle', 'updateEntity', msg);
                    }

                }

                if (data.isTraitor) {
                    badge.updateDate({status: 'Traitor'});
                }

                // Add some reputation for winner
                if (badge.isWon()) {
                    let rep = null;
                    if (!ent.has('Reputation')) {
                        rep = new Component.Reputation();
                        ent.add(rep);
                    }
                    else {
                        rep = ent.get('Reputation');
                    }
                    rep.addToFame(1);
                }

                ent.remove('BattleExp');

                // Check if this battle (level) belonged to a quest
                const level = ent.getLevel();
                if (ent.has('Quest') && level.has('QuestTarget')) {
                    const qTarget = ent.get('QuestTarget');
                    const args = {isWon: badge.isWon()};
                    SystemQuest.addQuestEvent(ent, qTarget, 'battle', args);
                }
            }

            ent.remove(overComp);
        }
        else if (ent.has('BattleOrder')) {
            const orderComp = ent.get('BattleOrder');
            this._emitMsg(ent, orderComp);
            ent.remove(orderComp);
        }
        else if (ent.has('BattleEvent')) {
            const battleEvt = ent.get('BattleEvent');
            this._processBattleEvent(ent, battleEvt);
            ent.remove(battleEvt);
        }
    }

    public _getBadgeForBattle(bName, ent) {
        const badges = ent.getList('BattleBadge');
        const badge = badges.find(b => b.getData().name === bName);
        return badge;
    }

    public _emitMsg(ent, comp) {
        const srcName = comp.getArgs().srcActor.getName();
        const cell = ent.getCell();
        const msg = `${srcName} shouts a command into your direction.`;
        RG.gameMsg({msg, cell});
    }

    protected _processBattleEvent(ent, battleEvt): void {
        emitZoneEvent(ent, RG.ZONE_EVT.BATTLE_OVER);
    }
}
