
import * as React from 'react';
import {GameEquipSlot, ISelection} from './game-equip-slot';

type Equipment = import('../src/equipment').Equipment;

interface IGameEquipmentProps {
  eq: Equipment;
  isMasterEquipper: boolean;
  setEquipSelected(selection: ISelection): void;
}

/* Component which shows the equipment of the player.*/
export const GameEquipment = (props: IGameEquipmentProps) => {
  const eq = props.eq;
  const slots = eq.getSlotTypes();
  const equipped: any = [];
  const setEquip = props.setEquipSelected;

  let attr = '';
  if (props.isMasterEquipper) {
    attr = '(Weight reduced by 50%)';
  }

  // Creates the equipment slots based on whether they have items or not.
  for (let i = 0; i < slots.length; i++) {
    let items = eq.getEquipped(slots[i]);
    if (items !== null && !Array.isArray(items)) {
      items = [items];
    }

    let key = '' + i;
    if (items && (items as any[]).length > 0) {
      for (let j = 0; j < (items as any[]).length; j++) {
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
};
