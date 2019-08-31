
import {Brain, BrainPlayer} from '../../client/src/brain';
import {Random} from '../../client/src/random';

type PlayerDriver = import('./player-driver').PlayerDriver;
type DriverContext = import('./player-driver').DriverContext;

const RNG = Random.getRNG();

/* Base class for context processing. */
export class ContextProcessor {

    constructor(public name: string, public drv: PlayerDriver) {
    }

    public processContext(): boolean {
        if (this.isWithinContext()) {
            return this._process();
        }
        return false;
    }

    public isWithinContext(): boolean {
        return false;
    }

    protected _process(): boolean {
        return false;
    }
}

export class EnemyContextProcessor extends ContextProcessor {

    public hpLow: number;
    public ppRestLimit: number;
    public hpRestLimit: number;

    constructor(public name: string, public drv: PlayerDriver) {
        super(name, drv);

        this.hpLow = RNG.getUniformRange(0.25, 0.40);
        this.ppRestLimit = RNG.getUniformRange(0.75, 1.0);
        this.hpRestLimit = RNG.getUniformRange(0.75, 1.0);
    }

    public isWithinContext(): boolean {
        return true;
    }

    /* Checks for surrounding enemies and whether to attack or not. Checks also
     * for requirement to rest and gain health. */
    public checkForEnemies(): void {
        const drv = this.drv;
        const brain = drv.player.getBrain() as BrainPlayer;
        // const around = Brain.getCellsAroundActor(drv.player);
        // const actorsAround = around.map((c: Cell) => c.getFirstActor());
        const actorsAround = Brain.getSeenHostiles(drv.player);

        drv.enemy = null;
        actorsAround.forEach(actor => {
            if (drv.enemy === null) {
                if (actor && actor.isEnemy(drv.player)) {
                    drv.enemy = actor;
                    if (this.hasEnoughHealth()) {
                        drv.action = 'attack';
                    }
                    else if (!brain.isRunModeEnabled()) {
                        drv.action = 'run';
                    }
                    else {
                        drv.action = 'flee';
                    }
                    drv.state.path = [];
                }
            }
        });
        if (drv.action === '' && this.shouldRest()) {
            drv.action = 'rest';
        }
    }

    public hasEnoughHealth(): boolean {
        const drv = this.drv;
        const health = drv.player.get('Health');
        const maxHP = health.getMaxHP();
        const hp = health.getHP();
        if (hp > Math.round(this.hpLow * maxHP)) {
            return true;
        }
        return false;
    }

    public shouldRest(): boolean {
        const player = this.drv.player;
        if (player.has('SpellPower')) {
            const spellPower = player.get('SpellPower');
            const pp = spellPower.getPP();
            const maxPP = spellPower.getMaxPP();
            return pp < (this.ppRestLimit * maxPP);
        }
        const health = player.get('Health');
        const maxHP = health.getMaxHP();
        const hp = health.getHP();
        return hp < (this.hpRestLimit * maxHP);
    }


    protected _process(): boolean {
        this.checkForEnemies();
        return true;
    }

}

/* Processor is used when player is on level belonging to Area. */
export class AreaContextProcessor extends ContextProcessor {

    constructor(public name: string, public drv: PlayerDriver) {
        super(name, drv);
    }

    /* Processor applies only when player is in Area. */
    public isWithinContext(): boolean {
        const level = this.drv.player.getLevel();
        const parent = level.getParent();
        if (parent) {
            return parent.getType() === 'area';
        }
        return false;
    }

    protected _process(): boolean {
        if (!this.drv.hasPath()) {
            // Main functions:
            // - Move player towards north
            //   - We can find unexplored cell by doing +1 FOV
            // - Move player into zones to explore them
        }
        return false;
    }

}

export class ZoneContextProcessor extends ContextProcessor {

    public reZones: RegExp;

    constructor(public name: string, public drv: PlayerDriver) {
        super(name, drv);
        this.reZones = /mountain|dungeon/;
    }

    /* Processor applies only when player is in AreaTiles. */
    public isWithinContext(): boolean {
        const level = this.drv.player.getLevel();
        const parent = level.getParentZone();
        if (parent) {
            return this.reZones.test(parent.getType());
        }
        return false;
    }

    protected _process(): boolean {
        if (!this.drv.hasPath()) {
        }
        return false;
    }

}

