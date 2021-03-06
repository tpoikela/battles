/* browser.js
 *
 * Sets up 'browser-like' environment for running unit tests for React
 * components.
 * */

//import 'babel-polyfill';

import { JSDOM } from 'jsdom';
import indexedDB from 'fake-indexeddb';
import requestAnimFrame from './requestAnimFrame';

import Enzyme from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';

Enzyme.configure({ adapter: new Adapter() });

const dom = new JSDOM(`
<!DOCTYPE html>
<html>
  <head></head>
  <body>
  </body>
</html>
`, {
    url: 'http://localhost'
});

(global as any).window = dom.window;
(global as any).document = dom.window.document;
(global as any).navigator = (global as any).window.navigator;

Object.keys((global as any).window).forEach(property => {
  if (typeof global[property] === 'undefined') {
    global[property] = (global as any).window[property];
  }
});

if (!(global as any).requestAnimationFrame) {
  requestAnimFrame(global); // polyfill
}

(global as any).window.indexedDB = indexedDB;
