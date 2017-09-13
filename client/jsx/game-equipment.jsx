
import React, {Component} from 'react';
import PropTypes from 'prop-types';
import GameEquipSlot from './game-equip-slot';

/** Component which shows the equipment of the player.*/
const GameEquipment = (props) => {
  const eq = props.eq;
  const slots = eq.getSlotTypes();
  const equipped = [];
  const setEquip = props.setEquipSelected;

  let attr = '';
  if (props.isMasterEquipper) {
    attr = '(Weight reduced by 50%)';
  }

  // Creates the equipment slots based on whether they have items or not.
  for (let i = 0; i < slots.length; i++) {
    const item = eq.getEquipped(slots[i]);
    const items = [];
    if (item !== null) {items.push(item);}

    let key = i;
    if (items.length > 0) {
      for (let j = 0; j < items.length; j++) {
        key += ',' + j;
        equipped.push(
          <GameEquipSlot
            item={items[j]}
            key={key}
            setEquipSelected={setEquip}
            slotName={slots[i]}
            slotNumber={j}
          />
        );
      }
    }
    else {
      equipped.push(
        <GameEquipSlot
          item={null}
          key={key}
          setEquipSelected={setEquip}
          slotName={slots[i]}
          slotNumber={0}
        />
      );
    }
  }

  return (
    <div>
      <p>Equipment {attr}</p>
      {equipped}
    </div>
  );
}

GameEquipment.propTypes = {
  eq: PropTypes.object,
  isMasterEquipper: PropTypes.bool,
  setEquipSelected: PropTypes.func
};

export default GameEquipment;
