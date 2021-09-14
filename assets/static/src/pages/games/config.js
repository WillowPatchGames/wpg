// Library imports
import React from 'react';

import { Button } from '@rmwc/button';
import '@rmwc/button/styles';
import * as c from '@rmwc/card';
import '@rmwc/card/styles';
import * as d from '@rmwc/dialog';
import '@rmwc/dialog/styles';
import * as l from '@rmwc/list';
import '@rmwc/list/styles';
import { Select } from '@rmwc/select';
import '@rmwc/select/styles';
import { Switch } from '@rmwc/switch';
import '@rmwc/switch/styles';
import { Typography } from '@rmwc/typography';
import '@rmwc/typography/styles';
import { TextField } from '@rmwc/textfield';
import '@rmwc/textfield/styles';

// Application imports
import '../../App.css';
import { GameModel } from '../../models.js';

class CreateGameForm extends React.Component {
  constructor(props) {
    super(props);

    var have_game = this.props.game !== undefined && this.props.game !== null && this.props.game.config !== undefined && this.props.game.config !== null;
    var game = have_game ? this.props.game : undefined;
    var editable = this.props.editable === undefined || this.props.editable;

    this.state = {
      editable: editable,
      error: null,
      mode: have_game ? game.style : null,
      open: have_game ? game.open : true,
      spectators: have_game && game.spectator !== undefined ? game.spectator : true,
      initialized: false,
      GameConfig: {},
    };
  }

  async componentDidMount() {
    let GameConfig = await GameModel.LoadConfig();

    var have_game = this.props.game !== undefined && this.props.game !== null && this.props.game.config !== undefined && this.props.game.config !== null;
    var game = have_game ? this.props.game : undefined;

    this.setState(state => Object.assign(state, { GameConfig }), () => {
      if (have_game && game.style !== null) {
        this.setState(state => Object.assign(state, this.createGameConfig(game.style)));
      }
    });
  }

  createGameConfig(new_style) {
    var have_game = this.props.game !== undefined && this.props.game !== null && this.props.game.config !== undefined && this.props.game.config !== null && this.props.game.style === new_style;
    var game = have_game ? this.props.game : undefined;
    var config = have_game ? game.config : undefined;
    var have_arg = new_style !== undefined && new_style !== null;
    var have_state = this.state !== undefined && this.state !== null && this.state.mode === null && this.state.mode !== undefined;

    if (!have_game && !have_arg && !have_state) {
      return null;
    }

    if (this.state?.initialize && this.state?.mode === new_style) {
      return null;
    }

    var additional_state = {
      initialized: true,
    };

    var style = have_arg
                ? new_style
                : (
                  have_state ? this.state.mode : game.style
                );
    if (style && this.state.GameConfig[style]) {
      for (let option of this.state.GameConfig[style].options) {
        additional_state[option.name] = option.values.value(have_game ? config[option.name] : option.values.default);
      }
    } else {
      console.log("Unknown game style: " + style, game, this.state, this.props, this.state.GameConfig);
    }

    if (additional_state !== null) {
      return additional_state;
    }

    return {};
  }

  toObject() {
    var obj = {};
    for (let option of this.state.GameConfig[this.state.mode].options) {
      obj[option.name] = option.values.value(this.state[option.name]);
    }
    return obj;
  }

  async handleSubmit(event) {
    event.preventDefault();

    if (!this.state.editable) {
      return;
    }

    if (this.props.user === null || !this.props.user.authed) {
      this.setError("Need to have a user account before doing this action!");
      return;
    }

    var game = new GameModel(this.props.user);
    game.mode = this.state.mode;
    game.open = this.state.open;
    game.spectators = this.state.spectators;
    game.config = this.toObject();

    if (this.props.room !== null) {
      game.room = this.props.room;
    }

    await game.create();

    if (game.error !== null) {
      this.setError(game.error.message);
    } else {
      game = await GameModel.FromId(this.props.user, game.id);
      this.props.setGame(game);

      if (this.props.room === null) {
        this.props.setPage('/game', '?code=' + game.code);
      }

      if (this.props.callback !== undefined && this.props.callback !== null) {
        this.props.callback();
      }
    }
  }

  newState(fn, cb) {
    if (!this.state.editable) {
      return;
    }

    return this.setState(state => Object.assign({}, state, fn(state)));
  }

