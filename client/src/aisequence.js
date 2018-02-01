
// const RG = require('./battles');

/* eslint-disable max-len */
/*
 * Created by Pietro Polsinelli on 15/05/2015. Twitter: @ppolsinelli
 * Modified by Tuomas Poikela 2017,
 *  for roguelike Battles in the North
 *
 * First inspired by the simplicity of
 * http:// stackoverflow.com/questions/4241824/creating-an-ai-behavior-tree-in-c-sharp-how
 *
 */

const RG = require('./rg');
const debug = require('debug')('bitn:aisequence');

function SelectorNode(condFunc, actionIfTrue, actionIfFalse) {
    this.condFunc = condFunc;
    this.actionIfTrue = actionIfTrue;
    this.actionIfFalse = actionIfFalse;
}

function SequencerNode(actionArray) {
    this.actionArray = actionArray;
}

function SelectorRandomNode(actionArray) {
    this.actionArray = actionArray;
}

function SequencerRandomNode(actionArray) {
    this.actionArray = actionArray;
}

//--------------------------------------------------------------------
// Utility functions
//--------------------------------------------------------------------

function startBehavTree(behaviourTreeNode, actor) {
    const resArray = [];
    debug('startBehavTree for actor ' + actor.getName());
    execBehavTree(behaviourTreeNode, actor, resArray);
    return resArray;
}

function execBehavTree(behaviourTreeNode, actor, resArray) {
    if (typeof actor.currActionDone === 'undefined' || actor.currActionDone === true) {

        if (Object.getPrototypeOf(behaviourTreeNode) === SelectorNode.prototype) {
            selector(behaviourTreeNode, actor, resArray);

        }
        else if (Object.getPrototypeOf(behaviourTreeNode) === SequencerNode.prototype) {
            sequencer(behaviourTreeNode, actor, resArray);

        }
        else if (Object.getPrototypeOf(behaviourTreeNode) === SequencerRandomNode.prototype) {
            sequencerRandom(behaviourTreeNode, actor, resArray);

        }
        else if (Object.getPrototypeOf(behaviourTreeNode) === SelectorRandomNode.prototype) {
            selectorRandom(behaviourTreeNode, actor, resArray);
        }
        else {
            const res = behaviourTreeNode(actor);
            if (typeof res === 'function') {
                resArray.push(res);
            }
            return res;
        }
    }
    return () => {};
}

// Private functions

function selector(selectorNode, actor, arr) {
    if (execBehavTree(selectorNode.condFunc, actor, arr)) {
        execBehavTree(selectorNode.actionIfTrue, actor, arr);
    }
    else {
        execBehavTree(selectorNode.actionIfFalse, actor, arr);
    }
}

function sequencer(sequencerNode, actor, arr) {
    for (let i = 0; i < sequencerNode.actionArray.length; i++) {
        execBehavTree(sequencerNode.actionArray[i], actor, arr);
    }
}

function sequencerRandom(sequencerRandomNode, actor, arr) {
    RG.RAND.shuffle(sequencerRandomNode.actionArray);
    for (let i = 0; i < sequencerRandomNode.actionArray.length; i++) {
        execBehavTree(sequencerRandomNode.actionArray[i], actor, arr);
    }
}

function selectorRandom(selectorRandomNode, actor, arr) {
    const randomIndex = RG.RAND.randIndex(selectorRandomNode.actionArray.length);
    execBehavTree(selectorRandomNode.actionArray[randomIndex], actor, arr);
}

//----------------------------------------------------------------------
// MODELS
//----------------------------------------------------------------------

const Models = {}; // Namespace for models

Models.Rogue = {};

Models.Rogue.ifEnemyIsInSight = actor => {
    const brain = actor.getBrain();
    const seenCells = brain.getSeenCells();
    const playerCell = brain.findEnemyCell(seenCells);
    debug(`${actor.getName()} playerSeen: ${playerCell}`);
    return playerCell !== null;
};

/* eslint no-unused-vars: 0 */
Models.Rogue.ifItemIsInSight = actor => {
    // TODO
};

Models.Rogue.pickupItem = actor => {
    // TODO
};

Models.Rogue.canEquipItem = actor => {
    // TODO
};

Models.Rogue.equipBestItem = actor => {
    // TODO
};

Models.Rogue.ifShopIsInSight = actor => {
    // TODO
};

Models.Rogue.moveToNearestShop = actor => {
    // TODO
};

Models.Rogue.sellItem = actor => {
    // TODO
};

Models.Rogue.ifStairsInSight = actor => {
    // TODO
};

Models.Rogue.ifPassageInSight = actor => {
    // TODO
};

