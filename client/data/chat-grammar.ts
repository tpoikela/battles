/* Contains the grammar to generate some texts for in-game chats. */

export const Grammars: any = {};

const questChatGrammar = `
<Deliver_item_for_study> ::= "Could you deliver an item to someone?";
<Spy> ::= "I would need to you to spy on someone";
<Interview_NPC> ::= "I would need some information to be obtained and
delivered";

<Use_an_item_in_the_field> ::=
"I would need someone to get a tool and use it";

<Obtain_luxuries> ::= "Could you get some luxuries for me?";
<Kill_pests> ::= "There are some pests which would have to be removed.";

<Obtain_rare_items> ::=
"Some rare items would have to be obtained and delivered";
<Kill_enemies> ::=
"Someone should be silenced for good.";
<Visit_a_dangerous_place> ::=
"Could you take a look at a place for me?";

<Revenge_Justice> ::=
    "Injustice has been done, and this should be handled.";
<Capture_Criminal1> ::=
    "Could you capture a criminal and bring them to justice?";
<Capture_Criminal2> ::=
    "Could you capture a criminal and bring them to justice?";
<Check_on_NPC1> ::=
    "Could you deliver some information?";
<Check_on_NPC2> ::=
    "Could you take an item to someone?";
<Recover_lost_or_stolen_item> ::=
    "Could you recover something I have misplaced?";
<Rescue_captured_NPC> ::=
    "Someone has been taken as captive and must be rescued.";

<Attack_threatening_entities> ::= <goto> "damage" <goto> "report";
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
`;
Grammars.questChat = questChatGrammar;
