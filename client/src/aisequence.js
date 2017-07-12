
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

/*
 * From http:// stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
 */
function shuffle(array) {
    let currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

function startBehavTree(behaviourTreeNode, actor) {
    const resArray = [];
    execBehavTree(behaviourTreeNode, actor, resArray);
    return resArray;
}

function execBehavTree(behaviourTreeNode, actor, resArray) {
    if (typeof actor.completedCurrentAction === 'undefined' || actor.completedCurrentAction === true) {

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
    shuffle(sequencerRandomNode.actionArray);
    for (let i = 0; i < sequencerRandomNode.actionArray.length; i++) {
        execBehavTree(sequencerRandomNode.actionArray[i], actor, arr);
    }
}

function selectorRandom(selectorRandomNode, actor, arr) {
    const randomIndex = Math.floor(Math.random() * selectorRandomNode.actionArray.length);
    execBehavTree(selectorRandomNode.actionArray[randomIndex], actor, arr);
}

/*
function tick(behaviourTreeNode, actor) {
    setInterval(function() {
        execBehavTree(behaviourTreeNode, actor);
    }, 50);
}
*/

//----------------------------------------------------------------------
// EXAMPLES
//----------------------------------------------------------------------

const rogueModel = {};

rogueModel.ifPlayerIsInSight = function(actor) {
    const brain = actor.getBrain();
    const seenCells = brain.getSeenCells();
    const playerCell = brain.findEnemyCell(seenCells);
    return playerCell !== null;
};

rogueModel.attackPlayer = function(actor) {
    const brain = actor.getBrain();
    const seenCells = brain.getSeenCells();
    const playerCell = brain.findEnemyCell(seenCells);
    return brain.actionTowardsEnemy(playerCell);
};

/* Returns true if actor has 10% of health. */
rogueModel.ifSeriouslyWounded = function(actor) {
    const healthComp = actor.get('Health');
    const thr = Math.round(healthComp.getMaxHP() * 0.1);
    return healthComp.getHP() <= thr;
};

rogueModel.flee = function(actor) {
    const brain = actor.getBrain();
    const seenCells = brain.getSeenCells();
    const playerCell = brain.findEnemyCell(seenCells);
    return brain.fleeFromCell(playerCell, seenCells);
};

rogueModel.exploreLevel = function(actor) {
    const brain = actor.getBrain();
    const seenCells = brain.getSeenCells();
    return brain.exploreLevel(seenCells);
};

/*
const rogueModelBehavTree =
    new SelectorNode(
        rogueModel.ifSeriouslyWounded,
        new SequencerNode([rogueModel.flee]),
        new SelectorNode(
            rogueModel.ifPlayerIsInSight,
            rogueModel.attackPlayer,
            rogueModel.exploreLevel
        )
    );
*/
const rogueModelBehavTree =
    new SelectorNode(
        rogueModel.ifPlayerIsInSight,
        new SelectorNode(
            rogueModel.ifSeriouslyWounded,
            rogueModel.flee,
            rogueModel.attackPlayer
        ),
        rogueModel.exploreLevel
    );

/*
    const actor1 = new RG.Actor.Rogue('goblin');
    const player = new RG.Actor.Rogue('player');
    player.setIsPlayer(true);
    const level = RG.FACT.createLevel('arena', 10, 10);
    level.addActor(actor1, 1, 1);
    level.addActor(player, 3, 3);

    for (let i = 0; i < 10; i++) {
        execBehavTree(rogueModelBehavTree, actor1);
        if (i === 5) {
            actor1.get('Health').setHP(1);
        }
    }
*/
// }

// battlesExample();

const BTree = {
    SelectorNode,
    SequencerNode,
    SelectorRandomNode,
    SequencerRandomNode,
    execBehavTree,
    startBehavTree,
    Model: {
        Rogue: rogueModelBehavTree
    }
};

module.exports = BTree;

