
// import { MyWorker } from './types';
// works import MyWorkerImport = require('worker-loader!./create-game-worker.ts');
import MyWorkerImport from 'worker-loader!./create-game-worker';

// export { MESSAGE_TYPE } from './types';
export {MyWorkerImport};
