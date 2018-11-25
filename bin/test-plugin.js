#! /usr/bin/env node

require('ts-node/register');

const RG = require('../client/src/battles');
const PluginManager = require('../client/gui/plugin-manager').PluginManager;
const cmdLineArgs = require('command-line-args');
const fs = require('fs');

global.RG = RG;

const manager = new PluginManager();

const optDefs = [
    {name: 'file', alias: 'f', type: String, descr: 'Input plugin file'}
];

const opts = cmdLineArgs(optDefs);

const pluginCode = fs.readFileSync(opts.file);

const entry = manager.loadScript(pluginCode.toString());
const error = manager.getError();

if (error !== '') {
    throw new Error(error);
}
else {
    entry.runTest();
}

console.log('Plugin ' + opts.file + ' tested without any errors');
