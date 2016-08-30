/**
 * File containing map elements. These are either terrain or interactive
 * elements like stairs.
 */

var GS = require("../getsource.js");
var RG  = GS.getSource(["RG"], "./src/rg.js");

RG.Object = GS.getSource(["RG", "Object"], "./src/object.js");

RG.Element = {};

/** Element is a wall or other obstacle or a feature in the map. It's not
 * necessarily blocking movement.  */
RG.Element.Base = function(elemType) { // {{{2
    RG.Object.Locatable.call(this);
    this.setPropType("elements");
    this.setType(elemType);

    var _elemType = elemType.toLowerCase();
    var _allowMove;

    switch(elemType) {
        case "wall": _allowMove = false; break;
        default: _allowMove = true; break;
    }

    this.isPassable = function() {return _allowMove;};
};
RG.extend2(RG.Element.Base, RG.Object.Locatable);
// }}} Element

/** Object models stairs connecting two levels. Stairs are one-way, thus
 * connecting 2 levels requires two stair objects. */
RG.Element.Stairs = function(down, srcLevel, targetLevel) {
    if (down)
        RG.Element.Base.call(this, "stairsDown");
    else
        RG.Element.Base.call(this, "stairsUp");

    var _down = down;
    var _srcLevel = srcLevel;
    var _targetLevel = targetLevel;
    var _targetStairs = null;

    /** Target actor uses the stairs.*/
    this.useStairs = function(actor) {
        if (!RG.isNullOrUndef([_targetStairs, _targetLevel])) {
            var newLevel = _targetLevel;
            var newX = _targetStairs.getX();
            var newY = _targetStairs.getY();
            if (_srcLevel.removeActor(actor)) {
                if (_targetLevel.addActor(actor, newX, newY)) {
                    RG.POOL.emitEvent(RG.EVT_LEVEL_CHANGED,
                        {target: _targetLevel, src: _srcLevel, actor: actor});
                    RG.POOL.emitEvent(RG.EVT_LEVEL_ENTERED, {actor: actor, target:
                        targetLevel});
                    return true;
                }
            }
        }
        return false;
    };

    this.isDown = function() {return _down;};

    this.getSrcLevel = function() {return _srcLevel; };
    this.setSrcLevel = function(src) {_srcLevel = src;};

    this.getTargetLevel = function() {return _targetLevel; };
    this.setTargetLevel = function(target) {_targetLevel = target;};

    this.setTargetStairs = function(stairs) {_targetStairs = stairs;};
    this.getTargetStairs = function() {return _targetStairs;};

};
RG.extend2(RG.Element.Stairs, RG.Element.Base);

if (typeof module !== "undefined" && typeof exports !== "undefined") {
    GS.exportSource(module, exports, ["RG", "Element"], [RG, RG.Element]);
}
else {
    GS.exportSource(undefined, undefined, ["RG", "Element"], [RG, RG.Element]);
}
