
import RG from '../rg';
import {SystemBase} from './system.base';
import * as Component from '../component';
// import {Cell} from '../map.cell';
type ItemAmmo = import('../item').Ammo;
type MissileWeapon = import('../item').MissileWeapon;

export class SystemAttackRanged extends SystemBase {

    constructor(compTypes: string[], pool?) {
        super(RG.SYS.ATTACK_RANGED, compTypes, pool);
    }

    public updateEntity(ent): void {
        const attComp = ent.get('AttackRanged');
        const target = attComp.getTarget();
        const actor = attComp.getAttacker();
        const invEq = actor.getInvEq();
        let fireRate = 1;
        if (actor.has('DoubleShot')) {
            fireRate = 2;
        }

        // Fires one missile comp each firerate increment
        for (let i = 0; i < fireRate; i++) {

            const missile = invEq.unequipAndGetItem('missile', 1, 0);
            if (!RG.isNullOrUndef([missile])) {

                // Check for missile weapon for ammunition
                if (missile.has('Ammo')) {
                    const missWeapon = invEq.getEquipment()
                        .getEquipped('missileweapon') as unknown;
                    if (missWeapon === null) {
                        const msg = 'No missile weapon equipped.';
                        this.cmdNotPossible(ent, msg);
                    }
                    else { // Check ammo/weapon compatibility
                        const ammo = missile as unknown;
                        const ammoType = (ammo as ItemAmmo).getAmmoType();
                        const weaponType = (missWeapon as MissileWeapon).getWeaponType();
                        if (actor.has('MixedShot')) {
                            const re = /bow/;
                            if (!re.test(ammoType) || !re.test(weaponType)) {
                                if (ammoType !== weaponType) {
                                    const msg = 'Ammo/weapon not compatible.';
                                    this.cmdNotPossible(ent, msg);
                                }
                            }
                        }
                        else if (ammoType !== weaponType) {
                            const msg = 'Ammo/weapon not compatible.';
                            this.cmdNotPossible(ent, msg);
                        }
                    }
                }

                if (!RG.isNullOrUndef([target])) {
                    const [x, y, z] = target.getXYZ();
                    const mComp = new Component.Missile(actor);
                    mComp.setTargetXYZ(x, y, z);
                    mComp.setDamage(RG.getMissileDamage(actor, missile));
                    mComp.setAttack(RG.getMissileAttack(actor));
                    mComp.setRange(RG.getMissileRange(actor, missile));
                    missile.add(mComp);
                    ent.get('Action').setEnergy(RG.energy.MISSILE);
                }
                else {
                    RG.err('System.AttackMissile', 'updateEntity',
                        'No x,y given for missile.');
                }
            }
            else {
                this.cmdNotPossible(ent, 'No missile equipped');
            }
        }
        ent.remove(attComp);
    }

    protected cmdNotPossible(ent: any, msg: string): void {
        ent.get('Action').setMsg(msg);
        ent.get('Action').setStatus(-1);
        if (ent.has('Player')) {
            ent.add(new Component.ImpossibleCmd());
        }
    }
}
