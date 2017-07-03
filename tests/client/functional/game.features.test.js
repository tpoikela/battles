
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
        const sword = new RG.Item.Weapon('sword');

        l1.addActor(p1, 1, 1);
        l1.addItem(sword, 1, 1);
        l1.addActor(shopkeeper, 3, 3);
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

        //-------------------------------------
        // Fun starts after restoring
        //-------------------------------------

        const json = game.toJSON();
        console.log(JSON.stringify(json, null, ' '));
        const newGame = fromJSON.createGame(json);
        expect(newGame.update.bind(newGame, downKey)).to.not.throw(Error);

        l1 = newGame.getLevels()[0];
        const actors = l1.getActors();

        // Verify shopkeeper's brain
        const sk = actors.find(actor => actor.getName() === 'shopkeeper');
        expect(sk.getBrain().getType()).to.equal('human');

        p1 = actors.find(actor => actor.getName() === 'Player1');
        const inv = p1.getInvEq();
        expect(inv.getInventory().getItems(), 'Player has one item')
            .to.have.length(1);

        expect(l1.getItems(), 'Level has no items').to.have.length(0);

    });
});
