

const RG = require('../rg');
const debug = require('debug')('bitn:System.Movement');

const System = {};
System.Base = require('./system.base');

const {addSkillsExp} = System.Base;

/* This system handles all entity movement.*/
System.Movement = function(compTypes) {
    System.Base.call(this, RG.SYS.MOVEMENT, compTypes);

    this.climbRe = /highrock/;

    /* Checks movements like climbing. */
    this._checkSpecialMovement = function(ent, cell) {
        const elemType = cell.getBaseElem().getType();
        if (this.climbRe.test(elemType) && ent.has('Climber')) {
            const msg = `${ent.getName()} climbs the rocky terrain`;
            RG.gameMsg({cell, msg});
            return true;
        }
        return false;
    };

    /* When player enters exploration element cell, function processes this. At
    *  the moment, this gives only exp to player. */
    this._processExploreElem = (ent, cell) => {
        const level = ent.getLevel();
        const [x, y] = [cell.getX(), cell.getY()];
        const expElem = cell.getPropType('exploration')[0];
        if (level.removeElement(expElem, x, y)) {
            const givenExp = expElem.getExp();
            const expPoints = new RG.Component.ExpPoints(givenExp);
            ent.add(expPoints);
            addSkillsExp(ent, 'Exploration', 1);

            if (expElem.hasData()) {
                const expData = expElem.getData();
                if (expData.zoneType) {
                    ent.get('GameInfo').addZoneType(expData.zoneType);
                }
            }

            // Add level parent ID to the info list
            const levelParent = level.getParent();
            if (levelParent) {
                ent.get('GameInfo').addZone(levelParent.getID());
            }

            let msg = expElem.getMsg();
            if (msg.length === 0) {
                msg = `${ent.getName()} has explored zone thoroughly.`;
            }
            RG.gameInfo({cell, msg});
            if (ent.isPlayer()) {ent.getBrain().addMark();}
        }
    };

    this.speedPenalty = function(scale) {
        return {
            value: -scale, srcComp: 'Stats', srcFunc: 'getSpeed',
            targetComp: 'StatsMods', targetFunc: 'setSpeed'
        };
    };

    this.defensePenalty = function(scale) {
        return {
            value: -scale, srcComp: 'Combat', srcFunc: 'getDefense',
            targetComp: 'CombatMods', targetFunc: 'setDefense'
        };
    };

    /* If player moved to the square, checks if any messages must
     * be emitted. */
    this.checkMessageEmits = (prevCell, newCell) => {
        if (newCell.hasProp(RG.TYPE_ELEM)) {
            if (newCell.hasStairs()) {
                const stairs = newCell.getStairs();
                const level = stairs.getTargetLevel();
                let msg = 'You see stairs here';

                const parent = level.getParent();
                if (parent) {
                    const name = RG.formatLocationName(level);
                    msg += `. They seem to be leading to ${name}`;
                }
                RG.gameMsg(msg);
            }
            else if (newCell.hasPassage()) {
                const passage = newCell.getPassage();
                const level = passage.getTargetLevel();
                const dir = RG.getCardinalDirection(level, newCell);
                let msg = `You see a passage to ${dir} here.`;
                const parent = level.getParent();
                if (parent) {
                    const name = RG.formatLocationName(level);
                    msg += `. It seems to be leading to ${name}`;
                }
                RG.gameMsg(msg);
            }
            else if (newCell.hasConnection()) {
                const connection = newCell.getConnection();
                const level = connection.getTargetLevel();
                let msg = 'You see an entrance here';

                const parent = level.getParent();
                if (parent) {
                    const name = RG.formatLocationName(level);
                    msg += `. It seems to be leading to ${name}`;
                }
                RG.gameMsg(msg);

            }
            if (newCell.hasPropType('lever')) {
                RG.gameMsg('There is a lever on the floor');
            }

            if (!prevCell.hasShop() && newCell.hasShop()) {
                const shop = newCell.getShop();
                if (shop.isAbandoned()) {
                    RG.gameMsg('This shop seems to be abandoned');
                }
                else {
                    RG.gameMsg('You have entered a shop.');
                }
            }
            else if (newCell.hasShop()) {
                const shop = newCell.getShop();
                if (!shop.isAbandoned()) {
                    RG.gameMsg('You can drop items to sell them here.');
                }
            }
        }


        if (newCell.hasItems()) {
            const items = newCell.getProp('items');
            const topItem = items[0];
            let topItemName = topItem.getName();
            if (topItem.count > 1) {
                topItemName = `${topItemName} (x${topItem.count})`;
            }

            if (items.length > 1) {
                RG.gameMsg('There are several items here. ' +
                    `You see ${topItemName} on top`);
            }
            else {
                RG.gameMsg(`You see ${topItemName}` + ' on the floor');
            }
            if (topItem.has('Unpaid')) {
                if (topItem.count > 1) {RG.gameMsg('They are for sale');}
                else {RG.gameMsg('It is for sale');}
            }
        }

        const baseType = newCell.getBaseElem().getType();
        let baseMsg = '';
        switch (baseType) {
            case 'bridge': baseMsg = 'You are standing on a bridge.'; break;
            case 'grass': baseMsg = 'You see some grass.'; break;
            case 'road': baseMsg = 'You tread lightly on the road.'; break;
            case 'snow': baseMsg = 'Ground is covered with snow.'; break;
            case 'tree': baseMsg = 'There is a tree here.'; break;
            default: break;
        }
        if (baseMsg.length > 0) {
            RG.gameMsg(baseMsg);
        }
    };

    /* Reports an error if an entity could not be removed. */
    this._moveError = function(ent) {
        const [xOld, yOld] = ent.getXY();
        const level = ent.getLevel();
        const map = level.getMap();
        const coord = xOld + ', ' + yOld;
        RG.diag('\n\nSystem.Movement list of actors:');
        RG.printObjList(level.getActors(),
            ['getID', 'getName', 'getX', 'getY']);
        this._diagnoseRemovePropError(xOld, yOld, map, ent);
        RG.err('MovementSystem', 'moveActorTo',
            "Couldn't remove ent |" + ent.getName() + '| @ ' + coord);
    };


    /* If removal of moved entity fails, tries to diagnose the error. */
    this._diagnoseRemovePropError = function(xTry, yTry, map, ent) {
        const propType = ent.getPropType();
        let xFound = -1;
        let yFound = -1;
        for (let x = 0; x < map.cols; x++) {
            for (let y = 0; y < map.rows; y++) {
                if (map.removeProp(x, y, propType, ent)) {
                    xFound = x;
                    yFound = y;
                }
            }
        }

        const cell = map.getCell(xTry, yTry);
        RG.diag(`Cell at ${xTry},${yTry}:`);
        RG.diag(cell);

        const entCell = ent.getCell();
        RG.diag('Cell of the entity:');
        RG.diag(entCell);

        RG.diag('System.Movement: diagnoseRemovePropError:');
        const name = ent.getName();
        if (xFound >= 0 && yFound >= 0) {
            const xy = `${xFound},${yFound} instead of ${xTry},${yTry}.`;
            const msg = `\tEnt |${name}| found from |${xy}|`;
            RG.diag(msg);
        }
        else {
            const msg = `\tNo ent |${name}| found on entire map.`;
            RG.diag(msg);
        }

        // Last resort, try find.
        RG.diag('map.Find list of objects: ');
        const objects = map.findObj(obj => {
            return obj.getName && obj.getName().match(/keeper/);
        });
        RG.diag(objects);

    };

    /* These are applied when an actor enters a cell with given type of base
     * element.
     * If the value is float, it is used to scale from base value in
     * Stats/Combat, if it's integer it's added directly. */
    this._bonuses = {
        water: {
            dontApplyTo: ['Flying'],
            mods: [
                this.speedPenalty(0.5),
                this.defensePenalty(0.5),
                {
                    value: -5, srcComp: 'Combat', srcFunc: 'getAttack',
                    targetComp: 'CombatMods', targetFunc: 'setAttack'
                }
            ]
        },
        grass: {
            mods: [
                this.speedPenalty(0.10)
            ]
        },
        bridge: {mods: [
            this.defensePenalty(0.5)
        ]},
        stone: {mods: [
            this.speedPenalty(0.25)
        ]},
        snow: {
            dontApplyTo: ['Flying', 'SnowWalk'],
            mods: [
                this.speedPenalty(0.25)
            ]
        }
    };

};
RG.extend2(System.Movement, System.Base);

