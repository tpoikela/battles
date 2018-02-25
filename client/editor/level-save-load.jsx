
import React, {Component} from 'react';
import PropTypes from 'prop-types';

const RG = require('../src/rg');
RG.Map = require('../src/map');
const FileSaver = require('file-saver');

/* Component which handles loading/saving of the levels from/to files. */
export default class LevelSaveLoad extends Component {

  constructor(props) {
    super(props);
    this.saveLevel = this.saveLevel.bind(this);
    this.loadLevel = this.loadLevel.bind(this);
  }

  /* Converts the rendered level to JSON and puts that into localStorage.*/
  saveLevel() {
    const json = this.props.objData.toJSON();
    try {
      /* eslint-disable */
      const isFileSaverSupported = !!new Blob;
      /* eslint-enable */
      if (isFileSaverSupported) {
        const date = new Date().getTime();
        const fname = `bsave_${date}_${this.props.savedObjName}.json`;

        let text = null;
        if (this.props.pretty) {
          text = JSON.stringify(json, null, ' ');
        }
        else {
          text = JSON.stringify(json);
        }
        const blob = new Blob([text],
          {type: 'text/plain;charset=utf-8'});
        FileSaver.saveAs(blob, fname);
        if (this.props.onSaveCallback) {
            this.props.onSaveCallback(json);
        }
      }
    }
    catch (e) {
      let msg = 'No Blob support in browser. Saving to localStorage.\n';
      msg += 'You can visit /level.html to view the JSON.';
      localStorage.setItem('savedLevel', JSON.stringify(json));
      this.props.setMsg({errorMsg: msg});
    }
  }

  /* Loads a user file and converts that into a level object, which will be
   * shown if the loading was successful. */
  loadLevel() {
    const fileList = document.querySelector('#level-file-input').files;

    const file = fileList[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const text = reader.result;

        try {
          // Many things can go wrong: Not JSON, not a valid level..
          const json = JSON.parse(text);
          if (this.props.onLoadCallback) {
              this.props.onLoadCallback(json);
          }
        }
        catch (e) {
          const msg = 'File: Not valid JSON or level: ' + e.message;
          console.log(e);
          this.props.setMsg({errorMsg: msg});
        }
      };
      reader.onerror = (e) => {
        const msg = 'Filereader error: ' + e;
        this.props.setMsg({errorMsg: msg});
      };

      reader.readAsText(file);
    }
    else {
      const msg = 'Could not get the file.';
      this.props.setMsg({errorMsg: msg});
    }
  }

    render() {
      return (
        <span>
          <button
            id='btn-save-level'
            onClick={this.saveLevel}
          >Save</button>
          <input
            id='level-file-input'
            onChange={this.loadLevel}
            type='file'
          />
        </span>
      );
    }
}

LevelSaveLoad.propTypes = {
  onLoadCallback: PropTypes.func,
  objData: PropTypes.object,
  onSaveCallback: PropTypes.func,
  pretty: PropTypes.bool,
  savedObjName: PropTypes.string,
  setMsg: PropTypes.func

};
