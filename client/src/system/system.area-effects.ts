
const RG = require('../rg');

const System = {};
System.Base = require('./system.base');

System.AreaEffects = function(compTypes) {
    System.Base.call(this, RG.SYS.AREA_EFFECTS, compTypes);
    this.radRange = 1;

    this.updateEntity = function(ent) {
        const flameComps = ent.getList('Flame');
        let isFire = false;
        let isIce = false;
        if (ent.has('Health')) {
            flameComps.forEach(flameComp => {
                const dmgType = flameComp.getDamageType();
                const dmgComp = new RG.Component.Damage(flameComp.getDamage(),
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
    };

    this._createRadiationComps = function(ent, compName, srcName) {
        const map = ent.getLevel().getMap();
        const cell = ent.getCell();
        const [x, y] = cell.getXY();
        const radiationBox = RG.Geometry.getBoxAround(x, y, this.radRange);
        radiationBox.forEach(xy => {
            if (map.hasXY(xy[0], xy[1])) {
                const cell = map.getCell(xy[0], xy[1]);
                if (cell.hasActors()) {
                    const actors = cell.getActors();
                    actors.forEach(actor => {
                        // Name check prevents slow down when lots of fire
                        // actors are present
                        if (actor.getName() !== srcName) {
                            actor.add(new RG.Component[compName]());
                        }
                    });
                }
            }
        });
    };

};
RG.extend2(System.AreaEffects, System.Base);

module.exports = System.AreaEffects;
