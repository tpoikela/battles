/* Contains code for handling plugin loading/removing and status management. */

import RG from '../src/rg';
import {ObjectShell} from '../src/objectshellparser';
import {expect} from 'chai';

import * as AllCode from '../src/battles';

export interface PluginData {
    [key: string]: any;
}

const PLUGIN_TYPES = [
    'plugin', 'items', 'actors', 'elements', 'system', 'spell'
];

/* Each plugin is associated with an entry which stores the plugin code. */
export class PluginEntry {

    public _enabled: boolean;
    public _type: string;
    public _data: PluginData;
    public _name: string;
    public _description: string;
    public _status: string;
    public _errorMsg: string;
    public _fileType: string;

    public _onLoad: () => void;
    public _onRemove: () => void;
    public _test: (expect: any) => void;

    constructor(json) {
        this._enabled = false;
        this._type = json.type;
        this._data = json.data;
        this._name = json.name;
        this._description = json.description;
        this._fileType = json.fileType;
        this._status = 'UNLOADED';
        this._errorMsg = '';
        this._test = json.test;

        this._onLoad = json.onLoad;
        this._onRemove = json.onRemove;
    }

    public getData(): PluginData {return this._data;}

    public hasError() {
        return (/ERROR/).test(this._status);
    }

    public getError(): string {
        return this._errorMsg;
    }

    public disable(): void {
        if (this._enabled) {
            if (typeof this._onRemove === 'function') {
                try {
                    this._onRemove();
                    this._status = 'UNLOADED';
                    this._errorMsg = '';
                }
                catch (e) {
                    this._errorMsg = e.message;
                    this._status = 'UNLOAD ERROR';
                    throw new Error(`${this._name}: ${e.message}`);
                }
            }
            this._enabled = false;
        }
    }

    public enable(): void {
        if (!this._enabled) {
            if (typeof this._onLoad === 'function') {
                try {
                    this._onLoad();
                    this._status = 'LOADED';
                    this._errorMsg = '';
                }
                catch (e) {
                    this._errorMsg = e.message;
                    this._status = 'LOAD ERROR';
                    throw new Error(`${this._name}: ${e.message}`);
                }
            }
            this._enabled = true;
        }
    }

    public getName(): string {
        return this._name;
    }

    public getType(): string {
        return this._type;
    }

    public isEnabled() {
        return this._enabled;
    }

    public runTest(): void {
        if (this._test) {
            this._test(expect);
        }
    }

    public toJSON() {
        return {
            type: this._type,
            fileType: this._fileType,
            name: this._name,
            data: this._data,
            description: this._description
        };
    }

}

/* Manager contains list of plugins that have been loaded. */
export class PluginManager {

    /* Returns a plugin manager from json. */
    public static fromJSON(jsonArr): PluginManager {
        const pm = new PluginManager();
        jsonArr.forEach(plugin => {
            if (plugin.fileType === 'json') {
                pm.readJSON(plugin);
            }
            else {
                pm.loadScript(plugin.data);
            }
        });
        pm.enableAll();
        /* TODO */
        return pm;
    }

    private _plugins: PluginEntry[];
    private _errorMsg: string;
    private _readCallbacks: {[key: string]: (entry: PluginEntry) => void};
    private _globalRefsWereSet: boolean;

    constructor() {
        this._plugins = [];
        this._errorMsg = '';
        this._readCallbacks = {
            [RG.TYPE_ACTOR]: this.parseShellsOnRead,
            [RG.TYPE_ITEM]: this.parseShellsOnRead,
            [RG.TYPE_ELEM]: this.parseShellsOnRead
        };
        this._globalRefsWereSet = false;
    }

    /* Loads plugin data in JSON format. */
    public readJSON(json): PluginEntry {
        json.fileType = 'json';
        const entry = this.addPlugin(json);
        const type = entry.getType();

        if (this._readCallbacks[type]) {
            this._readCallbacks[type](entry);
        }
        return entry;
    }

    /* Loads a script using eval. */
    public loadScript(text: string): PluginEntry {
        let entry: PluginEntry = null;
        try {
            this.setGlobalRefs();
            /* tslint:disable */
            let pluginData = null;
            // Note that eval'ed text must set the pluginData
            eval(text);
            /* tslint:enable */
            if (pluginData) {
                pluginData.data = text;
                pluginData.fileType = 'script';
                entry = this.addPlugin(pluginData);
                this._errorMsg = '';
            }
            else {
                this._errorMsg = 'no pluginData specified in the script';
            }

            if (this._globalRefsWereSet) {
                this.unsetGlobalRefs();
            }
            /* eslint-enable */
        }
        catch (e) {
            this._errorMsg = e.message;
            if (this._globalRefsWereSet) {
                this.unsetGlobalRefs();
            }
            throw e;
        }
        return entry;
    }

