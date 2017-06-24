
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');

const LocalStorage = require('node-localstorage').LocalStorage,
localStorage = new LocalStorage('./battles_local_storage');

describe('Game.Save how saving works', function() {

    // TODO add to RGTest
    const setupPlayerWithLevel = function(name) {
        const level = RG.FACT.createLevel('arena', 10, 10);
        level.setLevelNumber(3);
        const player = new RG.Actor.Rogue(name);
        player.setType('player');
        player.setIsPlayer(true);
        level.addActor(player, 3, 3);
        return {player, level};
    };

    let gameSave = null;

    beforeEach(() => {
        gameSave = new RG.Game.Save();
        gameSave.setStorage(localStorage);

    });

    it('Saves/restores player properly', function() {
        const setup = setupPlayerWithLevel('Player1');
        const game = new RG.Game.Main();
        game.addLevel(setup.level);

        const player = setup.player;
        player.get('Experience').setExpLevel(5);
        game.addPlayer(player);
        gameSave.savePlayer(game);

        const restGame = gameSave.restorePlayer('Player1');
        const restPlayer = restGame.getPlayer();
        expect(restPlayer, 'Player restored OK').to.exist;
        expect(restPlayer.getName()).to.equal(player.getName());
        expect(restPlayer.get('Experience').getExpLevel()).to.equal(5);

        const playersAsObj = gameSave.getPlayersAsObj();
        expect(playersAsObj.hasOwnProperty('Player1')).to.equal(true);

        const die = restPlayer.get('Combat').getDamageDie();
        expect(die !== null).to.equal(true);
        expect(typeof die !== 'undefined').to.equal(true);
        expect(restPlayer.getLevel().getID(),
            'Player restored to correct level') .to.equal(setup.level.getID());

        const playerList = gameSave.getPlayersAsList();
        const playerObj = playerList[0];
        expect(playerObj.hasOwnProperty('name')).to.equal(true);
        expect(playerObj.hasOwnProperty('expLevel')).to.equal(true);
    });

    it('Saves/restores inventory properly', function() {
        const game = new RG.Game.Main();
        const setup = setupPlayerWithLevel('Player1');
        const player = setup.player;
        const invEq = player.getInvEq();

        // Test first with simple food
        const food = new RG.Item.Food('Habanero');
        invEq.addItem(food);

        game.addLevel(setup.level);
        game.addPlayer(player);
        gameSave.savePlayer(game);
        let restGame = gameSave.restorePlayer('Player1');

        let restPlayer = restGame.getPlayer();
        let invItems = restPlayer.getInvEq().getInventory().getItems();
        expect(invItems.length).to.equal(1);
        expect(invItems[0].equals(food)).to.equal(true);

        // Create a new weapon
        const weapon = new RG.Item.Weapon('Sword');
        weapon.setAttack(10);
        weapon.setDamage('3d3+5');
        weapon.count = 2;

        // Add it, save player and then restore
        gameSave = new RG.Game.Save();
        gameSave.setStorage(localStorage);

        invEq.addItem(weapon);
        gameSave.savePlayer(game);
        restGame = gameSave.restorePlayer('Player1');
        restPlayer = restGame.getPlayer();
        invItems = restPlayer.getInvEq().getInventory().getItems();
        expect(invItems.length).to.equal(2);

        const sword = invItems[1];
        expect(sword.equals(weapon)).to.equal(true);
        expect(sword.count).to.equal(2);

        const armour = new RG.Item.Armour('Plate mail');
        armour.setDefense(11);
        invEq.addItem(armour);

        gameSave = new RG.Game.Save();
        gameSave.setStorage(localStorage);

        gameSave.savePlayer(game);
        restGame = gameSave.restorePlayer('Player1');
        restPlayer = restGame.getPlayer();
        invItems = restPlayer.getInvEq().getInventory().getItems();
        expect(invItems.length).to.equal(3);

        const plateMail = invItems[2];
        expect(armour.equals(plateMail)).to.equal(true);

    });

    it('Saves/restores and equips equipment correctly', function() {
        const game = new RG.Game.Main();
        const setup = setupPlayerWithLevel('HeroPlayer');
        const player = setup.player;
        const invEq = player.getInvEq();
        game.addLevel(setup.level);
        game.addPlayer(player);

        const weapon = new RG.Item.Weapon('Sword');
        weapon.setDefense(15);
        weapon.setAttack(1);
        weapon.setWeight(2.5);

        invEq.addItem(weapon);
        expect(invEq.equipItem(weapon)).to.equal(true);

        // Empty spirit gem
        const emptygem = new RG.Item.SpiritGem('Wolf gem');
        invEq.addItem(emptygem);

        const gemWithSpirit = new RG.Item.SpiritGem('Used gem');
        const spirit = new RG.Actor.Spirit('Wolf spirit');
        spirit.get('Stats').setStrength(11);
        gemWithSpirit.setSpirit(spirit);
        invEq.addItem(gemWithSpirit);

        gameSave.savePlayer(game);
        const restGame = gameSave.restorePlayer('HeroPlayer');
        const restPlayer = restGame.getPlayer();
        const restWeapon = restPlayer.getWeapon();
        expect(restWeapon.equals(weapon)).to.equal(true);

        const inv = restPlayer.getInvEq().getInventory();
        const emptyGemRest = inv.getItems()[0];
        expect(emptyGemRest.equals(emptygem)).to.equal(true);

        const gemWithSpirit2 = inv.getItems()[1];
        const spiritRest = gemWithSpirit2.getSpirit();
        const statsRest = spiritRest.get('Stats');
        const statsOrig = spirit.get('Stats');
        expect(statsRest.getStrength()).to.equal(statsOrig.getStrength());
    });
});
