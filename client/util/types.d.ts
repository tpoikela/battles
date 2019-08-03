// CreateGameWorker/types.d.ts

/* Converted based on discussion in
 * https://github.com/webpack-contrib/worker-loader/issues/94
 */

// Enumerate message types
export const enum MESSAGE_TYPE {
    PROGRESS, READY, ERROR
}

// Define expected properties for each message type
interface IProgressMessage {
    type: MESSAGE_TYPE;
    progress: string;
}

interface IResultMessage {
    type: MESSAGE_TYPE;
    ready: boolean;
    data: string;
}

interface IErrorMessage {
    type: MESSAGE_TYPE;
    error: string;
}

// Create a union type of all messages for convenience
type GameMessage = IProgressMessage | IResultMessage | IErrorMessage;

// Extend MessageEvent to use our messages
interface GameMessageEvent extends MessageEvent {
    data: GameMessage;
}

// Extend Worker to use the custom GameMessageEvent
export class CreateGameWorker extends Worker {
    public onmessage: (
        this: CreateGameWorker,
        ev: GameMessageEvent
    ) => any;

    public postMessage(
        this: CreateGameWorker,
        msg: GameMessage,
        transferList?: any
        // transferList?: ArrayBuffer[]
    ): any;

    public addEventListener(
        type: 'message',
        listener: (this: CreateGameWorker, ev: GameMessageEvent) => any,
        useCapture?: boolean
    ): void;

    public addEventListener(
        type: 'error',
        listener: (this: CreateGameWorker, ev: ErrorEvent) => any,
        useCapture?: boolean
    ): void;
}
