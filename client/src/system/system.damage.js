
const RG = require('../rg');

const System = {};
System.Base = require('./system.base');

const NO_DAMAGE_SRC = RG.NO_DAMAGE_SRC;
const RNG = RG.Random.getRNG();

const {addCompToEntAfterHit} = System.Base;

/* Processes entities with damage component.*/
System.Damage = function(compTypes) {
    System.Base.call(this, RG.SYS.DAMAGE, compTypes);

    this.updateEntity = ent => {
        const dmgComps = ent.getList('Damage');
        dmgComps.forEach(dmgComp => {
            this.processDamageComp(ent, dmgComp);
            ent.remove(dmgComp); // After dealing damage, remove comp
        });
    };

    this.processDamageComp = function(ent, dmgComp) {
        const health = ent.get('Health');
        if (health) {
            let totalDmg = this._getDamageModified(ent, dmgComp);

            // Check if any damage was done at all
            if (totalDmg <= 0) {
                totalDmg = 0;
                const msg = "Attack doesn't penetrate protection of "
                    + ent.getName();
                RG.gameMsg({msg, cell: ent.getCell()});
            }
            else {
                _applyAddOnHitComp(ent, dmgComp);
                health.decrHP(totalDmg);
                if (this.debugEnabled) {
                    const hpMax = health.getMaxHP();
                    const hp = health.getHP();
                    const msg = `(${totalDmg}),(${hp}/${hpMax})`;
                    RG.gameDanger({msg, cell: ent.getCell()});
                }
            }

            const damageSrc = this._getUltimateDmgSource(dmgComp);
            if (damageSrc && (ent.getID() !== damageSrc.getID())) {
                ent.addEnemy(damageSrc);
            }

            if (health.isDead() && !ent.has('Dead')) {
                if (ent.has('Loot')) {
                    const entCell = ent.getCell();
                    ent.get('Loot').dropLoot(entCell);
                }
                _dropInvAndEq(ent);

                this._killActor(damageSrc, ent, dmgComp);
            }

            // Emit ACTOR_DAMAGED
            // Emitted only for player for efficiency reasons

            if (damageSrc) {
                if (damageSrc.isPlayer() || ent.isPlayer()) {
                    if (!RG.isNullOrUndef([damageSrc, ent])) {
                        const evtComp = new RG.Component.Event();
                        evtComp.setArgs({type: RG.EVT_ACTOR_DAMAGED,
                            cause: damageSrc});
                        ent.add(evtComp);
                    }
                }
            }
        }

    };

    this._getUltimateDmgSource = function(dmgComp) {
        let damageSrc = dmgComp.getSourceActor();
        if (!damageSrc) {
            damageSrc = dmgComp.getSource();
        }
        if (damageSrc && damageSrc.has('Created')) {
            damageSrc = damageSrc.get('Created').getCreator();
        }
        return damageSrc;
    };

    /* Checks if protection checks can be applied to the damage caused. For
     * damage like hunger and poison, no protection helps.*/
    this._getDamageModified = (ent, dmgComp) => {
        const dmgType = dmgComp.getDamageType();
        let src = dmgComp.getSourceActor();
        if (!src) {
            src = dmgComp.getSource();
        }
        const dmg = _getDmgAfterWeaknessAndResistance(ent, dmgComp);

        // Deal with "internal" damage bypassing protection here
        const cell = ent.getCell();
        if (dmgType === RG.DMG.POISON) {
            const msg = 'Poison is gnawing inside ' + ent.getName();
            RG.gameDanger({cell, msg});
            return dmg;
        }
        else if (dmgType === RG.DMG.HUNGER) {
            return dmg;
        }
        else if (dmgType === RG.DMG.FIRE) {
            const msg = `Fire is burning ${ent.getName()}.`;
            RG.gameDanger({cell, msg});
            return dmg;
        }
        else if (dmgType === RG.DMG.ICE) {
            const msg = `Ice is freezing ${ent.getName()}.`;
            RG.gameDanger({cell, msg});
            return dmg;
        }
        else if (dmgType === RG.DMG.COLD) {
            const msg = `${ent.getName()} is extremely hypothermic`;
            RG.gameInfo({cell, msg});
            return dmg;
        }
        else if (this.bypassProtection(ent, src)) {
            const msg = `${src.getName()} hits ${ent.getName()} through armor.`;
            RG.gameDanger({cell, msg});
            return dmg;
        }

        // Take defs protection value into account
        const protEquip = ent.getEquipProtection();
        const protStats = ent.get('Combat').getProtection();
        const protTotal = protEquip + protStats;
        const totalDmg = dmg - protTotal;
        return totalDmg;
    };

    const _getDmgAfterWeaknessAndResistance = (ent, dmgComp) => {
        const entName = ent.getName();
        let dmg = dmgComp.getDamage();
        if (ent.has('Weakness')) {
            const weakList = ent.getList('Weakness');
            weakList.forEach(weakComp => {
                if (this.effectMatches(dmgComp, weakComp)) {
                    const effLevel = weakComp.getLevel();
                    switch (effLevel) {
                        case RG.WEAKNESS.MINOR: {
                            dmg = Math.round(1.25 * dmg); break;
                        }
                        case RG.WEAKNESS.MEDIUM: {
                            dmg = Math.round(1.5 * dmg); break;
                        }
                        case RG.WEAKNESS.SEVERE: dmg *= 2; break;
                        case RG.WEAKNESS.FATAL: {
                            dmg = ent.get('Health').getMaxHP(); break;
                        }
                        default: break;
                    }
                }
            });
        }
        if (ent.has('Resistance')) {
            let msg = entName;
            const resistList = ent.getList('Resistance');
            resistList.forEach(resistComp => {
                if (this.effectMatches(dmgComp, resistComp)) {
                    const effLevel = resistComp.getLevel();
                    switch (effLevel) {
                        case RG.RESISTANCE.MINOR: {
                            dmg = Math.round(dmg / 1.25);
                            msg += ' resists the attack slighty';
                            break;
                        }
                        case RG.RESISTANCE.MEDIUM: {
                            dmg = Math.round(dmg / 1.5);
                            msg += ' resists the attack';
                            break;
                        }
                        case RG.RESISTANCE.STRONG: {
                            dmg = Math.round(dmg / 2);
                            msg += ' resists the attack strongly';
                            break;
                        }
                        case RG.RESISTANCE.IMMUNITY: {
                            dmg = 0;
                            msg += ' is immune against the attack';
                            break;
                        }
                        case RG.RESISTANCE.ABSORB: {
                            const health = ent.get('Health');
                            health.addHP(dmg);
                            msg += ' absorbs the power of the attack';
                            break;
                        }
                        default: break;
                    }

                }
            });
            RG.gameMsg({msg, cell: ent.getCell()});
        }
        return dmg;
    };

    this.effectMatches = (dmgComp, effComp) => {
        const effect = effComp.getEffect();
        const dmgType = dmgComp.getDamageType();
        const dmgCateg = dmgComp.getDamageCateg();
        return effect === dmgType || effect === dmgCateg;
    };

    /* Returns true if the hit bypasses defender's protection completely. */
    this.bypassProtection = (ent, src) => {
        const bypassChance = RNG.getUniform();
        if (src && src.has('BypassProtection')) {
            return bypassChance <= src.get('BypassProtection').getChance();
        }
        return bypassChance <= RG.PROT_BYPASS_CHANCE;
    };

    /* Applies add-on hit effects such as poison, frost or others. */
    const _applyAddOnHitComp = (ent, dmgComp) => {
        const weapon = dmgComp.getWeapon();
        if (weapon && weapon.has) { // Attack was done using weapon
            if (weapon.has('AddOnHit')) {
                const comp = weapon.get('AddOnHit').getComp();
                addCompToEntAfterHit(comp, ent, dmgComp.getSource());
            }
        }
        else if (weapon && weapon.onHit) {
            const src = dmgComp.getSource();
            if (weapon.onHit) {
                weapon.onHit(ent, src);
            }
        }
        else { // No weapon was used
            const src = dmgComp.getSource();
            if (src && src.has('AddOnHit')) {
                const comp = src.get('AddOnHit').getComp();
                addCompToEntAfterHit(comp, ent, src);
            }
        }
    };

    const _dropInvAndEq = actor => {
        const [x, y] = actor.getXY();
        if (!actor.getInvEq) {
            return;
        }
        const invEq = actor.getInvEq();
        const items = invEq.getInventory().getItems();
        const actorLevel = actor.getLevel();

        items.forEach(item => {
            if (invEq.removeNItems(item, item.count)) {
                const rmvItem = invEq.getRemovedItem();
                actorLevel.addItem(rmvItem, x, y);
            }
        });

        const eqItems = invEq.getEquipment().getItems();
        eqItems.forEach(item => {
            actorLevel.addItem(item, x, y);
        });
    };

    /* Removes actor from current level and emits Actor killed event.*/
    this._killActor = (src, actor, dmgComp) => {
        const level = actor.getLevel();
        const cell = actor.getCell();
        const [x, y] = actor.getXY();

        actor.add(new RG.Component.Dead());

        if (level.removeActor(actor)) {
            const nameKilled = actor.getName();

            if (actor.has('Experience')) {
                _giveExpToSource(src, actor);
            }
            const dmgType = dmgComp.getDamageType();
            if (dmgType === 'poison') {
                RG.gameDanger({cell,
                    msg: nameKilled + ' dies horribly of poisoning!'});
            }

            let killVerb = 'killed';
            if (actor.has('NonSentient')) {
                killVerb = 'destroyed';
            }

            let killMsg = nameKilled + ' was ' + killVerb;
            if (src !== NO_DAMAGE_SRC) {killMsg += ' by ' + src.getName();}

            RG.gameDanger({cell, msg: killMsg});
            RG.POOL.emitEvent(RG.EVT_ACTOR_KILLED, {actor});

            const evtComp = new RG.Component.Event();
            evtComp.setArgs({type: RG.EVT_ACTOR_KILLED,
                cause: src});
            actor.add(evtComp);

            // Finally drop a corpse
            if (actor.has('Corporeal')) {
                const corpse = new RG.Item.Corpse(nameKilled + ' corpse');
                const cssClass = RG.getCssClass(RG.TYPE_ACTOR, nameKilled);
                RG.addCellStyle(RG.TYPE_ITEM, corpse.getName(), cssClass);
                level.addItem(corpse, x, y);
            }
            _cleanUpComponents(actor);
        }
        else {
            RG.err('System.Damage', 'killActor', "Couldn't remove actor");
        }
    };

    /* When an actor is killed, gives experience to damage's source.*/
    const _giveExpToSource = (att, def) => {
        if (att !== NO_DAMAGE_SRC) {
            const defLevel = def.get('Experience').getExpLevel();
            const defDanger = def.get('Experience').getDanger();
            const expPoints = new RG.Component.ExpPoints(defLevel + defDanger);
            att.add('ExpPoints', expPoints);

            // Give additional battle experience
            if (att.has('InBattle')) {
                _giveBattleExpToSource(att, def);
            }
        }
    };

    /* Adds additional battle experience given if actor is in a battle. */
    const _giveBattleExpToSource = (att) => {
        if (!att.has('BattleExp')) {
            const inBattleComp = att.get('InBattle');
            const data = inBattleComp.getData();
            if (data) {
                const name = data.name;
                const comp = new RG.Component.BattleExp();
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
    };

    const _cleanUpComponents = actor => {
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
    };

};
RG.extend2(System.Damage, System.Base);


module.exports = System.Damage;
