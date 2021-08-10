import Canvas from './canvas';
import { DisplayData } from './types';

/**
 * @class Tile backend
 * @private
 */
export default class Tile extends Canvas {
    _colorCanvas: HTMLCanvasElement;

    constructor() {
        super();
        this._colorCanvas = document.createElement('canvas');
    }

    draw(data: DisplayData, clearBefore: boolean) {
        const [x, y, ch, fg, bg] = data;

        const tileWidth = this._options.tileWidth;
        const tileHeight = this._options.tileHeight;

        if (clearBefore) {
            if (this._options.tileColorize) {
                this._ctx.clearRect(x*tileWidth, y*tileHeight, tileWidth, tileHeight);
            } else {
                this._ctx.fillStyle = bg;
                this._ctx.fillRect(x*tileWidth, y*tileHeight, tileWidth, tileHeight);
            }
        }

        if (!ch) { return; }

        const chars = ([] as string[]).concat(ch);
        const fgs = ([] as string[]).concat(fg);
        const bgs = ([] as string[]).concat(bg);

        for (let i=0;i<chars.length;i++) {
            const tile = this._options.tileMap[chars[i]];
            if (!tile) {
                // throw new Error(`Char "${chars[i]}" not found in tileMap`);
                this._drawChar(data, clearBefore);
                continue;
            }

            if (this._options.tileColorize) { // apply colorization
                const canvas = this._colorCanvas;
                const context = canvas.getContext('2d') as CanvasRenderingContext2D;
                context.globalCompositeOperation = 'source-over';
                context.clearRect(0, 0, tileWidth, tileHeight);

                const fg = fgs[i];
                const bg = bgs[i];

                context.drawImage(
                    this._options.tileSet as any,
                    tile[0], tile[1], tileWidth, tileHeight,
                    0, 0, tileWidth, tileHeight
                );

                if (fg !== 'transparent') {
                    context.fillStyle = fg;
                    context.globalCompositeOperation = 'source-atop';
                    context.fillRect(0, 0, tileWidth, tileHeight);
                }

                if (bg !== 'transparent') {
                    context.fillStyle = bg;
                    context.globalCompositeOperation = 'destination-over';
                    context.fillRect(0, 0, tileWidth, tileHeight);
                }

                this._ctx.drawImage(canvas as any, x*tileWidth, y*tileHeight, tileWidth, tileHeight);
            } else { // no colorizing, easy
                this._ctx.drawImage(
                    this._options.tileSet as any,
                    tile[0], tile[1], tileWidth, tileHeight,
                    x*tileWidth, y*tileHeight, tileWidth, tileHeight
                );
            }
        }
    }

    _drawChar(data: DisplayData, clearBefore: boolean) {
        const [x, y, ch, fg, bg] = data;
        const tileWidth = this._options.tileWidth;
        const tileHeight = this._options.tileHeight;

        if (clearBefore) {
            const b = this._options.border;
            this._ctx.fillStyle = bg;
            this._ctx.fillRect(x*tileWidth + b, y*tileHeight + b, tileWidth - b, tileHeight - b);
        }

        if (!ch) { return; }

        this._ctx.fillStyle = fg;

        const chars = ([] as string[]).concat(ch);
        for (let i=0;i<chars.length;i++) {
            this._ctx.fillText(chars[i], (x+0.5) * tileWidth, Math.ceil((y+0.5) * tileHeight));
        }
    }

    computeSize(availWidth: number, availHeight: number): [number, number] {
        const width = Math.floor(availWidth / this._options.tileWidth);
        const height = Math.floor(availHeight / this._options.tileHeight);
        return [width, height];
    }

    computeFontSize(): number {
        throw new Error('Tile backend does not understand font size');
    }

    _normalizedEventToPosition(x:number, y:number): [number, number] {
        return [Math.floor(x/this._options.tileWidth), Math.floor(y/this._options.tileHeight)];
    }

    _updateSize() {
        const opts = this._options;
        this._ctx.canvas.width = opts.width * opts.tileWidth;
        this._ctx.canvas.height = opts.height * opts.tileHeight;
        this._colorCanvas.width = opts.tileWidth;
        this._colorCanvas.height = opts.tileHeight;
    }
}
