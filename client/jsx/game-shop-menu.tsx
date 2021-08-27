
import * as React from 'react';
import Modal from 'react-bootstrap-modal';
import ModalHeader from './modal-header';
import {Container} from '../src/item';
import {ObjectShell, Parser} from '../src/objectshellparser';
import {GameItems} from './game-items';

import RG from '../src/rg';
import {KeyCode} from '../gui/keycode';
import {ItemBase} from '../src/item';
import {Keys} from '../src/keymap';
import {SentientActor} from '../src/actor';
import {TCoord} from '../src/interfaces';


const ACTIVE_BTN_CLASS = 'btn-success btn-secondary';
const DISABLED_BTN_CLASS = 'btn btn-secondary disabled';

interface IGameShopMenuProps {
  doInvCmd: (cmd: any) => void;
  player: SentientActor;
  handleKeyDown: (evt: any) => void;
  setInventoryMsg: (msg: any) => void;
  msgStyle: string;
  invMsg: string;
  showShopMenu: boolean;
  toggleScreen: (type: string) => void;
}

interface IGameShopMenuState {
  filterSell: string;
  filterBuy: string;
  countBuy: string;
  countSell: string;
  itemsToSell: ItemBase[];
  itemsToBuy: ItemBase[];
}

export default class GameShopMenu extends React.Component {

  public props: IGameShopMenuProps;
  public state: IGameShopMenuState;

  constructor(props: IGameShopMenuProps) {
    super(props);
    this.setSelectedItemBuy = this.setSelectedItemBuy.bind(this);
    this.setSelectedItemSell = this.setSelectedItemSell.bind(this);
    this.state = {
        filterSell: 'All',
        filterBuy: 'All',
        countBuy: '1',
        countSell: '1',
        itemsToSell: [],
        itemsToBuy: [],
    }
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.onChangeCountBuy = this.onChangeCountBuy.bind(this);
    this.onChangeCountSell = this.onChangeCountSell.bind(this);
    this.buyItem = this.buyItem.bind(this);
    this.sellItem = this.sellItem.bind(this);
  }

  public handleKeyDown(evt): void {
      const keyCode = KeyCode.getKeyCode(evt);
      if (keyCode === Keys.GUI.Inv) {
          this.toggleScreen('ShopMenu');
      }
      else if (Keys.KeyMap.isConfirmYes(keyCode)) {
          // Delegate to parent
          this.props.handleKeyDown(evt);
      }
  }

  public onChangeCountBuy(evt): void {
    const value = evt.target.value;
    this.setState({countBuy: value});
  }

  public onChangeCountSell(evt): void {
    const value = evt.target.value;
    this.setState({countSell: value});
  }

  public getCountBuy(): number {
    const count = parseInt(this.state.countBuy, 10);
    if (Number.isInteger(count)) {
      if (count > 0) {
        return count;
      }
    }
    return 1;
  }

  public getCountSell(): number {
    const count = parseInt(this.state.countSell, 10);
    if (Number.isInteger(count)) {
      if (count > 0) {
        return count;
      }
    }
    return 1;
  }


  public setSelectedItemBuy(item: ItemBase): void {
    const price = this.getItemPrice(item, 'Buy');
    const msg = 'Selected for buying: ' + item.toString() + ' ' + price;
    // this.props.selectItemTop(item);
    this.props.setInventoryMsg({invMsg: msg, msgStyle: 'text-info'});
    // const boughtItems = this.state.itemsToBuy;
    const itemsToBuy = [item];
    this.setState({itemsToBuy});
  }

  public setSelectedItemSell(item: ItemBase): void {
    const price = this.getItemPrice(item, 'Sell');
    const msg = 'Selected for selling: ' + item.toString() + ' ' + price;
    // this.props.selectItemTop(item);
    this.props.setInventoryMsg({invMsg: msg, msgStyle: 'text-info'});
    // const soldItems = this.state.itemsToSell;
    // soldItems.push(item);
    const itemsToSell = [item];
    this.setState({itemsToSell});
  }

  public buyItem(): void {
    if (this.state.itemsToBuy.length > 0) {
      const items = this.state.itemsToBuy;
      const cmd = RG.getBuyCmd(items, this.getCountBuy());
      cmd.callback = (obj: any): void => {
        let msgStyle = 'text-success';
        if (!obj.result) {
          msgStyle = 'text-danger';
        }
        this.props.setInventoryMsg(
          {invMsg: obj.msg, msgStyle});
      };
      this.props.doInvCmd(cmd);
    }
    else {
      this.props.setInventoryMsg(
        {invMsg: 'No any items selected for buying!',
          msgStyle: 'text-danger'});
    }
  }

  public sellItem(): void {
    if (this.state.itemsToSell.length > 0) {
      const item = this.state.itemsToSell[0];
      const cmd = RG.getDropCmd(item, this.getCountSell());
      cmd.callback = (obj: any): void => {
        let msgStyle = 'text-success';
        if (!obj.result) {
          msgStyle = 'text-danger';
        }
        this.props.setInventoryMsg(
          {invMsg: obj.msg, msgStyle});
      };
      this.props.doInvCmd(cmd);
      this.setState({itemsToSell: []});
    }
    else {
      this.props.setInventoryMsg(
        {invMsg: 'No any items selected for selling!',
          msgStyle: 'text-danger'});
    }
  }

