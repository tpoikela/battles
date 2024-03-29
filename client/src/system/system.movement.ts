
import RG from '../rg';
import {SystemBase} from './system.base';
import {SentientActor} from '../actor';
import {Cell} from '../map.cell';
import * as Component from '../component';
import * as Element from '../element';
import {ELEM} from '../../data/elem-constants';
import {emitZoneEvent} from './system.utils';
import {IPenaltyObj} from '../interfaces';
import {ObjectShellComps} from '../objectshellcomps';
import {removeStatsModsOnLeave} from './system.utils';

type BrainPlayer = import('../brain/brain.player').BrainPlayer;
type Level = import('../level').Level;
type EventPool = import('../eventpool').EventPool;
type Entity = import('../entity').Entity;

import dbg = require('debug');
const debug = dbg('bitn:System.Movement');

type ElementExploration = Element.ElementExploration;

const {addSkillsExp} = SystemBase;


interface ElementMoveData {
    dontApplyTo?: string[];
    mods: IPenaltyObj[];
}

interface MoveBonuses {
    [key: string]: ElementMoveData;
}

const snowTracksMap = {
    'light snow': ELEM.SNOW_LIGHT_TRACKS,
    'snow': ELEM.SNOW_TRACKS,
    'deep snow': ELEM.SNOW_DEEP_TRACKS,
};

// Used to map an element type to another to re-use logic of that type
const elemTypeMap = {
    'deep snow': 'snow',
    'deep snow with tracks': 'snow',
    'light snow': 'snow',
    'light snow with tracks': 'snow',
    'snow with tracks': 'snow',
};

/* This system handles all entity movement.*/
export class SystemMovement extends SystemBase {

    public climbRe: RegExp;
    public somethingSpecial: string[];
    private _bonuses: MoveBonuses;

    constructor(compTypes: string[], pool: EventPool) {
        super(RG.SYS.MOVEMENT, compTypes, pool);
        this.somethingSpecial = ['QuestTarget'];
        this.climbRe = /highrock/;

        /* These are applied when an actor enters a cell with given type of base
         * element.
         * If the value is float, it is used to scale from base value in
         * Stats/Combat, if it's integer it's added directly.
         * TODO: Remove these hardcoded penalties, add them to elements data
         * directly.
         */
        this._bonuses = {};
    }


    /* If player moved to the square, checks if any messages must
     * be emitted. */
    public checkMessageEmits(ent, prevCell: Cell, newCell: Cell): void {
        if (newCell.hasProp(RG.TYPE_ELEM)) {
            if (newCell.hasStairs()) {
                const stairs = newCell.getStairs();
                const level = stairs.getTargetLevel() as Level;
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
                const level = passage!!.getTargetLevel() as Level;
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
                const level = connection!!.getTargetLevel() as Level;
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
                const shop = newCell.getShop()!!;
                if (shop.isAbandoned()) {
                    RG.gameMsg('This shop seems to be abandoned');
                }
                else {
                    const msg = 'You can drop items to sell them here.';
                    RG.gameMsg('You have entered a shop. ' + msg);
                }
            }
            else if (newCell.hasShop()) {
                const shop = newCell.getShop()!!;
                if (!shop.isAbandoned()) {
                    // RG.gameMsg('You can drop items to sell them here.');
                }
            }

            const elems = newCell.getElements();
            elems.forEach(elem => {
                if (elem.has('Callbacks')) {
                    processCompCb('onEnter', elem, ent);
                }
                if (elem.hasMsg('onEnter')) {
                    RG.gameMsg(elem.getMsg('onEnter'));
                }
            });
        }

        if (newCell.hasItems()) {
            const items = newCell.getItems()!!; // Safe !! due to hasItems()
            const topItem = items[0];
            let topItemName = topItem.getName();
            if (topItem.getCount() > 1) {
                topItemName = `${topItemName} (x${topItem.getCount()})`;
            }

            if (items.length > 1) {
                RG.gameMsg('There are several items here. ' +
                    `You see ${topItemName} on top`);
            }
            else {
                RG.gameMsg(`You see ${topItemName}` + ' on the floor');
            }

            // Check for items in a shop
            if (topItem.has('Unpaid')) {
                if (topItem.getCount() > 1) {RG.gameMsg('They are for sale');}
                else {RG.gameMsg('It is for sale');}
            }

            // CHeck for Named or QuestTargets etc
            for (let i = 0; i < items.length; i++) {
                if (items[i].hasAny(this.somethingSpecial)) {
                    const name = items[i].getName();
                    RG.gameMsg(`There is something special about ${name}`);
                }
            }
        }

        const newBaseElem = newCell.getBaseElem();
        if (newBaseElem.hasMsg('onEnter')) {
            RG.gameMsg(newBaseElem.getMsg('onEnter'));
        }
    }

