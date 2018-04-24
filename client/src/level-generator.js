
/* Contains the code for base class of level generator. */
const RG = require('./rg.js');

const LevelGenerator = function() {
    this.shouldRemoveMarkers = false;
};

LevelGenerator.prototype.addStartAndEndPoint = function(level, start, end) {
    if (start) {
        const [sX, sY] = start;
        const startPointElem = new RG.Element.Marker('<');
        startPointElem.setTag('start_point');
        level.addElement(startPointElem, sX, sY);
    }

    if (end) {
        const [eX, eY] = end;
        const goalPoint = new RG.Element.Marker('>');
        goalPoint.setTag('end_point');
        level.addElement(goalPoint, eX, eY);
    }
};

LevelGenerator.prototype.removeMarkers = function(level, conf) {
    let preserveMarkers = ['start_point', 'end_point', 'critical_path'];
    if (conf.preserveMarkers) {
        preserveMarkers = preserveMarkers.concat(conf.preserveMarkers);
    }
    else if (conf.preserveMarkers === false) {
        preserveMarkers = [];
    }

    if (!RG.isNullOrUndef([conf.shouldRemoveMarkers])) {
        this.shouldRemoveMarkers = conf.shouldRemoveMarkers;
    }

    if (this.shouldRemoveMarkers) {
        level.removeElements(e => {
            if (e.getTag) {
                const tag = e.getTag();
                if (preserveMarkers.indexOf(tag) < 0) {
                    return true;
                }
            }
            return false;
        });
    }

};


module.exports = LevelGenerator;
