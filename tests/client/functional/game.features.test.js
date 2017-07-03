
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');

const RGObjects = require('../../../client/data/battles_objects');
RG.Effects = require('../../../client/data/effects');

const downKey = {code: RG.K_MOVE_S};
const pickupKey = {code: RG.K_PICKUP};

/* AI for driving the player with commands. */
RG.PlayerDriver = function(player) {
    RG.Brain.Rogue.call(this, player);
    // const _player = player;

    this.getNextCmdOrKey = function() {
        // const seenCells = this.getSeenCells();

    };

};
RG.extend2(RG.PlayerDriver, RG.Brain.Rogue);

function findActor(level, query) {
    const actors = level.getActors();
    let found = null;
    Object.keys(query).forEach(q => {
        const val = query[q];
        const fname = q;
        actors.forEach(actor => {
            if (actor[fname]() === val) {
                found = actor;
            }
        });
    });
    return found;
}

describe('Function: All small game features', function() {
    this.timeout(60000);

    let game = null;
    let parser = null;
    let fromJSON = null;

    beforeEach(() => {
        game = new RG.Game.Main();
        parser = new RG.ObjectShellParser();
        parser.parseShellData(RG.Effects);
        parser.parseShellData(RGObjects);
        fromJSON = new RG.Game.FromJSON();
    });

    afterEach(() => {
        game = null;
        parser = null;
        fromJSON = null;
    });

    it('Devil is in the details. After a bug appears: Fix -> Verify ', () => {
        let l1 = new RG.FACT.createLevel('arena', 20, 20);
        let p1 = new RG.Actor.Rogue('Player1');
        const shopkeeper = parser.createActualObj(RG.TYPE_ACTOR, 'shopkeeper');
        const humanoid = parser.createActualObj(RG.TYPE_ACTOR, 'humanoid');
        const sword = new RG.Item.Weapon('sword');

        l1.addActor(p1, 1, 1);
        l1.addActor(shopkeeper, 3, 3);
        l1.addActor(humanoid, 15, 15);

        l1.addItem(sword, 1, 1);

        expect(shopkeeper.getBrain().getType()).to.equal('human');
        p1.setIsPlayer(true);
        game.addLevel(l1);
        game.addPlayer(p1);
        expect(p1.getCell().getX()).to.equal(1);
        expect(p1.getCell().getY()).to.equal(1);
        game.update(pickupKey);
        expect(l1.getItems(), 'l1 has no items after pickup').to.have.length(0);
        expect(p1.getInvEq().getInventory().getItems()).to.have.length(1);

        game.update(downKey);

        expect(humanoid.isEnemy(p1), 'Humanoid is enemy').to.equal(true);
        expect(shopkeeper.isEnemy(p1), 'shopkeeper not enemy').to.equal(false);

        //-------------------------------------
        // Fun starts after restoring
        //-------------------------------------
        console.log('Now restoring the game and performing checks.');

        const json = game.toJSON();
        // console.log(JSON.stringify(json, null, ' '));
        const newGame = fromJSON.createGame(json);

        // We can still update the game
        expect(newGame.update.bind(newGame, downKey)).to.not.throw(Error);

        l1 = newGame.getLevels()[0];
        // const actors = l1.getActors();

        // Verify shopkeeper's brain
        const sk = findActor(l1, {getName: 'shopkeeper'});
        p1 = findActor(l1, {getName: 'Player1'});
        const hum = findActor(l1, {getName: 'humanoid'});

        expect(sk.getBrain().getType()).to.equal('human');
        expect(hum.getBrain().getType()).to.equal('rogue');

        const inv = p1.getInvEq();
        expect(inv.getInventory().getItems(), 'Player has one item')
            .to.have.length(1);

        expect(l1.getItems(), 'Level has no items').to.have.length(0);

        expect(hum.isEnemy(p1), 'Humanoid is enemy').to.equal(true);
        expect(sk.isEnemy(p1), 'shopkeeper not enemy').to.equal(false);

    });
});
