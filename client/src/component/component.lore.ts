
import RG from '../rg';
import {Component} from './component.base';
import {ILoreEntry, TLoreMsg} from '../interfaces';

export interface ComponentLore {
    entries: ILoreEntry[];
    hasTopic(topic: string): boolean;
    getKey(query: any): ILoreEntry[];
    getMsg(topic: string): string[];
    addTopic(key: string, msg: any): void;
    getLoreTopics(): string[];
    addEntry(entry: ILoreEntry): void;
    hasEntry(entry: ILoreEntry): boolean;
}

const DataComponent = Component.DataComponent;

/* Component attached to Level/Places for Lore. */
export const Lore = DataComponent('Lore', {
    entries: null, // Stores actual Lore entries into list
    tag: '' // Used for internal bookkeeping only
});

Lore.prototype._init = function() {
    this.entries = [];
};

Lore.prototype.addEntry = function(entry: ILoreEntry): void {
    if ((entry as any).msg) {
        let err = 'entry.msg not supported. Use entry.respMsg from now on';
        err += ' Got: ' + JSON.stringify((entry as any).msg);
        RG.err('Component.Lore', 'addEntry', err);
    }
    if (!entry.topic) {
        console.log('Entry was ', entry);
        RG.err('Component.Lore', 'addEntry',
            `Given entry has no topic: ${JSON.stringify(entry)}`);
    }
    this.entries.push(entry);
};


Lore.prototype.hasEntry = function(entry: ILoreEntry): boolean {
    let hasEntry = false;
    const entries = this.getKey({topic: entry.topic});
    entries.forEach((otherEntry: ILoreEntry) => {
        hasEntry = hasEntry || this.compareEntry(entry, otherEntry);
    });
    return hasEntry;
};

/* Compares two lore entries for similarity. */
Lore.prototype.compareEntry = function(lhs: ILoreEntry, rhs: ILoreEntry): boolean {
    if (lhs.topic !== rhs.topic) {return false;}
    if (lhs.askMsg || rhs.askMsg) {
        if (lhs.askMsg !== rhs.askMsg) {return false;}
    }
    if (lhs.respMsg || rhs.respMsg) {
        if (lhs.respMsg !== rhs.respMsg) {return false;}
    }
    if (lhs.names && rhs.names) {
        if (lhs.names.length !== rhs.names.length) {
            return false;
        }
    }
    else if (lhs.names || rhs.names) {
        return false;
    }

    return true;
};


/* Returns all entries with given key. */
Lore.prototype.getKey = function(query: any): ILoreEntry[] {
    const entries: ILoreEntry[] = [];
    this.entries.forEach((entry: ILoreEntry) => {
        let entryAdded = false;
        Object.keys(query).forEach(qq => {
            if ((entry as any)[qq] === query[qq]) {
                if (!entryAdded) {
                    entries.push(entry);
                }
                entryAdded = true;
            }
        });
    });
    return entries;
};


Lore.prototype.getRespMsg = function(topic: string): TLoreMsg[] {
    let res: TLoreMsg[] = [];
    this.entries.forEach((entry: ILoreEntry) => {
        if (entry.topic === topic) {
            const msg = entry.respMsg;
            if (msg) {
                if (Array.isArray(msg)) {
                    res = res.concat(msg);
                }
                else {
                    res.push(msg);
                }
            }
        }
    });
    return res;
};


Lore.prototype.addTopic = function(key: string, respMsg: TLoreMsg): void {
    const obj: ILoreEntry = {topic: key, respMsg};
    this.entries.push(obj);
};


Lore.prototype.hasTopic = function(key: string): boolean {
    const topics = this.getLoreTopics();
    const idx = topics.indexOf(key);
    return idx >= 0;
};


Lore.prototype.getLoreTopics = function(): string[] {
    const topics: string[] = [];
    this.entries.forEach(e => {
        if (topics.indexOf(e.topic) < 0) {
            topics.push(e.topic);
        }
    });
    return topics;
};


