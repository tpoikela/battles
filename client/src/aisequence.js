
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

function SelectorNode(conditionFunction, actionIfTrue, actionIfFalse) {
    this.conditionFunction = conditionFunction;
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

function execBehavTree(behaviourTreeNode, actor) {
    if (typeof actor.completedCurrentAction === 'undefined' || actor.completedCurrentAction === true) {

        if (Object.getPrototypeOf(behaviourTreeNode) === SelectorNode.prototype) {
            console.log('selector');
            selector(behaviourTreeNode, actor);

        }
        else if (Object.getPrototypeOf(behaviourTreeNode) === SequencerNode.prototype) {
            console.log('sequencer');
            sequencer(behaviourTreeNode, actor);

        }
        else if (Object.getPrototypeOf(behaviourTreeNode) === SequencerRandomNode.prototype) {
            sequencerRandom(behaviourTreeNode, actor);

        }
        else if (Object.getPrototypeOf(behaviourTreeNode) === SelectorRandomNode.prototype) {
            selectorRandom(behaviourTreeNode, actor);

        }
        else {
            const res = behaviourTreeNode(actor);
            return res;
        }
    }
    console.log('typeof actor.completedCurrentAction: ' + typeof actor.completedCurrentAction);
    console.log('actor.completedCurrentAction: ' + actor.completedCurrentAction);
    console.log('typeof node: ' + typeof behaviourTreeNode);
    console.log(JSON.stringify(behaviourTreeNode));
    console.log('execBehavTree Returning empty func now');
    return () => {};
}

// Private functions

function selector(selectorNode, actor) {
    if (execBehavTree(selectorNode.conditionFunction, actor)) {
        execBehavTree(selectorNode.actionIfTrue, actor);
    }
    else {
        execBehavTree(selectorNode.actionIfFalse, actor);
    }
}

function sequencer(sequencerNode, actor) {
    for (let i = 0; i < sequencerNode.actionArray.length; i++) {
        execBehavTree(sequencerNode.actionArray[i], actor);
    }
}

function sequencerRandom(sequencerRandomNode, actor) {
    shuffle(sequencerRandomNode.actionArray);
    for (let i = 0; i < sequencerRandomNode.actionArray.length; i++) {
        execBehavTree(sequencerRandomNode.actionArray[i], actor);
    }
}

function selectorRandom(selectorRandomNode, actor) {
    const randomIndex = Math.floor(Math.random() * selectorRandomNode.actionArray.length);
    execBehavTree(selectorRandomNode.actionArray[randomIndex], actor);
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
    Model: {
        Rogue: rogueModelBehavTree
    }
};

module.exports = BTree;