    public updateEntity(ent): void {
        const movComp = ent.get('Movement');
        const locComp = ent.get('Location');
        if (!locComp) {
            RG.err('SystemMovement', 'updateEntity',
                'Entity without Location cannot be moved');
        }
        const [x, y] = movComp.getXY();

        const map = movComp.getLevel().getMap();

        if (!map.hasXY(x, y)) {
            let msg = `Tried to move to ${x},${y}.`;
            msg += ' Entity: ' + RG.getName(ent);
            RG.warn('System.Movement', 'updateEntity', msg);
        }

        const cell = map.getCell(x, y);
        const prevCell = locComp.getCell();
        let canMoveThere = cell.isFree(ent.has('Flying'));

        const prevElem = prevCell.getBaseElem();
        const currElem = cell.getBaseElem();

        // Cannot traverse more than dZ of 1
        if (Math.abs(currElem.getZ() - prevElem.getZ()) > 1) {
            if (!ent.has('Flying')) {
                canMoveThere = false;
            }
        }

        if (!canMoveThere) {
            canMoveThere = this._checkSpecialMovement(movComp, ent, cell);
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

                // Emit messages only for the player
                if (ent.isPlayer && ent.isPlayer()) {
                    this.checkMessageEmits(ent, prevCell, cell);
                }

                if (cell.hasElements()) {
                    if (ent.isPlayer && ent.isPlayer()) {
                        if (cell.hasPropType('exploration')) {
                            this._processExploreElem((ent as SentientActor), cell);
                        }
                    }
                    this._checkEntrapment(ent, cell);
                }

                // Check if we need to leave some tracks into the snow
                const baseElem = prevCell.getBaseElem();
                if (baseElem.has('Snowy')) {
                    const baseType = baseElem.getType();
                    if (snowTracksMap[baseType]) {
                        prevCell.setBaseElem(snowTracksMap[baseType]);
                    }
                }

                // Execute callbacks here for onEnter, onLeave
            }
            else {
                this._fatalMoveError(ent);
            }
        }
        else {
            ent.get('Action').setStatus(RG.ACTION_FAILED);
            RG.debug(this, 'Cell wasn\'t free at ' + x + ', ' + y);
        }