  inputHandler(name, checky) {
    if (name !== "mode") {
      return (e) => {
        var v = checky ? e.target.checked : e.target.value;
        return this.newState(() => ({ [name]: v }));
      };
    }

    return (e) => {
      var v = checky ? e.target.checked : e.target.value;
      return this.newState(() => ({ [name]: v, ...this.createGameConfig(v) }));
    };
  }

  toggle(name) {
    this.newState(state => ({ [name]: !state[name] }));
  }

  setError(message) {
    this.setState(state => Object.assign({}, state, { error: message }));
  }

  renderTextField(option) {
    var props = {};
    if (option.values.type === 'int') {
      if (option.values.min !== undefined) {
        props['min'] = option.values.min;
      }
      if (option.values.max !== undefined) {
        props['max'] = option.values.max;
      }
      if (option.values.step !== undefined) {
        props['step'] = option.values.step;
      }
    }

    return (
      <l.ListItem disabled>
        <TextField fullwidth
          type={ option.values.type === 'int' ? 'number' : 'text' }
          label={ option.label }
          name={ option.name }
          value={ this.state[option.name] === undefined ? " " : this.state[option.name] }
          onChange={ this.state.editable ? this.inputHandler(option.name) : null }
          disabled={ !this.state.editable }
          { ...props }
        />
      </l.ListItem>
    );
  }

  renderSwitch(option) {
    if (!option || option.values.type !== 'bool') {
      console.log(option);
      return null;
    }
    return (
      <l.ListItem
        onClick={ (e) => e.target === e.currentTarget && this.toggle(option.name) }
        disabled={ !this.state.editable }
      >
        <Switch
          label={ this.state[option.name] ? option.label.true : option.label.false }
          name={ option.name }
          checked={ this.state[option.name] === undefined ? false : this.state[option.name] }
          onChange={ () => this.toggle(option.name, true) }
          disabled={ !this.state.editable }
        />
      </l.ListItem>
    );
  }

  renderSelect(option) {
    return (
      <Select
        label={ option.label } enhanced
        value={ "" + this.state[option.name] }
        onChange={ this.inputHandler(option.name) }
        disabled={ !this.state.editable }
        options={ option.values.options }
      />
    );
  }

  renderField(option) {
    if (!option || !option.values || !option.values.type) {
      console.log("Bad option:", option);
      return null;
    }

    if (option.values.type === 'select' || option.values.type === 'enum') {
      return this.renderSelect(option);
    }

    if (option.values.type === 'bool') {
      return this.renderSwitch(option);
    }

    return this.renderTextField(option);
  }

  renderRush() {
    var pl = (num, name) => (""+num+" "+name+(+num === 1 ? "" : "s"));
    var cfg = this.state.GameConfig['rush'];
    if (!cfg) {
      return null;
    }

    return (
      <>
        <l.ListGroupSubheader>Rush Options</l.ListGroupSubheader>
        { this.renderField(cfg.options[0]) }
        { this.renderField(cfg.options[1]) }
        { this.renderField(cfg.options[2]) }
        {
          this.state.tiles_per_player
          ? <p>There will be { this.state.num_tiles } tiles per player</p>
          : <p>There will be { this.state.num_tiles } tiles overall</p>
        }
        <br />
        { this.renderField(cfg.options[3]) }
        <br/>
        {
          +this.state.frequency === 1 ?
          <p>This uses the standard frequency breakdown of US English text to create a pool of tiles. Letters such as q and z are really infrequent while vowels are more common.</p>
          : (
            +this.state.frequency === 2 ?
            <p>This uses the frequency breakdown of Bananagrams, scaled to the size of the pool.</p>
            :
            <p>This uses the frequency breakdown of Scrabble, scaled to the size of the pool.</p>
          )
        }
        <br />
        { this.renderField(cfg.options[4]) }
        { this.renderField(cfg.options[5]) }
        { this.renderField(cfg.options[6]) }
        <p>Each player will start with { pl(this.state.start_size, "tile") }. Each draw will be { pl(this.state.draw_size, "tile") }, and players who discard a tile will need to draw { this.state.discard_penalty } back.</p>
        <br/>
      </>
    );
  }

