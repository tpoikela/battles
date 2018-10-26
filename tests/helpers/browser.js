/* browser.js
 *
 * Sets up 'browser-like' environment for running unit tests for React
 * components.
 * */

import 'babel-polyfill';

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

global.window = dom.window;
global.document = dom.window.document;
global.navigator = global.window.navigator;

Object.keys(global.window).forEach(property => {
  if (typeof global[property] === 'undefined') {
    global[property] = global.window[property];
  }
});

if (!global.requestAnimationFrame) {
  requestAnimFrame(global); // polyfill
}

global.window.indexedDB = indexedDB;
