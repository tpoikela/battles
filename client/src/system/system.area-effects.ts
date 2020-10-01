
import RG from '../rg';
import {SystemBase} from './system.base';
import * as Component from '../component';
import { Geometry } from '../geometry';

type EventPool = import('../eventpool').EventPool;

export class SystemAreaEffects extends SystemBase {
    public radRange: number;

    constructor(compTypes, pool: EventPool) {
        super(RG.SYS.AREA_EFFECTS, compTypes, pool);
        this.radRange = 1;
    }


    public updateEntity(ent) {
        const flameComps = ent.getList('Flame');
        let isFire = false;
        let isIce = false;
        if (ent.has('Health')) {
            flameComps.forEach(flameComp => {
                const dmgType = flameComp.getDamageType();
                const dmgComp = new Component.Damage(flameComp.getDamage(),
                    dmgType);

                const flameSrc = flameComp.getSource();
                dmgComp.setSource(flameSrc);
                if (flameSrc.has('Created')) {
                    const srcActor = flameSrc.get('Created').getCreator();
                    dmgComp.setSourceActor(srcActor);
                }
                ent.add(dmgComp);
                ent.remove(flameComp);
                if (dmgType === RG.DMG.FIRE) {isFire = true;}
                else if (dmgType === RG.DMG.ICE) {isIce = true;}
            });
        }
        else {
            // TODO add damages to doors etc
            ent.removeAll('Flame');
        }
        if (isFire) {
            this._createRadiationComps(ent, 'Heat', 'Fire');
        }
        else if (isIce) {
            this._createRadiationComps(ent, 'Coldness', 'Ice flame');
        }
    }

    private _createRadiationComps(ent, compName, srcName) {
        const map = ent.getLevel().getMap();
        const cell = ent.getCell();
        const [x, y] = cell.getXY();
        const radiationBox = Geometry.getBoxAround(x, y, this.radRange);
        radiationBox.forEach(xy => {
            if (map.hasXY(xy[0], xy[1])) {
                const cell = map.getCell(xy[0], xy[1]);
                if (cell.hasActors()) {
                    const actors = cell.getActors();
                    actors.forEach(actor => {
                        // Name check prevents slow down when lots of fire
                        // actors are present
                        if (actor.getName() !== srcName) {
                            actor.add(new Component[compName]());
                        }
                    });
                }
            }
        });
    }
}
