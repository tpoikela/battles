
const React = require('react');

const GameEquipSlot = require('./game-equip-slot');

/** Component which shows the equipment of the player.*/
var GameEquipment = React.createClass({

    render: function() {
        var eq = this.props.eq;
        var slots = eq.getSlotTypes();
        var equipped = [];
        var setEquip = this.props.setEquipSelected;

        // Creates the equipment slots based on whether they have items or not.
        for (var i = 0; i < slots.length; i++) {
            var item = eq.getEquipped(slots[i]);
            var items = [];
            if (item !== null) items.push(item);

            var key = i;
            if (items.length > 0) {
                for (var j = 0; j < items.length; j++) {
                    key += "," + j;
                    equipped.push(
                        <GameEquipSlot setEquipSelected={setEquip} key={key} slotName={slots[i]} slotNumber={j} item={items[j]} />
                    );
                }
            }
            else {
                equipped.push(
                    <GameEquipSlot setEquipSelected={setEquip} key={key} slotName={slots[i]} slotNumber={j} item={null} />
                );
            }
        }

        return (
            <div>
                <p>Equipment</p>
                {equipped}
            </div>
        );
    }

});

module.exports = GameEquipment;
