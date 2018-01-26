
import { expect } from 'chai';

const RG = require('../../../client/src/battles');

describe('Brain.Memory', () => {
    it('contains friends and enemies', () => {
        const mem = new RG.Brain.Memory();

        const enemy0 = new RG.Actor.Rogue('enemy0');
        mem.addEnemy(enemy0);

        const friend0 = new RG.Actor.Rogue('friend0');
        mem.addFriend(friend0);

        expect(mem.getEnemies().length).to.equal(1);
        expect(mem.getFriends().length).to.equal(1);

        expect(mem.isFriend(friend0)).to.equal(true);
        expect(mem.isEnemy(friend0)).to.equal(false);

        expect(mem.isFriend(enemy0)).to.equal(false);
        expect(mem.isEnemy(enemy0)).to.equal(true);
    });

    it('cannot have same actor has friend/enemy', () => {
        const mem = new RG.Brain.Memory();
        const enemy0 = new RG.Actor.Rogue('enemy0');
        mem.addEnemy(enemy0);

        const friend0 = enemy0;
        mem.addFriend(friend0);

        expect(mem.isFriend(enemy0)).to.equal(true);
        expect(mem.isEnemy(enemy0)).to.equal(false);
    });

    it('has priority order to determine enemies', () => {
        const mem = new RG.Brain.Memory();
        const enemy0 = new RG.Actor.Rogue('enemy0');
        enemy0.setType('demon');

        expect(mem.isEnemy(enemy0)).to.equal(false);
        mem.addEnemyType('demon');
        expect(mem.isEnemy(enemy0)).to.equal(true);
        mem.addFriend(enemy0);
        expect(mem.isEnemy(enemy0)).to.equal(false);
    });
});