        ent.remove(movComp);
        if (ent.has('Movement')) {
            RG.err('SystemMovement', 'updateEntity',
                `Ent ${ent.getName()} has still MoveComp after one move`);
        }
    }

    /* Checks if cell type has changed, and if some penalties/bonuses must be
     * applied to the moved entity. */
    public checkForStatsMods(ent, prevCell: Cell, newCell: Cell): void {
        const newElem = newCell.getBaseElem();
        const prevElem = prevCell.getBaseElem();
        let [prevType, newType] = [prevElem.getType(), newElem.getType()];

        if (elemTypeMap[prevType]) {
            prevType = elemTypeMap[prevType];
        }
        if (elemTypeMap[newType]) {
            newType = elemTypeMap[newType];
        }

        const newName = newElem.getName();
        const prevName = prevElem.getName();

        // Apply callbacks before checking if elems are same
        if (prevElem.has('Callbacks')) {
            processCompCb('onLeave', prevElem, ent);
        }
        if (newElem.has('Callbacks')) {
            processCompCb('onEnter', newElem, ent);
        }

        // No cell type change, no need to check the modifiers
        // TODO: May change with accumulating penalties
        if (prevName === newName) {
            return;
        }

        // Check previous elemType for removal first
        let bonuses = null;
        if (this._bonuses.hasOwnProperty(prevType)) {
            bonuses = this._bonuses[prevType];
        }
        else if (prevElem.has('Terrain')) {
            bonuses = prevElem.get('Terrain').getMods();
            bonuses.mods = bonuses;
        }

        // Remove the bonus/penalty here because cell type was left
        if (bonuses) {
            removeStatsModsOnLeave(ent, prevType);
        }

        bonuses = null;
        if (this._bonuses.hasOwnProperty(newType)) {
            bonuses = this._bonuses[newType];
        }
        else if (newElem.has('Terrain')) {
            bonuses = newElem.get('Terrain').getMods();
            bonuses.mods = bonuses;
        }

        // Add bonus/penalty upon entering a new cell type
        if (bonuses) {

            // Check here if we can ignore the bonus/penalty for this entity
            let applyBonus = true;
            if (bonuses.dontApplyTo) {
                bonuses.dontApplyTo.forEach((dontApplyComp: string) => {
                    if (ent.has(dontApplyComp)) {
                        applyBonus = false;
                    }
                });
            }

            if (applyBonus) {
                bonuses.mods.forEach((mod: IPenaltyObj) => {
                    let applyThisMod = true;

                    // Check also local dontApplyTo per single mod (used in
                    // Terrain)
                    if (mod.dontApplyTo) {
                        mod.dontApplyTo.forEach((dontApplyComp: string) => {
                            if (ent.has(dontApplyComp)) {
                                applyThisMod = false;
                            }
                        });
                    }

                    if (!applyThisMod) {
                        return;
                    }

                    if (Number.isInteger(mod.value)) {
                        const targetComp = Component.create(mod.targetComp);
                        targetComp[mod.targetFunc](mod.value);
                        targetComp.setTag(newType);
                        ent.add(targetComp);
                    }
                    else {
                        const srcComp = ent.get(mod.srcComp);
                        if (srcComp) {
                            let bonus = srcComp[mod.srcFunc]();
                            bonus = Math.round(mod.value * bonus);
                            const targetComp = Component.create(mod.targetComp);
                            targetComp[mod.targetFunc](bonus);
                            targetComp.setTag(newType);
                            ent.add(targetComp);
                        }
                    }

                });
            }
        }


    }

    /* Checks movements like climbing. */
    private _checkSpecialMovement(mov, ent: SentientActor, cell: Cell): boolean {
        const elemType = cell.getBaseElem().getType();
        if (this.climbRe.test(elemType) && ent.has('Climber')) {
            const msg = `${ent.getName()} climbs the rocky terrain`;
            RG.gameMsg({cell, msg});
            return true;
        }
        else if (mov.getDisplace()) {
            // Some safety checks:
            // Either target cell hasActor which is displace target,
            // or displaceTarget is in same cell with this actor
            const target = mov.getActor();
            if (!target) {
                RG.err('SystemMovement', '_checkSpecialMovement',
                    'No target actor for displace');
            }
            if (cell.hasActors()) {
                const actors = cell.getActors()!;
                return actors.findIndex(a =>
                    a.getID() === target.getID() && a.has('Movement') &&
                    a.get('Movement').getDisplace()
                ) >= 0;
            }
            else {
                const thisCell = ent.get('Location').getCell();
                const actors = thisCell.getActors();
                if (actors) {
                    return actors.findIndex(a => a.getID() === target.getID()) >= 0;
                }
            }
        }
        return false;
    }

    /* When player enters exploration element cell, function processes this. At
    *  the moment, this gives only exp to player. */
    private _processExploreElem(ent: SentientActor, cell: Cell): void {
        const level: Level = ent.getLevel();
        const [x, y] = [cell.getX(), cell.getY()];
        const expElemU = cell.getPropType('exploration')[0] as unknown;
        const expElem = expElemU as ElementExploration;

        if (level.removeElement(expElem, x, y)) {
            const givenExp = expElem.getExp();
            const expPoints = new Component.ExpPoints(givenExp);
            ent.add(expPoints);

            const place = level.get('Place');
            addSkillsExp(ent, RG.SKILLS.EXPLORATION, place.getDepth() + 1);

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

            let msg = expElem.getMsg('onEnter');
            if (!msg || msg.length === 0) {
                msg = `${ent.getName()} has explored zone thoroughly.`;
            }
            RG.gameInfo({cell, msg});
            if (ent.isPlayer()) {
                const brain: unknown = ent.getBrain();
                const brainPlayer = brain as BrainPlayer;
                brainPlayer.addMark();
            }

            emitZoneEvent(level, RG.ZONE_EVT.ZONE_EXPLORED, {});
        }
    }

    /* Checks if entity gets entrapped into the cell. */
    private _checkEntrapment(ent, cell: Cell): void {
        // Need to re-check this, if exploreElem was removed, very subtle
        const elems = cell.getElements();
        if (!elems) {return;}
        if (ent.has('Ethereal')) {return;}

        elems.forEach(elem => {
            if (elem.has('Entrapping')) {
                if (!ent.has('Entrapped')) {
                    const diff = elem.get('Entrapping').getDifficulty();
                    const str = ent.getStrength();
                    const agi = ent.getAgility();
                    // TODO use Avoid traps skill also
                    const avoidProb = (str + agi) / (str + agi + diff);
                    if (!RG.isSuccess(avoidProb)) {
                        // TODO check for flying and other options
                        ent.add(new Component.Entrapped());
                        let msg = `${ent.getName()} becomes trapped`;
                        msg += ` by ${elem.getName()}!`;
                        RG.gameMsg({cell, msg});
                    }
                    else {
                        let msg = `${ent.getName()} avoids getting trapped`;
                        msg += ` by ${elem.getName()}!`;
                        RG.gameMsg({cell, msg});
                    }
                }
            }
        });
    }

    /* Reports an error if an entity could not be removed. */
    private _fatalMoveError(ent): void {
        const [xOld, yOld] = ent.getXY();
        const level = ent.getLevel();
        const map = level.getMap();
        const coord = xOld + ', ' + yOld;
        // RG.diag('\n\nSystem.Movement. List of actors in level:');
        // RG.printObjList(level.getActors(),
        //     ['getID', 'getName', 'getX', 'getY'], '');
        this._diagnoseRemovePropError(xOld, yOld, map, ent);
        if (ent.has('Dead')) {
            console.log('WoW! Trying to move a Dead entity!');
        }
        RG.err('MovementSystem', 'moveActorTo',
            `Couldn't remove ent |${ent.getName()}, ID: ${ent.getID()}| @ ${coord}`);
    }


    /* If removal of moved entity fails, tries to diagnose the error. */
    private _diagnoseRemovePropError(xTry, yTry, map, ent): void {
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
        /*
        RG.diag('map.Find list of objects: ');
        const objects = map.findObj(obj => {
            return obj.getName && obj.getName().match(/keeper/);
        });
        RG.diag(objects);
        */

    }

}

const _compGen: ObjectShellComps = new ObjectShellComps({debug: false});

function processCompCb(cbName, cbEnt, ent): void {
    const cbObj = cbEnt.get('Callbacks').cb(cbName);
    if (!cbObj) {return;} // No cb found
    if (cbObj.addComp) {
        _compGen.addComponents(cbObj, ent);
    }
    if (cbObj.showMsg) {
        RG.gameMsg(cbObj.showMsg.msg);
    }
}