System.Movement.prototype.updateEntity = function(ent) {
    const movComp = ent.get('Movement');
    const [x, y] = movComp.getXY();

    const map = movComp.getLevel().getMap();

    if (!map.hasXY(x, y)) {
        let msg = `Tried to move to ${x},${y}.`;
        msg += ' Entity: ' + ent.getName();
        RG.warn('System.Movement', 'updateEntity', msg);
    }

    const cell = map.getCell(x, y);
    const prevCell = ent.getCell();
    let canMoveThere = cell.isFree(ent.has('Flying'));
    if (!canMoveThere) {
        canMoveThere = this._checkSpecialMovement(ent, cell);
    }

    if (canMoveThere) {
        const xyOld = ent.getXY();
        if (debug.enabled) {
            RG.debug(this, `Trying to move ent from ${xyOld}`);
        }

        const propType = ent.getPropType();
        if (map.moveProp(xyOld, [x, y], propType, ent)) {
            ent.setXY(x, y);

            this.checkForStatsMods(ent, prevCell, cell);
            if (ent.isPlayer && ent.isPlayer()) {
                if (cell.hasPropType('exploration')) {
                    this._processExploreElem(ent, cell);
                }
                this.checkMessageEmits(prevCell, cell);
            }
        }
        else {
            this._moveError(ent);
        }
    }
    else {
        RG.debug(this, "Cell wasn't free at " + x + ', ' + y);
    }
    ent.remove(movComp);
};

