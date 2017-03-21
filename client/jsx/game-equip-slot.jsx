
const React = require('react');

/** Component for one equipment slot.*/
var GameEquipSlot = React.createClass({

    setEquipSelected: function(evt) {
        if (this.props.item !== null) {
            var selection = {
                slotName: this.props.slotName,
                slotNumber: this.props.slotNumber,
                item: this.props.item
            };
            this.props.setEquipSelected(selection);
        }
    },

    render: function() {
        var slotName = this.props.slotName;
        var item = this.props.item;
        var msg = "Empty";
        if (item !== null) msg = item.toString();
        return (
            <div onClick={this.setEquipSelected} className="inv-equip-slot">{slotName} {msg}</div>
        );
    }

});

module.exports = GameEquipSlot;