Models.Rogue.useStairs = actor => {
    // TODO
};

Models.Rogue.attackEnemy = actor => {
    const brain = actor.getBrain();
    const seenCells = brain.getSeenCells();
    const playerCell = brain.findEnemyCell(seenCells);
    return brain.actionTowardsEnemy(playerCell);
};

/* Returns true if actor has 10% of health. */
Models.Rogue.ifSeriouslyWounded = actor => {
    const healthComp = actor.get('Health');
    const thr = Math.round(healthComp.getMaxHP() * 0.1);
    return healthComp.getHP() <= thr;
};

Models.Rogue.flee = actor => {
    const brain = actor.getBrain();
    const seenCells = brain.getSeenCells();
    const playerCell = brain.findEnemyCell(seenCells);
    return brain.fleeFromCell(playerCell, seenCells);
};

Models.Rogue.exploreLevel = actor => {
    const brain = actor.getBrain();
    const seenCells = brain.getSeenCells();
    return brain.exploreLevel(seenCells);
};

Models.Rogue.Nodes = {};

Models.Rogue.Nodes.combat =
    new SelectorNode(
        Models.Rogue.ifSeriouslyWounded,
        Models.Rogue.flee,
        Models.Rogue.attackEnemy
    );

Models.Rogue.tree =
    new SelectorNode(
        Models.Rogue.ifEnemyIsInSight,
        Models.Rogue.Nodes.combat,
        Models.Rogue.exploreLevel
    );

/* Human models for AI. */
Models.Human = {};

Models.Human.isEnemyInSight = actor => Models.Rogue.ifEnemyIsInSight(actor);

Models.Human.willCommunicate = actor => actor.getBrain().willCommunicate();

Models.Human.communicateEnemies = actor => actor.getBrain().communicateEnemies();

Models.Human.tree =
    new SelectorNode(
        Models.Human.isEnemyInSight,
        new SelectorNode(
            Models.Human.willCommunicate,
            Models.Human.communicateEnemies,
            Models.Rogue.Nodes.combat
        ),
        Models.Rogue.exploreLevel
    );

//------------------------------
/* Demon models for AI. */
//------------------------------
Models.Demon = {};

// Models.Demon.tree =  {};

//------------------------------
/* Summoner models for AI. */
//------------------------------
Models.Summoner = {};

Models.Summoner.willSummon = actor => actor.getBrain().willSummon();

Models.Summoner.summonMonster = actor => actor.getBrain().summonMonster();

Models.Summoner.tree =
    new SelectorNode(
        Models.Rogue.ifEnemyIsInSight,
        new SelectorNode(
            Models.Summoner.willSummon,
            Models.Summoner.summonMonster,
            Models.Rogue.tree
        ),
        Models.Rogue.exploreLevel
    );

//------------------------------
/* Archer models for AI. */
//------------------------------
Models.Archer = {};

Models.Archer.isOutOfAmmo = actor => {

};

Models.Archer.canSeeAmmo = actor => {

};

Models.Archer.pickupNearestAmmo = actor => {

};

Models.Archer.canDoRangedAttack = actor => actor.getBrain().canDoRangedAttack();

Models.Archer.doRangedAttack = actor => actor.getBrain().doRangedAttack();

Models.Archer.tree =
    new SelectorNode(
        Models.Rogue.ifEnemyIsInSight,
        new SelectorNode(
            Models.Archer.canDoRangedAttack,
            Models.Archer.doRangedAttack,
            Models.Rogue.Nodes.combat
        ),
        Models.Rogue.exploreLevel
    );

//------------------------------
/* SpellCaster model for AI. */
//------------------------------

Models.SpellCaster = {};

Models.SpellCaster.shouldCastSpell = actor => actor.getBrain().shouldCastSpell();

Models.SpellCaster.canCastSpell = actor => actor.getBrain().canCastSpell();

Models.SpellCaster.castSpell = actor => actor.getBrain().castSpell();

Models.SpellCaster.tree =
    new SelectorNode(
        Models.Rogue.ifEnemyIsInSight,
        new SelectorNode(
            Models.SpellCaster.shouldCastSpell,
            new SelectorNode(
                Models.SpellCaster.canCastSpell,
                Models.SpellCaster.castSpell,
                Models.Rogue.Nodes.combat
            ),
            Models.Rogue.Nodes.combat
        ),
        Models.Rogue.exploreLevel
    );

// Object for exports
const BTree = {
    SelectorNode,
    SequencerNode,
    SelectorRandomNode,
    SequencerRandomNode,
    execBehavTree,
    startBehavTree,
    Models
};

module.exports = BTree;