/* Checks if cell type has changed, and if some penalties/bonuses must be
 * applied to the moved entity. */
System.Movement.prototype.checkForStatsMods = function(
    ent, prevCell, newCell
) {
    const [prevType, newType] = [prevCell.getBaseElem().getType(),
        newCell.getBaseElem().getType()
    ];

    // No cell type change, no need to check the modifiers
    if (prevType === newType) {return;}

    // Add bonus/penalty upon entering a new cell type
    if (this._bonuses.hasOwnProperty(newType)) {
        const bonuses = this._bonuses[newType];

        // Check here if we can ignore the bonus/penalty for this entity
        let applyBonus = true;
        if (bonuses.dontApplyTo) {
            bonuses.dontApplyTo.forEach(dontApplyComp => {
                if (ent.has(dontApplyComp)) {
                    applyBonus = false;
                }
            });
        }

        if (applyBonus) {
            bonuses.mods.forEach(mod => {
                if (Number.isInteger(mod.value)) {
                    const targetComp = RG.Component.create(mod.targetComp);
                    targetComp[mod.targetFunc](mod.value);
                    targetComp.setTag(newType);
                    ent.add(targetComp);
                }
                else {
                    const srcComp = ent.get(mod.srcComp);
                    if (srcComp) {
                        let bonus = srcComp[mod.srcFunc]();
                        bonus = Math.round(mod.value * bonus);
                        const targetComp = RG.Component.create(mod.targetComp);
                        targetComp[mod.targetFunc](bonus);
                        targetComp.setTag(newType);
                        ent.add(targetComp);
                    }
                }

            });
        }
    }

    // Remove the bonus/penalty here because cell type was left
    if (this._bonuses.hasOwnProperty(prevType)) {
        const statsList = ent.getList('StatsMods');
        const combatList = ent.getList('CombatMods');
        // TODO add a list of comps to check to this._bonuses
        statsList.forEach(mod => {
            if (mod.getTag() === prevType) {
                ent.remove(mod);
            }
        });
        combatList.forEach(mod => {
            if (mod.getTag() === prevType) {
                ent.remove(mod);
            }
        });
    }
};

module.exports = System.Movement;