    /* Returns true if any of the plugins are enabled. */
    public anyPluginsEnabled(): boolean {
        for (let i = 0; i < this._plugins.length; i++) {
            if (this._plugins[i].isEnabled()) {
                return true;
            }
        }
        return false;
    }

    public findPlugin(name): PluginEntry | null {
        return this._plugins.find(p => p._name === name);
    }

    public getPlugins(): PluginEntry[] {
        return this._plugins.slice();
    }

    public getPluginNames(): string[] {
        return this._plugins.map(p => p._name);
    }

    public addPlugin(pluginData): PluginEntry {
        this.validateType(pluginData);
        const entry = new PluginEntry(pluginData);
        this._plugins.push(entry);
        return entry;
    }

    public deletePlugin(name: string): void {
        const index = this._plugins.findIndex(p => p.getName() === name);
        if (index >= 0) {
            this._plugins[index].disable();
            if (this._plugins[index].hasError()) {
                this._errorMsg = this._plugins[index].getError();
            }
            this._plugins.splice(index, 1);
        }
    }

    public disablePlugin(name: string): void {
        const plugin: PluginData = this.findPlugin(name);
        this._errorMsg = '';
        if (plugin) {
            this.setGlobalRefs();
            plugin.disable();
            if (plugin.hasError()) {
                this._errorMsg = plugin.getError();
            }
            this.unsetGlobalRefs();
        }
        else {
            this._errorMsg = 'Could not find plugin ' + name;
        }
    }

    public enablePlugin(name: string): void {
        const plugin: PluginData = this.findPlugin(name);
        if (plugin) {
            this.setGlobalRefs();
            plugin.enable();
            if (plugin.hasError()) {
                this._errorMsg = plugin.getError();
            }
            this.unsetGlobalRefs();
        }
    }

    public enableAll(): void {
        this._errorMsg = '';
        this.setGlobalRefs();
        this._plugins.forEach(plugin => {
            plugin.enable();
            if (plugin.hasError()) {
                this._errorMsg += plugin.getError() + '\n';
            }
        });
        this.unsetGlobalRefs();
    }

    public disableAll(): void {
        this._errorMsg = '';
        this.setGlobalRefs();
        this._plugins.forEach(plugin => {
            plugin.disable();
            if (plugin.hasError()) {
                this._errorMsg += plugin.getError() + '\n';
            }
        });
        this.unsetGlobalRefs();
    }

    public getError(): string {
        return this._errorMsg;
    }


    /* Serialize the plugin manager. */
    public toJSON(): any {
        return this._plugins.map(p => p.toJSON());
    }

    protected setGlobalRefs(): void {
        if (typeof window !== 'undefined') {
            if (!(window as any).RG) {
                this._globalRefsWereSet = true;
                (window as any).RG = AllCode;
            }
        }
        else if (typeof global !== 'undefined') {
            if (!(global as any).RG) {
                this._globalRefsWereSet = true;
                (global as any).RG = AllCode;
            }
        }
    }

    protected unsetGlobalRefs(): void {
        this._globalRefsWereSet = false;
        if (typeof window !== 'undefined') {
            (window as any).RG = undefined;
        }
        else if (typeof global !== 'undefined') {
            (global as any).RG = undefined;
        }
    }

    protected withGlobalRefs(cb: () => void): void {
        this.setGlobalRefs();
        cb();
        this.unsetGlobalRefs();
    }

    protected parseShellsOnRead = (entry: PluginEntry): void => {
        const data = entry.getData();
        const type = entry.getType();
        const propTypes = [RG.TYPE_ACTOR, RG.TYPE_ITEM, RG.TYPE_ELEM];
        propTypes.forEach(propType => {
            if (type === propType) {
                const parser = ObjectShell.getParser();
                parser.parseShellCateg(propType, data);
            }
        });
    }

    protected validateType(pluginData): void {
        if (!pluginData.type) {
            throw new Error('pluginData must have type specified');
        }
        const index = PLUGIN_TYPES.indexOf(pluginData.type);
        if (index < 0) {
            let msg = 'type must be any of the following: ';
            msg += JSON.stringify(PLUGIN_TYPES);
            msg += ` but got |${pluginData.type}|`;
            throw new Error(msg);
        }
    }


}