  public render() {
    const {player} = this.props;
    if (!player) {return;}
    const shopElem = player.getCell()!.getShop();
    let shopItems = [];
    if (shopElem) {
      shopItems = this.getShopItems(shopElem);
    }

    let modalText = 'Welcome! You have entered shop of ';
    modalText += shopElem.getShopkeeper()!.getName();

    const playerInv = player.getInvEq().getInventory();
    const itemTabs = this.getItemTabs(shopItems, 'Buy');
    const itemTabsPlayer = this.getItemTabs(playerInv.getItems(), 'Sell');
    const itemButtons = this.getItemButtons();

    let goldCount = null;
    const goldItems = player.getInvEq().getItemsNamed('Gold coin');
    if (goldItems.length === 0) {
      goldCount = <span>Gold: 0</span>;
    }
    else {
      goldCount = <span>Gold: ${goldItems[0].getCount()}</span>;
    }

    return (
      <Modal
          aria-labelledby='shop-modal-label'
          id='gameShopModal'
          large={true}
          onHide={this.toggleScreen.bind(this, 'ShopMenu')}
          onKeyPress={this.handleKeyDown}
          show={this.props.showShopMenu}
      >
        <ModalHeader id='shop-modal-label' text={modalText}/>
        <div className='modal-body row'>
          <div className='col-md-6'>
            {itemTabsPlayer}
            <GameItems
              eqWeight={0}
              filter={this.state.filterSell}
              inv={playerInv}
              maxWeight={-1}
              setSelectedItem={this.setSelectedItemSell}
            />
          </div>
          <div className='col-md-6'>
              {itemTabs}
              <GameItems
                eqWeight={0}
                filter={this.state.filterBuy}
                inv={shopItems}
                maxWeight={-1}
                setSelectedItem={this.setSelectedItemBuy}
              />
          </div>
        </div>

        <div className='modal-footer'>
          <div className='row'>
            <p className={this.props.msgStyle}>{this.props.invMsg}</p>
          </div>

          <div className='row'>
            {goldCount}
            {itemButtons}
            <button
                className='btn btn-danger'
                onClick={this.toggleScreen.bind(this, 'ShopMenu')}
                type='button'
            >Close
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  public getItemButtons() {
    const isItemSelectedBuy = this.state.itemsToBuy.length > 0;
    const isItemSelectedSell = this.state.itemsToSell.length > 0;

    const buyButtonClass = isItemSelectedBuy
      ? ACTIVE_BTN_CLASS : DISABLED_BTN_CLASS;
    const sellButtonClass = isItemSelectedSell
      ? ACTIVE_BTN_CLASS : DISABLED_BTN_CLASS;
    // const useButtonText = this.getUseButtonText();
    return (
      <React.Fragment>
        <button
          className={sellButtonClass}
          onClick={this.sellItem}
          type='button'
        >Sell</button>
        <label>Sell Count:
          <input onChange={this.onChangeCountSell} value={this.state.countSell} />
        </label>
        <button
          className={buyButtonClass}
          onClick={this.buyItem}
          type='button'
        >Buy</button>
        <label>Buy Count:
          <input onChange={this.onChangeCountBuy} value={this.state.countBuy} />
        </label>
      </React.Fragment>
    );
  }

  public getItemTabs(inv: any, buySell: string) {
      const types: {[key: string]: boolean} = {All: true};
      inv.forEach((item: ItemBase) => {
          types[item.getType()] = true;
      });
      const filtName = 'filter' + buySell;
      const filtFuncName = 'filterItems' + buySell;
      const tabNames = Object.keys(types);
      const tabElems = tabNames.map(name => {
          let className = 'btn btn-secondary btn-sm';
          if ((this.state as any)[filtName] === name) {
              className = 'btn btn-primary btn-sm';
          }
          return (
              <button
                className={className}
                key={name}
                onClick={(this as any)[filtFuncName].bind(this, name)}
              >{name}</button>
          );
      });
      return (
          <ul>{tabElems}</ul>
      );
  }

  public filterItemsBuy(type: string): void {
      this.setState({filterBuy: type});
  }

  public filterItemsSell(type: string): void {
      this.setState({filterSell: type});
  }

  public toggleScreen(type: string): void {
      this.props.toggleScreen(type);
  }

  public getShopItems(shopElem): ItemBase[] {
    const res: ItemBase[] = [];
    const keeper = shopElem.getShopkeeper();
    const shopComp = keeper.get('Shopkeeper');
    const coord: TCoord[] = shopComp.getCoord();
    const map = keeper.getLevel().getMap();

    coord.forEach((xy: TCoord) => {
      const cell = map.getCell(xy[0], xy[1]);
      const cellItems = cell.getItems();
      if (cellItems) {
        cellItems.forEach(cellItem => {
          if (cellItem.has('Unpaid')) {
            res.push(cellItem);
          }
        });
      }
    });
    return res;
  }


  public getItemPrice(item, buyOrSell): string {
    const level = this.props.player.getLevel();
    const [x, y] = item.getXY();
    const cell = level.getMap().getCell(x, y);
    const shopElem = cell.getShop();
    const count = buyOrSell === 'Buy' ? this.getCountBuy() :
      this.getCountSell();
    if (shopElem) {
      if (buyOrSell === 'Buy') {
        const price = shopElem.getItemPriceForBuying(item);
        return price + ' gold coins';
      }
      else {
        const price = shopElem.getItemPriceForSelling(item, count);
        return price + ' gold coins';
      }
    }
    return 'No price found';
  }

}
