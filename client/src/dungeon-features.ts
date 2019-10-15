
import RG from './rg';
import * as Verify from './verify';
import {ElementExploration} from './element';
import {Random} from './random';
import {ObjectShell} from './objectshellparser';
import {Brain} from './brain';

const RNG = Random.getRNG();

// TODO into class

/* Used to add details like bosses and distinct room features into dungeon
 * levels. */
export const DungeonFeatures = function(zoneType) {
    this._verif = new Verify.Conf('DungeonFeatures');
    this._zoneType = zoneType;

    /* Adds special features to the last level of the zone. */
    this.addLastLevelFeatures = function(nLevel, level, conf) {
        this._verif.verifyConf('addLastLevelFeatures', conf,
            ['maxDanger', 'maxValue']);
        const exploreElem = new ElementExploration();
        const expPoints = 10 * (nLevel + 1) * conf.maxDanger;
        if (!Number.isInteger(expPoints)) {
            RG.err('DungeonFeatures', 'addLastLevelFeatures',
                `expPoints NaN. nLevel: ${nLevel}, dang: ${conf.maxDanger}`);
        }
        exploreElem.setExp(expPoints);
        exploreElem.setData({zoneType: this._zoneType});

        const parent = level.getParent();
        if (parent && parent.getName) {
            exploreElem.addData('zoneName', parent.getName());
        }

        const extras = level.getExtras();
        if (extras && extras.endPoint) {
            const [eX, eY] = extras.endPoint;
            level.addElement(exploreElem, eX, eY);
        }
        else {
            level.addElement(exploreElem);
        }

        const bossActor = this.generateBoss(nLevel, level, conf);

        if (bossActor) {
            this.addMinions(bossActor, nLevel, level, conf);
        }
        else {
            let msg = `Failed to created boss. nLevel: ${nLevel}`;
            msg += ` Level parent: ${level.getParent()}`;
            RG.debug({}, msg);
        }

    };

    /* TODO Move to object which is related to actors. */
    this.generateBoss = (nLevel, level, conf) => {
        this._verif.verifyConf('generateBoss', conf,
            ['maxDanger', 'maxValue']);
        const parser = ObjectShell.getParser();
        const bossDanger = conf.maxDanger + 2;
        const bossActor = parser.createRandomActor(
            {func: actor => (
                actor.danger <= bossDanger && actor.danger >= conf.maxDanger
            )}
        );
        if (bossActor) {
            level.addActorToFreeCell(bossActor);
            const prizeValue = conf.maxValue * 2;
            const prizeItem = parser.createRandomItem(
                {func: item => item.value <= prizeValue}
            );
            if (prizeItem) {
                bossActor.getInvEq().addItem(prizeItem);
            }
            else {
                const msg = `Value: ${prizeValue}`;
                RG.err('DungeonFeatures', 'generateBoss',
                    'Failed to create prize item: ' + msg);
            }

        }
        return bossActor;
    };

    /* TODO Move to object which is related to actors. */
    this.addMinions = (boss, nLevel, level, conf) => {
        const parser = ObjectShell.getParser();
        const bossType = boss.getType();
        const isSwarm = RNG.getUniform() <= 0.5;
        let numMinions = nLevel + 1;
        let dangerMinion = conf.maxDanger;
        if (isSwarm) {
            numMinions *= 2;
            dangerMinion -= 1;
        }
        const dist = Math.round(Math.sqrt(numMinions)) + 1;
        const cells = Brain.getBoxOfFreeCellsAround(boss, dist);
        RNG.shuffle(cells);

        const minionFunc = actor => (
            actor.danger <= dangerMinion && actor.type === bossType
        );

        while (cells.length > 0 && numMinions > 0) {
            const currCell = cells.pop();
            --numMinions;
            const minion = parser.createRandomActor({func: minionFunc});
            if (minion) {
                const [x, y] = [currCell.getX(), currCell.getY()];
                level.addActor(minion, x, y);
            }
        }

    };

};

