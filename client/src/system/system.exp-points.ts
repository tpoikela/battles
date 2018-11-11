
import RG from '../rg';
import {SystemBase} from './system.base';
import {ActorClass} from '../actor-class';

/* Called for entities which gained experience points recently.*/
export class SystemExpPoints extends SystemBase {
    constructor(compTypes, pool?) {
        super(RG.SYS.EXP_POINTS, compTypes, pool);
    }

    updateEntity(ent) {
        const expList = ent.getList('ExpPoints');
        expList.forEach(expPoints => {

            const expComp = ent.get('Experience');
            let levelingUp = true;

            let exp = expComp.getExp();
            exp += expPoints.getExpPoints();
            expComp.setExp(exp);

            while (levelingUp) {
                const currExpLevel = expComp.getExpLevel();
                const nextExpLevel = currExpLevel + 1;
                const reqExp = RG.getExpRequired(nextExpLevel);

                if (exp >= reqExp) { // Required exp points exceeded
                    RG.levelUpActor(ent, nextExpLevel);
                    const name = ent.getName();
                    if (ent.isPlayer() && ent.has('ActorClass')) {
                        const actorClass = ent.get('ActorClass').getClass();
                        const menuObj = ActorClass.getLevelUpObject(
                            nextExpLevel, actorClass);
                        ent.getBrain().setSelectionObject(menuObj);
                    }
                    else {
                        const msg = `${name} is more experienced now.`;
                        RG.gameSuccess({msg: msg, cell: ent.getCell()});
                    }
                    levelingUp = true;
                }
                else {
                    levelingUp = false;
                }
            }
            ent.remove(expPoints);
        });
    }
}