  renderSpades() {
    var cfg = this.state.GameConfig.spades;
    if (!cfg) {
      return null;
    }

    return (
      <>
        <l.ListGroupSubheader>Game Options</l.ListGroupSubheader>
        { this.renderField(cfg.options[0]) }
        <l.ListGroupSubheader>
          Trick Options
        </l.ListGroupSubheader>
        { this.renderField(cfg.options[1]) }
        {
          this.state.overtakes
          ? this.renderField(cfg.options[2])
          : null
        }
        { this.renderField(cfg.options[3]) }
        { this.renderField(cfg.options[4]) }
        { this.renderField(cfg.options[5]) }
        <l.ListGroupSubheader>
          Nil Options
        </l.ListGroupSubheader>
        { this.renderField(cfg.options[6]) }
        { this.renderField(cfg.options[7]) }
        { this.renderField(cfg.options[8]) }
        { this.renderField(cfg.options[9]) }
        { this.renderField(cfg.options[10]) }
        <l.ListGroupSubheader>
          Scoring Options
        </l.ListGroupSubheader>
        { this.renderField(cfg.options[11]) }
        { this.renderField(cfg.options[12]) }
        { this.renderField(cfg.options[13]) }
        { this.renderField(cfg.options[14]) }
        { this.renderField(cfg.options[15]) }
        <l.ListGroupSubheader>General Options</l.ListGroupSubheader>
        { this.renderField(cfg.options[16]) }
      </>
    );
  }

  renderThreeThirteen() {
    var cfg = this.state.GameConfig['three thirteen'];
    if (!cfg) {
      return null;
    }

    return (
      <>
        <l.ListGroupSubheader>Game Options</l.ListGroupSubheader>
        { this.renderField(cfg.options[0]) }
        { this.renderField(cfg.options[1]) }
        { this.renderField(cfg.options[2]) }
        <l.ListGroupSubheader>Set (Grouping) Options</l.ListGroupSubheader>
        { this.renderField(cfg.options[3]) }
        { this.renderField(cfg.options[4]) }
        { this.renderField(cfg.options[5]) }
        { this.renderField(cfg.options[6]) }
        { this.renderField(cfg.options[7]) }
        <l.ListGroupSubheader>Laying Down Options</l.ListGroupSubheader>
        { this.renderField(cfg.options[8]) }
        { this.renderField(cfg.options[9]) }
        { this.renderField(cfg.options[10]) }
        <l.ListGroupSubheader>Scoring Options</l.ListGroupSubheader>
        { this.renderField(cfg.options[11]) }
        { this.renderField(cfg.options[12]) }
        { this.renderField(cfg.options[13]) }
        <l.ListGroupSubheader>General Options</l.ListGroupSubheader>
        { this.renderField(cfg.options[14]) }
      </>
    );
  }

  renderEightJacks() {
    var cfg = this.state.GameConfig['eight jacks'];
    if (!cfg) {
      return null;
    }

    return (
      <>
        <l.ListGroupSubheader>Game Options</l.ListGroupSubheader>
        { this.renderField(cfg.options[0]) }
        { this.renderField(cfg.options[1]) }
        { this.renderField(cfg.options[2]) }
        <l.ListGroupSubheader>Board Options</l.ListGroupSubheader>
        { this.renderField(cfg.options[3]) }
        { this.renderField(cfg.options[4]) }
        { this.renderField(cfg.options[5]) }
        { this.renderField(cfg.options[6]) }
        { this.renderField(cfg.options[7]) }
        <l.ListGroupSubheader>Hand Options</l.ListGroupSubheader>
        { this.renderField(cfg.options[8]) }
        { this.renderField(cfg.options[9]) }
        <l.ListGroupSubheader>General Options</l.ListGroupSubheader>
        { this.renderField(cfg.options[10]) }
      </>
    );
  }

  renderHearts() {
    var cfg = this.state.GameConfig.hearts;
    if (!cfg) {
      return null;
    }

    return (
      <>
        <l.ListGroupSubheader>Game Options</l.ListGroupSubheader>
        { this.renderField(cfg.options[0]) }
        <l.ListGroupSubheader>Playing Options</l.ListGroupSubheader>
        { this.renderField(cfg.options[1]) }
        { this.renderField(cfg.options[2]) }
        { this.renderField(cfg.options[3]) }
        { this.renderField(cfg.options[4]) }
        { this.renderField(cfg.options[5]) }
        { this.renderField(cfg.options[6]) }
        <l.ListGroupSubheader>Scoring Options</l.ListGroupSubheader>
        { this.renderField(cfg.options[7]) }
        { this.renderField(cfg.options[8]) }
        { this.renderField(cfg.options[9]) }
        { this.renderField(cfg.options[10]) }
        { this.renderField(cfg.options[11]) }
        { this.renderField(cfg.options[12]) }
        { this.renderField(cfg.options[13]) }
        { this.renderField(cfg.options[14]) }
        { this.renderField(cfg.options[15]) }
        <l.ListGroupSubheader>General Options</l.ListGroupSubheader>
        { this.renderField(cfg.options[16]) }
      </>
    );
  }

