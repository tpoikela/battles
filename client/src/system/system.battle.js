
const RG = require('../rg');

const System = {};
System.Base = require('./system.base');

const {addSkillsExp} = System.Base;

/* Battle system handles battle-related components such as badges from battle
 * survivors etc. */
System.Battle = function(compTypes) {
    System.Base.call(this, RG.SYS.BATTLE, compTypes);
    this.compTypesAny = true; // Triggered on at least one component

    this.updateEntity = function(ent) {
        if (ent.has('BattleOver')) {
            const comp = ent.get('BattleOver');
            if (ent.has('BattleExp')) {
                const data = ent.get('BattleExp').getData();
                const bName = data.name;
                const badge = this._getBadgeForBattle(bName, ent);
                if (data.kill > 0) {
                    addSkillsExp(ent, 'Battle', data.kill);
                    if (badge) {
                        badge.updateData({kill: data.kill});
                    }
                    else {
                        const msg = `No badge found for battle ${msg}`;
                        RG.err('System.Battle', 'updateEntity', msg);
                    }

                }

                // Add some reputation for winner
                if (badge.isWon()) {
                    let rep = null;
                    if (!ent.has('Reputation')) {
                        rep = new RG.Component.Reputation();
                        ent.add(rep);
                    }
                    else {
                        rep = ent.get('Reputation');
                    }
                    rep.addToFame(1);
                }

                ent.remove('BattleExp');
            }
            ent.remove(comp);
        }
        else if (ent.has('BattleOrder')) {
            const orderComp = ent.get('BattleOrder');
            this._emitMsg(ent, orderComp);
            ent.remove(orderComp);
        }
    };

    this._getBadgeForBattle = (bName, ent) => {
        const badges = ent.getList('BattleBadge');
        const badge = badges.find(b => b.getData().name === bName);
        return badge;
    };

    this._emitMsg = (ent, comp) => {
        const srcName = comp.getArgs().srcActor.getName();
        const cell = ent.getCell();
        const msg = `${srcName} shouts a command into your direction.`;
        RG.gameMsg({msg, cell});
    };
};
RG.extend2(System.Battle, System.Base);

module.exports = System.Battle;
