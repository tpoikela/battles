
var GS = require("./getsource.js");
var ROT = GS.getSource("ROT", "./lib/rot.js");

var RG  = GS.getSource("RG", "./src/rg.js");
RG.Object = GS.getSource(["RG", "Object"], "./src/object.js");
RG.Item = GS.getSource(["RG","Item"], "./src/item.js");
RG.Time = GS.getSource(["RG","Time"], "./src/time.js");
RG.Component = GS.getSource(["RG", "Component"], "./src/component.js");
RG.System = GS.getSource(["RG", "System"], "./src/system.js");
RG.Brain = GS.getSource(["RG", "Brain"], "./src/brain.js");
RG.Inv = GS.getSource(["RG", "Inv"], "./src/inv.js");
RG.Actor = GS.getSource(["RG", "Actor"], "./src/actor.js");
RG.Element = GS.getSource(["RG", "Element"], "./src/element.js");
RG.Map = GS.getSource(["RG", "Map"], "./src/map.js");
RG.World = GS.getSource(["RG", "World"], "./src/world.js");

RG.Effects = GS.getSource(["RG", "Effects"], "./data/effects.js");
RG.Factory = GS.getSource(["RG", "Factory"], "./src/factory.js");

if (typeof exports !== 'undefined' ) {
    if( typeof RG !== 'undefined' && module.exports ) {
        exports = module.exports = RG;
    }
    exports.RG = RG;
}
else {
    window.RG = RG;
}

