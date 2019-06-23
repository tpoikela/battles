
import RG from '../rg';
import {SystemBase} from './system.base';
import {EventPool} from '../eventpool';
import * as Component from '../component';

export class SystemDrainStats extends SystemBase {

    constructor(compTypes: string[], pool?: EventPool) {
        super(RG.SYS.DRAIN_STATS, compTypes, pool);
    }

    public updateEntity(ent): void {
        const drainComps = ent.getList('DrainStat');
        drainComps.forEach(drainComp => {
            this.processDrainComp(ent, drainComp);
            ent.remove(drainComp); // After dealing damage, remove comp
        });
    }

    public processDrainComp(ent, drainComp): void {
        if (drainComp.applyComp()) {
            let msg = drainComp.getDrainMsg();
            if (msg !== '') {
                const srcName = drainComp.getSource().getName();
                msg = srcName + ' ' + msg + ' ' + ent.getName();
                RG.gameMsg({cell: ent.getCell(), msg});
            }
        }
        ent.remove(drainComp);

        if (ent.has('Health')) {
            const health = ent.get('Health');
            if (health.isDead() && !ent.has('Dead')) {
                if (!ent.has('DeathEvent')) {
                    const deathComp = new Component.DeathEvent();
                    deathComp.setSource(drainComp.getSource());
                    let msg = ent.getName() + ' is drained out of life';
                    msg += ' permanently';
                    deathComp.setMsg(msg);
                    ent.add(deathComp);
                }
            }
        }
    }

}
