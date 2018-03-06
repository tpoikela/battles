
const RG = require('../src/rg');
const Path = require('../src/path');

const dirToKeyCode = RG.KeyMap.dirToKeyCode;
/* This class handles various actions when player clicks a cell. */
export default class CellClickHandler {

    moveTo(player, toX, toY) {
        let keyBuf = [];
        let [pX, pY] = [player.getX(), player.getY()];
        let pathPossible = true;
        const map = player.getLevel().getMap();
        while (pX !== toX && pY !== toY) {
            const dx = toX - pX;
            const dy = toY - pY;
            keyBuf.push(dirToKeyCode(dx, dy));
            pX += dx / Math.abs(dx);
            pY += dy / Math.abs(dy);
            if (!map.isPassable(pX, pY)) {
                pathPossible = false;
            }
        }
        if (toX !== pX) {
            while (pX !== toX) {
                const dx = toX - pX;
                keyBuf.push(dirToKeyCode(dx, 0));
                pX += dx / Math.abs(dx);
                if (!map.isPassable(pX, pY)) {
                    pathPossible = false;
                }
            }
        }
        else if (toY !== pY) {
            while (pY !== toY) {
                const dy = toY - pY;
                keyBuf.push(dirToKeyCode(0, dy));
                pY += dy / Math.abs(dy);
                if (!map.isPassable(pX, pY)) {
                    pathPossible = false;
                }
            }
        }
        if (!pathPossible) {
            [pX, pY] = [player.getX(), player.getY()];
            keyBuf = [];
            const path = Path.getShortestActorPath(map, pX, pY, toX, toY);
            path.forEach(xy => {
                const dx = xy.x - pX;
                const dy = xy.y - pY;
                keyBuf.push(dirToKeyCode(dx, dy));
                if (dx !== 0) {pX += dx / Math.abs(dx);}
                if (dy !== 0) {pY += dy / Math.abs(dy);}
            });

        }
        console.log('Returning ' + keyBuf.length + ' moves');
        return keyBuf;
    }

}
