
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


const ACTIVE_BTN_CLASS = 'btn-success btn-secondary';
const DISABLED_BTN_CLASS = 'btn btn-secondary disabled';

interface IGameCraftingMenuProps {
  doInvCmd: (cmd: any) => void;
  player: SentientActor;
  handleKeyDown: (evt: any) => void;
  setInventoryMsg: (msg: any) => void;
  msgStyle: string;
  invMsg: string;
  showCraftingMenu: boolean;
  toggleScreen: (type: string) => void;
}

interface IGameCraftingMenuState {
  filter: string;
  count: string;
  selectedItem: any;
}

export default class GameCraftingMenu extends React.Component {

  public props: IGameCraftingMenuProps;
  public state: IGameCraftingMenuState;

  constructor(props: IGameCraftingMenuProps) {
    super(props);
    this.setSelectedItem = this.setSelectedItem.bind(this);
    this.state = {
        filter: 'All',
        count: '1',
        selectedItem: null,
    }
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.onChangeCount = this.onChangeCount.bind(this);
    this.craftItem = this.craftItem.bind(this);
  }

  public handleKeyDown(evt): void {
      const keyCode = KeyCode.getKeyCode(evt);
      if (keyCode === Keys.GUI.Inv) {
          this.toggleScreen('CraftingMenu');
      }
  }

  public onChangeCount(evt): void {
    const value = evt.target.value;
    this.setState({count: value});
  }

  public getCount(): number {
    const count = parseInt(this.state.count, 10);
    if (Number.isInteger(count)) {
      if (count > 0) {
        return count;
      }
    }
    return 1;
  }

  public setSelectedItem(item: ItemBase): void {
    const msg = 'Selected for crafting: ' + item.toString();
    // this.props.selectItemTop(item);
    this.props.setInventoryMsg({invMsg: msg, msgStyle: 'text-info'});
    this.setState({count: item.getCount(), selectedItem: item});
  }

  public craftItem(): void {
    if (this.state.selectedItem !== null) {
      const cmd = RG.getCraftCmd(this.state.selectedItem, this.getCount());
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
        {invMsg: 'No item selected for crafting!',
          msgStyle: 'text-danger'});
    }
  }

  public render() {
    const {player} = this.props;
    const crafter = new SentientActor('crafter');
    const container = new Container(crafter);
    const parser: Parser = ObjectShell.getParser();
    const shells = parser.filterItems(shell => !!shell.recipe);
    shells.forEach(shell => {
        const item = parser.createItem(shell.name);
        container.addItem(item);
    });

    const itemTabs = this.getItemTabs(container);
    const itemButtons = this.getItemButtons();
    const recipeRequirements = this.getRecipeReqs();

    return (
      <Modal
          aria-labelledby='crafting-modal-label'
          id='gameCraftingModal'
          large={true}
          onHide={this.toggleScreen.bind(this, 'CraftingMenu')}
          onKeyPress={this.handleKeyDown}
          show={this.props.showCraftingMenu}
      >
        <ModalHeader id='crafting-modal-label' text='Crafting Items'/>
        <div className='modal-body row'>
          <div className='col-md-6'>
            {itemTabs}
            <GameItems
              eqWeight={0}
              filter={this.state.filter}
              inv={container}
              maxWeight={-1}
              setSelectedItem={this.setSelectedItem}
            />
          </div>
          <div className='col-md-6'>
            {recipeRequirements}
          </div>
        </div>

        <div className='modal-footer row'>
          <div className='col-md-6'>
            <p className={this.props.msgStyle}>{this.props.invMsg}</p>
          </div>

          <div className='col-md-6'>
            {itemButtons}
            <button
                className='btn btn-danger'
                onClick={this.toggleScreen.bind(this, 'CraftingMenu')}
                type='button'
            >Close
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  public getItemButtons() {
    const isItemSelected = this.state.selectedItem;

    const craftButtonClass = isItemSelected
      ? ACTIVE_BTN_CLASS : DISABLED_BTN_CLASS;
    // const useButtonText = this.getUseButtonText();
    return (
      <React.Fragment>
        <button
          className={craftButtonClass}
          onClick={this.craftItem}
          type='button'
        >Craft</button>
        <label>Count:
          <input onChange={this.onChangeCount} value={this.state.count} />
        </label>
      </React.Fragment>
    );
  }

  public getItemTabs(inv: Container) {
      const types: {[key: string]: boolean} = {All: true};
      inv.getItems().forEach((item: ItemBase) => {
          types[item.getType()] = true;
      });
      const tabNames = Object.keys(types);
      const tabElems = tabNames.map(name => {
          let className = 'btn btn-secondary btn-sm';
          if (this.state.filter === name) {
              className = 'btn btn-primary btn-sm';
          }
          return (
              <button
                className={className}
                key={name}
                onClick={this.filterItems.bind(this, name)}
              >{name}</button>
          );
      });
      return (
          <ul>{tabElems}</ul>
      );
  }

  public filterItems(type: string): void {
      this.setState({filter: type});
  }

  public toggleScreen(type: string): void {
      this.props.toggleScreen(type);
  }

  public getRecipeReqs() {
    let recipeForCrafting = null;
    if (this.state.selectedItem) {
      const name = this.state.selectedItem.getName();
      const parser: Parser = ObjectShell.getParser();
      const shell = parser.dbGetItem({name});
      const inputs = shell.recipe;
      const recipeList = inputs.map(input => {
          return <li>{input.count}x {input.name}</li>
      });
      recipeForCrafting = (
        <React.Fragment>
          <p>Item: {name}</p>
          <p>Required inputs:</p>
          {recipeList}
        </React.Fragment>
      );
    }
    return (
      <div>
        <p>Selected Recipe for crafting:</p>
        {recipeForCrafting}
      </div>
    );
  }

}
