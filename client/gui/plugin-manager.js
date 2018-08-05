
export class PluginEntry {

    constructor(json) {
        this._enabled = true;
        this._type = json.plugin;
        this._data = json.data;
        this._name = json.name;
        this._description = json.description;
    }

    getData() {return this._data;}

    disable() {this._enabled = false;}
    enable() {this._enabled = true;}

}

export default class PluginManager {

    constructor() {
        this._plugins = [];
    }

    readJSON(json) {
        const entry = new PluginEntry(json);
        this._plugins.push(entry);
        return entry;
    }

    getPlugins() {
        return this._plugins;
    }
}
