
import {expect} from 'chai';
import RG from '../../../client/src/rg';
import {RGTest} from '../../roguetest';
import { SentientActor } from '../../../client/src/actor';
import { GameMain } from '../../../client/src/game';
import { GameSave } from '../../../client/src/gamesave';
import { FromJSON } from '../../../client/src/game.fromjson';
import { FactoryLevel } from '../../../client/src/factory.level';
import * as Item from '../../../client/src/item';

import Storage = require('node-localstorage');
const LocalStorage = Storage.LocalStorage;

describe('Game.Save how saving works', () => {

    // TODO add to RGTest
    const setupPlayerWithLevel = name => {
        const levelFact = new FactoryLevel();
        const level = levelFact.createLevel('arena', 10, 10);
        level.setLevelNumber(3);
        const player = new SentientActor(name);
        player.setType('player');
        player.setIsPlayer(true);
        level.addActor(player, 3, 3);
        return {player, level};
    };

    let gameSave = null;
    let localStorage = null;

    beforeEach(() => {
        localStorage = new LocalStorage('./battles_local_storage');
        gameSave = new GameSave();
        gameSave.setStorage(localStorage);

    });

    it('Saves/restores player properly', () => {
        const setup = setupPlayerWithLevel('Player1');
        const game = new GameMain();
        game.addLevel(setup.level);

        const player = setup.player;
        player.get('Experience').setExpLevel(5);
        game.addPlayer(player);
        gameSave.savePlayer(game);

        const json = game.toJSON();
        const fromJSON = new FromJSON();

        let restGame = new GameMain();
        restGame = fromJSON.createGame(restGame, json);
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

    it('Saves/restores inventory properly', () => {
        const game = new GameMain();
        const setup = setupPlayerWithLevel('Player1');
        const player = setup.player;
        const invEq = player.getInvEq();

        // Test first with simple food
        const food = new Item.Food('Habanero');
        invEq.addItem(food);

        game.addLevel(setup.level);
        game.addPlayer(player);

        let json = game.toJSON();
        let fromJSON = new FromJSON();
        gameSave.savePlayer(game);
        let restGame = null;
        restGame = new GameMain();
        restGame = fromJSON.createGame(restGame, json);

        let restPlayer = restGame.getPlayer();
        let invItems = restPlayer.getInvEq().getInventory().getItems();
        expect(invItems.length).to.equal(1);
        expect(invItems[0].equals(food)).to.equal(true);

        // Create a new weapon
        const weapon = new Item.Weapon('Sword');
        weapon.setAttack(10);
        weapon.setDamageDie('3d3+5');
        weapon.setCount(2);

        // Add it, save player and then restore
        gameSave = new GameSave();
        gameSave.setStorage(localStorage);

        invEq.addItem(weapon);

        json = game.toJSON();
        fromJSON = new FromJSON();
        gameSave.savePlayer(game);

        restGame = new GameMain();
        restGame = fromJSON.createGame(restGame, json);
        restPlayer = restGame.getPlayer();
        invItems = restPlayer.getInvEq().getInventory().getItems();
        expect(invItems.length).to.equal(2);

        const sword = invItems[1];
        expect(sword.equals(weapon)).to.equal(true);
        expect(sword.getCount()).to.equal(2);

        const armour = new Item.Armour('Plate mail');
        armour.setDefense(11);
        invEq.addItem(armour);

        gameSave = new GameSave();
        gameSave.setStorage(localStorage);

        gameSave.savePlayer(game);

        const players = gameSave.getPlayersAsList();
        const index = players.findIndex(item => item.name === 'Player1');
        expect(index).to.be.above(-1);
    });

    it('Saves/restores and equips equipment correctly', () => {
        const game = new GameMain();
        const setup = setupPlayerWithLevel('HeroPlayer');
        const player = setup.player;
        const invEq = player.getInvEq();
        game.addLevel(setup.level);
        game.addPlayer(player);

        const weapon = new Item.Weapon('Sword');
        weapon.setDefense(15);
        weapon.setAttack(1);
        weapon.setWeight(2.5);

        invEq.addItem(weapon);
        expect(invEq.equipItem(weapon)).to.equal(true);

        // Empty spirit gem
        const emptygem = new Item.SpiritGem('Wolf gem');
        invEq.addItem(emptygem);

        const gemWithSpirit = new Item.SpiritGem('Used gem');
        const spirit = RGTest.createSpirit('Wolf spirit');
        spirit.get('Stats').setStrength(11);
        gemWithSpirit.setSpirit(spirit);
        invEq.addItem(gemWithSpirit);

        gameSave.savePlayer(game);
        const players = gameSave.getPlayersAsList();
        const index = players.findIndex(item => item.name === 'HeroPlayer');
        expect(index).to.be.above(-1);
    });
});
