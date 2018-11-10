/* This grammar/generation rules taken from publication
    "A Prototype Quest Generator Based on a
    Structural Analysis of Quests from Four MMORPGs"
    J. Doran and I. Parberry,
    Proceedings of the Second International Workshop on Procedural Content
    Generation in Games, pp. 1-8, Bordeaux, France, 2011
*/

/* Usage: require in another file. parse with BNF parser such as prettybnf. */
import {Random} from '../src/random';

const RNG = Random.getRNG();
export const QuestGrammar: any = {};

const topRule =
`<QUEST> ::= <Knowledge> | <Comfort> |
 <Reputation> | <Serenity> |
 <Protection> | <Conquest> |
 <Wealth> | <Ability> | <Equipment> | <Strategy>;`;

const actorMotivationsGrammar =
`<Knowledge> ::= <Deliver_item_for_study> |
 <Spy> |
 <Interview_NPC> |
 <Use_an_item_in_the_field> ;

<Comfort> ::= <Obtain_luxuries> |
 <Kill_pests>;

<Reputation> ::= <Obtain_rare_items> |
 <Kill_enemies> |
 <Visit_a_dangerous_place>;

<Serenity> ::= <Revenge_Justice> |
 <Capture_Criminal1> |
 <Capture_Criminal2> |
 <Check_on_NPC1> |
 <Check_on_NPC2> |
 <Recover_lost_or_stolen_item> |
 <Rescue_captured_NPC>;

<Protection> ::= <Attack_threatening_entities> |
 <Treat_or_repair_1> |
 <Treat_or_repair_2> |
 <Create_Diversion_1> |
 <Create_Diversion_2> |
 <Assemble_fortification> |
 <Guard_Entity>;

<Conquest> ::= <Attack_enemy> |
 <Steal_stuff>;

<Wealth> ::= <Gather_raw_materials> |
 <Steal_valuables_for_resale> |
 <Make_valuables_for_resale>;

<Ability> ::= <Assemble_tool_for_new_skill> |
 <Obtain_training_materials> |
 <Use_existing_tools> |
 <Practice_combat> |
 <Practice_skill> |
 <Research_a_skill1> |
 <Research_a_skill2>;

<Equipment> ::= <Assemble> |
    <Deliver_supplies> |
    <Steal_supplies> |
    <Trade_for_supplies>;

<Strategy> ::= <Win_a_battle> |
    <Survive_a_battle>;`;

const grammar =
`${topRule}

${actorMotivationsGrammar}

<Deliver_item_for_study> ::= <get> <goto> "give";
<Spy> ::= <spy>;
<Interview_NPC> ::= <goto> "listen" <goto> "report";
<Use_an_item_in_the_field> ::= <get> <goto> "use" <goto> "give";

<Obtain_luxuries> ::= <get> <goto> "give";
<Kill_pests> ::= <goto> "damage" <goto> "report";

<Obtain_rare_items> ::= <get> <goto> "give";
<Kill_enemies> ::= <goto> <kill> <goto> "report";
<Visit_a_dangerous_place> ::= <goto> <goto> "report";

<Revenge_Justice> ::= <goto> "damage";
<Capture_Criminal1> ::= <get> <goto> "use" <goto> "give";
<Capture_Criminal2> ::= <get> <goto> "use" "capture" <goto> "give";
<Check_on_NPC1> ::= <goto> "listen" <goto> "report";
<Check_on_NPC2> ::= <goto> "take" <goto> "give";
<Recover_lost_or_stolen_item> ::= <get> <goto> "give";
<Rescue_captured_NPC> ::= <goto> "damage" "escort" <goto> "report";

<Attack_threatening_entities> ::=<goto> "damage" <goto> "report";
<Treat_or_repair_1> ::= <get> <goto> "use";
<Treat_or_repair_2> ::= <goto> "repair";
<Create_Diversion_1> ::= <get> <goto> "use";
<Create_Diversion_2> ::= <goto> "damage";
<Assemble_fortification> ::= <goto> "repair";
<Guard_Entity> ::= <goto> "defend";

<Attack_enemy> ::= <goto> "damage";
<Steal_stuff> ::= <goto> <steal> <goto> "give";

<Gather_raw_materials> ::= <goto> <get>;
<Steal_valuables_for_resale> ::= <goto> <steal>;
<Make_valuables_for_resale> ::= "repair";

<Assemble_tool_for_new_skill> ::="repair" "use";
<Obtain_training_materials> ::= <get> "use";
<Use_existing_tools> ::= "use";
<Practice_combat> ::= "damage";
<Practice_skill> ::= "use";
<Research_a_skill1> ::= <get> "use";
<Research_a_skill2> ::= <get> "experiment";

<Assemble> ::= "repair";
<Deliver_supplies> ::= <get> <goto> "give";
<Steal_supplies> ::= <steal>;
<Trade_for_supplies> ::= <goto> "<get>exchange";

<Win_a_battle> ::= <goto> "winbattle";
<Survive_a_battle> ::= <goto> "finishbattle";

<subquest> ::= <goto> |
    <goto> <QUEST> "<subquest>goto";

<goto> ::= "<goto>already_there" | "<goto>explore" | <learn> "<goto>goto";

<learn> ::= "<learn>already_know_it" |
    <goto> <subquest> "listen" |
    <goto> <get> "<learn>read" |
    <get> <subquest> "give" "listen";

<get> ::= "<get>already_have_it" |
    <steal> |
    <goto> "<get>gather" |
    <goto> <get> <goto> <subquest> "<get>exchange";

<steal> ::= <goto> "<steal>stealth" "<steal>take" |
    <goto> <kill> "<steal>take";

<spy> ::= <goto> "<spy>spy" <goto> "report";
<capture> ::= <get> <goto> "capture";
<kill> ::= <goto> "<kill>kill";`;

/*
Terminals:
<EMPTY>
"capture"
"damage"
"defend"
"escort"
"exchange"
"experiment"
"explore"
"gather"
"give"
"goto"
"kill"
"listen"
"read"
"repair"
"report"
"spy"
"stealth"
"take"
"use"
*/

const motiveRe = /<(\w+)>\s*::=/;

function getMotivations(text) {
    const res = [];
    const lines = text.split('\n');
    lines.forEach(line => {
        const matches = line.match(motiveRe);
        if (matches && matches.length > 1) {
            res.push(matches[1]);
        }
    });
    return res;
}

/* Used to generate randomly different weights. */
const motiveWeights = {
    Knowledge: 180,
    Comfort: 20,
    Reputation: 70,
    Serenity: 140,
    Protection: 180,
    Conquest: 200,
    Wealth: 20,
    Ability: 10,
    Equipment: 180,
    Strategy: 40
};
QuestGrammar.motiveWeights = motiveWeights;

const actorMotivations = getMotivations(actorMotivationsGrammar);

QuestGrammar.setWeight = function(motive, weight, clearOthers = false) {
    if (clearOthers) {
        // Can be used for debugging if only one type of motive is
        // being tested
        Object.keys(motiveWeights).forEach(motive => {
            motiveWeights[motive] = 0;
        });
    }
    motiveWeights[motive] = weight;
};

QuestGrammar.getRandMotive = function() {
    RNG.getWeighted(motiveWeights);
};

QuestGrammar.grammar = grammar;
QuestGrammar.actorMotivations = actorMotivations;

