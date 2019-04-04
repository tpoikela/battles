/* Contains data/code for generating random actor names.
 * Acts as a placeholder for now, better names will be implemented
 * later.
 */

import RG from '../src/rg';
import {RandWeights} from '../src/interfaces';
import {Random} from '../src/random';

const RNG = Random.getRNG();

const nameWeights: RandWeights = {
    1: 5,
    2: 30,
    3: 30,
    4: 20,
    5: 5
};

const smallLetters = RG.LETTERS;
const vowelRe = /[aeiouy]/;
const vowels = smallLetters.filter(c => vowelRe.test(c));
const consonants = smallLetters.filter(c => !vowelRe.test(c));

const twoLetters = [];
const threeLetters = [];
const fourLetters = [];
const twoVowels = [];
const fiveLetters = [];

const endsWithVowel = [];

const starts = {vowel: [], consonant: []};
const ends = {vowel: [], consonant: []};

smallLetters.forEach(a0 => {
    if (vowelRe.test(a0)) {
        const v0 = a0;
        vowels.forEach(v1 => {
            twoLetters.push(v0 + v1);
            starts.vowel.push(v0 + v1);
            ends.vowel.push(v0 + v1);
            consonants.forEach(c2 => {
                threeLetters.push(v0 + v1 + c2);
                starts.vowel.push(v0 + v1 + c2);
                ends.consonant.push(v0 + v1 + c2);
            });
        });
        consonants.forEach(c1 => {
            twoLetters.push(v0 + c1);
            starts.vowel.push(v0 + c1);
            ends.consonant.push(v0 + c1);
            vowels.forEach(v2 => {
                threeLetters.push(v0 + c1 + v2);
                starts.vowel.push(v0 + c1 + v2);
                ends.vowel.push(v0 + c1 + v2);
            });
        });
    }
    else { // 1st letter consonant
        const c0 = a0;
        vowels.forEach(v1 => {
            twoLetters.push(c0 + v1);
            ends.vowel.push(c0 + v1);
            starts.consonant.push(c0 + v1);
            smallLetters.forEach(a2 => {
                threeLetters.push(c0 + v1 + a2);
                starts.consonant.push(c0 + v1 + a2);
            });

            consonants.forEach(c2 => {
                vowels.forEach(v3 => {
                    fourLetters.push(c0 + v1 + c2 + v3);
                    starts.consonant.push(c0 + v1 + c2 + v3);
                    ends.vowel.push(c0 + v1 + c2 + v3);
                    consonants.forEach(c4 => {
                        const w = c0 + v1 + c2 + v3 + c4;
                        fiveLetters.push(w);
                        starts.consonant.push(w);
                        ends.consonant.push(w);
                    });
                });
                consonants.forEach(c3 => {
                    const w = c0 + v1 + c2 + c3;
                    fourLetters.push(w);
                    starts.consonant.push(w);
                    ends.consonant.push(w);
                    vowels.forEach(v4 => {
                        const ww = w + v4;
                        fiveLetters.push(ww);
                        starts.consonant.push(ww);
                        ends.vowel.push(ww);
                    });
                });
            });
        });
    }
});

export const ActorNames: any = {};

const rejectRe = /[aeiouy][aeiouy][aeiouy]/;
const noLastRe = /[xqjv]$/;

/* Generates a random actor name. */
ActorNames.getName = function(ws = nameWeights): string {
    const nameLen = parseInt(RNG.getWeighted(nameWeights), 10);
    let nameOk = false;
    let fullName = '';
    while (!nameOk) {
        fullName = '';
        if (nameLen === 1) { // Get rid of very short names like Wi or Aa
            fullName = RNG.arrayGetRand(fiveLetters);
        }
        else {
            for (let i = 0; i < nameLen; i++) {
                let namePart = '';
                if (RG.isSuccess(0.4)) {
                    namePart = RNG.arrayGetRand(twoLetters);
                }
                else if (RG.isSuccess(0.4)) {
                    namePart = RNG.arrayGetRand(threeLetters);
                }
                else {
                    namePart = RNG.arrayGetRand(fourLetters);
                }
                fullName += namePart;
            }
        }
        if (!rejectRe.test(fullName) && !noLastRe.test(fullName)) {
            nameOk = true;
        }
    }
    return fullName.capitalize();
};

const beginnings = consonants.concat(['th', 'gr', 'dr', 'wh']);
const endings = ['th', 'r', 'l', 'n', 'ch', 'zh'];

ActorNames.getModName = function(): string {
    let begin = '';
    if (RG.isSuccess(0.50)) {
        begin = RNG.arrayGetRand(beginnings);
        // begin += RNG.arrayGetRand(vowels);
        begin += RNG.arrayGetRand(starts.vowel);
    }
    if (RG.isSuccess(0.25)) {
        begin = RNG.arrayGetRand(vowels) + begin;
        if (RG.isSuccess(0.25)) {
            begin = RNG.arrayGetRand(vowels) + begin;
        }
    }

    let end = '';
    if (RG.isSuccess(0.50)) {
        end = RNG.arrayGetRand(endings);
        if (RG.isSuccess(0.50)) {
            end += RNG.arrayGetRand(ends.vowel);
        }
    }

    let body = begin + end;
    if (body.length < 2) {
        body = ActorNames.getName({2: 50, 3: 35}).toLowerCase();
    }
    else if (body.length < 4) {
        body = ActorNames.getName({2: 50}).toLowerCase();
    }
    else {
        if (RG.isSuccess(0.50)) {
            body = RNG.arrayGetRand(fourLetters);
        }
        else {
            body = RNG.arrayGetRand(fiveLetters);
        }
    }

    const fullName = begin + body + end;
    const nameOk = isNameOk(fullName);
    if (!nameOk) {
        return ActorNames.getModName();
    }
    return fullName.capitalize();
};

function isNameOk(name: string): boolean {
    if (!rejectRe.test(name) && !noLastRe.test(name)) {
        return true;
    }
    return false;
}
