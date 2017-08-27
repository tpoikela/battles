
/* This file contains a long test case actual game scenarios to test the more
 * complex interactions. */

const expect = require('chai').expect;
const RG = require('../../../client/src/battles');

const RGObjects = require('../../../client/data/battles_objects');
RG.Effects = require('../../../client/data/effects');

const downKey = {code: RG.KEY.MOVE_S};
const pickupKey = {code: RG.KEY.PICKUP};
const confirmKey = {code: RG.KEY.YES};

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

function findItem(level, query) {
    const items = level.getItems();
    let found = null;
    Object.keys(query).forEach(q => {
        const val = query[q];
        const fname = q;
        items.forEach(item => {
            if (item[fname]() === val) {
                found = item;
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
        parser = new RG.ObjectShell.Parser();
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
        const p1Inv = p1.getInvEq().getInventory();
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
        expect(p1Inv.getItems()).to.have.length(1);

        game.update(downKey);

        expect(humanoid.isEnemy(p1), 'Humanoid is enemy').to.equal(true);
        expect(shopkeeper.isEnemy(p1), 'shopkeeper not enemy').to.equal(false);

        //------------------------
        // Test selling of items
        //------------------------
        const p1X = p1.getX();
        const p1Y = p1.getY();
        const magicSword = parser.createActualObj(RG.TYPE_ITEM, 'Magic sword');
        p1Inv.addItem(magicSword);

        const dagger = parser.createActualObj(RG.TYPE_ITEM, 'Magic dagger');
        dagger.add('Unpaid', new RG.Component.Unpaid());
        l1.addItem(dagger, p1X, p1Y);

        expect(p1Inv.getItems()).to.have.length(2);
        const shopElem = new RG.Element.Shop();
        shopElem.setShopkeeper(shopkeeper);
        l1.addElement(shopElem, p1X, p1Y);
        const dropCmd = {cmd: 'drop', item: magicSword};
        game.update(dropCmd);
        game.update(confirmKey);
        expect(p1Inv.getItems(), 'Two items after selling').to.have.length(2);

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

        expect(sk.getBrain().getType(), 'Brain type OK').to.equal('human');
        expect(hum.getBrain().getType(), 'Brain type OK').to.equal('rogue');

        const inv = p1.getInvEq();
        expect(inv.getInventory().getItems(), 'Player has one item')
            .to.have.length(2);

        expect(l1.getItems(), 'Level has 2 items').to.have.length(2);

        expect(hum.isEnemy(p1), 'Humanoid is enemy').to.equal(true);
        expect(sk.isEnemy(p1), 'shopkeeper not enemy').to.equal(false);

        const newShop = l1.getElements().find(
            elem => elem.getType() === 'shop');
        expect(newShop.getShopkeeper().getID()).to.equal(shopkeeper.getID());
        const newDagger = findItem(l1, {getName: 'Magic dagger'});
        const price = newShop.getItemPriceForSelling(newDagger);
        expect(price).to.be.above(0);

    });
});