  renderGin() {
    var cfg = this.state.GameConfig.gin;
    if (!cfg) {
      return null;
    }

    return (
      <>
        <l.ListGroupSubheader>Game Options</l.ListGroupSubheader>
        { this.renderField(cfg.options[0]) }
        <l.ListGroupSubheader>Playing Options</l.ListGroupSubheader>
        { this.renderField(cfg.options[1]) }
        { this.renderField(cfg.options[2]) }
        { this.renderField(cfg.options[3]) }
        { this.renderField(cfg.options[4]) }
        <l.ListGroupSubheader>Scoring Options</l.ListGroupSubheader>
        { this.renderField(cfg.options[5]) }
        { this.renderField(cfg.options[6]) }
        { this.renderField(cfg.options[7]) }
        { this.renderField(cfg.options[8]) }
        { this.renderField(cfg.options[9]) }
        { this.renderField(cfg.options[10]) }
        <l.ListGroupSubheader>General Options</l.ListGroupSubheader>
        { this.renderField(cfg.options[11]) }
      </>
    );
  }

  render() {
    var known_modes = [];
    for (let value of Object.keys(this.state.GameConfig)) {
      known_modes.push({
        'label': this.state.GameConfig[value].name,
        'value': value,
      });
    }

    var config = null;
    if (this.state.mode === 'rush') {
      config = this.renderRush();
    } else if (this.state.mode === 'spades') {
      config = this.renderSpades();
    } else if (this.state.mode === 'three thirteen') {
      config = this.renderThreeThirteen();
    } else if (this.state.mode === 'eight jacks') {
      config = this.renderEightJacks();
    } else if (this.state.mode === 'hearts') {
      config = this.renderHearts();
    } else if (this.state.mode === 'gin') {
      config = this.renderGin();
    } else if (this.state.mode !== null) {
      console.log("Unknown game mode: " + this.state.mode, this.state);
    }

    return (
      <c.Card>
        <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
          {
            this.props.editable === false
            ? <Typography theme="error" use="body2">This configuration is not editable.</Typography>
            : null
          }
          <form onSubmit={ this.handleSubmit.bind(this) }>
            <l.List twoLine>
              <l.ListGroup>
                <l.ListGroupSubheader>Player Options</l.ListGroupSubheader>
                <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("open") } disabled={ !this.state.editable }>
                  <Switch label="Open for anyone to join (or just those invited)" checked={ this.state.open } onChange={ () => this.toggle("open", true) } disabled={ !this.state.editable } />
                </l.ListItem>
                <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("spectators") } disabled={ !this.state.editable }>
                  <Switch label="Allow spectators" checked={ this.state.spectators } onChange={ () => this.toggle("spectators", true) } disabled={ !this.state.editable } />
                </l.ListItem>
              </l.ListGroup>
              <br />
              <br />
              <l.ListGroup>
                <l.ListGroupSubheader>Game Mode</l.ListGroupSubheader>
                <Select
                  label="Game Mode" enhanced
                  value={ this.state.mode }
                  onChange={ this.inputHandler("mode") }
                  disabled={ !this.state.editable }
                  options={ known_modes }
                />
                <br/>
                {
                  this.state.GameConfig[this.state.mode] && this.state.GameConfig[this.state.mode].description
                  ? <p> { this.state.GameConfig[this.state.mode].description } </p>
                  : null
                }
              </l.ListGroup>
              <br />
              <br />
              <l.ListGroup>
                { config }
              </l.ListGroup>
            </l.List>
            { this.state.editable ? <Button label="Create" raised disabled={ !this.state.editable || this.state.mode === null } /> : <></> }
          </form>
          <d.Dialog open={ this.state.error !== null } onClosed={() => this.setError(null) }>
            <d.DialogTitle>Error!</d.DialogTitle>
            <d.DialogContent>{ this.state.error }</d.DialogContent>
            <d.DialogActions>
              <d.DialogButton action="close" theme="secondary">OK</d.DialogButton>
            </d.DialogActions>
          </d.Dialog>
        </div>
      </c.Card>
    );
  }
}

export { CreateGameForm };
