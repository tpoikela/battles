
import { expect } from 'chai';

import RG from '../../../client/src/rg';
import {Memory} from '../../../client/src/brain/brain.memory';
import {SentientActor} from '../../../client/src/actor';
import {Level} from '../../../client/src/level';
import {FactoryLevel} from '../../../client/src/factory.level';
// import {RGTest} from '../../roguetest';

describe('Brain.Memory', () => {
    it('contains friends and enemies', () => {
        const mem = new Memory();

        const enemy0 = new SentientActor('enemy0');
        mem.addEnemy(enemy0);

        const friend0 = new SentientActor('friend0');
        mem.addFriend(friend0);

        expect(mem.getEnemies().length).to.equal(1);
        expect(mem.getFriends().length).to.equal(1);

        expect(mem.isFriend(friend0)).to.equal(true);
        expect(mem.isEnemy(friend0)).to.equal(false);

        expect(mem.isFriend(enemy0)).to.equal(false);
        expect(mem.isEnemy(enemy0)).to.equal(true);
    });

    it('cannot have same actor has friend/enemy', () => {
        const mem = new Memory();
        const enemy0 = new SentientActor('enemy0');
        mem.addEnemy(enemy0);

        const friend0 = enemy0;
        mem.addFriend(friend0);

        expect(mem.isFriend(enemy0)).to.equal(true);
        expect(mem.isEnemy(enemy0)).to.equal(false);
    });

    it('has priority order to determine enemies', () => {
        const mem = new Memory();
        const enemy0 = new SentientActor('enemy0');
        enemy0.setType('demon');

        expect(mem.isEnemy(enemy0)).to.equal(false);
        mem.addEnemyType('demon');
        expect(mem.isEnemy(enemy0)).to.equal(true);
        mem.addFriend(enemy0);
        expect(mem.isEnemy(enemy0)).to.equal(false);
    });

    it('stores seen enemy positions', () => {
        const factLevel = new FactoryLevel();
        const mem = new Memory();
        const enemy = new SentientActor('enemy');
        const level = factLevel.createLevel('arena', 10, 10);
        level.addActor(enemy, 1, 1);
        mem.addEnemySeenCell(enemy);
        expect(mem.hasSeen(enemy)).to.equal(true);

    });
});
