e
var chai = require("chai");
var expect = chai.expect;

var RG = require("../battles");

var Brain = RG.Brain;

describe('How PlayerBrain handles commands', function() {
    it('description', function() {
        var player = new RogueActor("Player");
        player.setIsPlayer(true);
        var brain = new Brain.Player(player);

    });
});

describe('Basic functions of Rogue Brain', function() {
    it('description', function() {
        var brain = new Brain.Rogue();
    });
});
