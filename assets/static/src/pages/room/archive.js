import React from 'react';

import { Helmet } from "react-helmet";

import { Button } from '@rmwc/button';
import '@rmwc/button/styles';
import * as c from '@rmwc/card';
import '@rmwc/card/styles';
import * as g from '@rmwc/grid';
import '@rmwc/grid/styles';
import * as l from '@rmwc/list';
import '@rmwc/list/styles';
import { Select } from '@rmwc/select';
import '@rmwc/select/styles';
import { Typography } from '@rmwc/typography';
import '@rmwc/typography/styles';

import { formatDistanceToNow } from 'date-fns';

import '../../App.css';

class RoomArchiveTab extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      games: null,
      game_lifecycle: "any",
    }
  }

  async componentDidMount() {
    await this.reloadArchive();
  }

  async reloadArchive() {
    var games = await this.props.user.gameSearch(this.state.game_lifecycle, this.props.room.id);
    if (games !== null && games.length === 0) {
      games = null;
    }

    this.setState(state => Object.assign({}, state, { games }));
  }

  async handleDeleteGame(game) {
    await game.delete();
    await this.reloadArchive();
  }

  async handleJoinGame(game) {
    this.props.setGame(game);
    this.props.setRoom(this.props.room);

    if (game.lifecycle === 'playing' || game.lifecycle === 'finished') {
      this.props.setPage('/room/game/' + game.id, true);
    } else {
      this.props.setPage('/room/games', true);
    }
  }

  async newState(fn, cb) {
    await this.setState(state => Object.assign({}, state, fn(state)));
    await this.reloadArchive();
  }

  inputHandler(name, checky) {
    return async (e) => {
      var v = checky ? e.target.checked : e.target.value;
      return await this.newState(() => ({ [name]: v }));
    };
  }

  render() {
    var games = null;

    if (this.state.games && !this.state.games.error) {
      var loaded_games = [];
      for (let game of this.state.games) {
        loaded_games.push(
          <l.ListItem>
            <l.ListItemText className="double-info">
              <l.ListItemPrimaryText style={{ "textAlign": "left" }}>
                <b>Game #{ game.game_id }</b>&nbsp;-&nbsp;{ game.style }&nbsp;-&nbsp;<i>{ game.lifecycle }</i>
              </l.ListItemPrimaryText>
              <l.ListItemSecondaryText>
                <span title={ game.created_at } style={{ color: "#000" }}>Created { formatDistanceToNow(new Date(game.created_at)) } ago</span>
                <span className="info-spacer"></span>
                <span title={ game.updated_at } style={{ color: "#000" }}>Updated { formatDistanceToNow(new Date(game.updated_at)) } ago</span>
              </l.ListItemSecondaryText>
            </l.ListItemText>
            <l.ListItemMeta className="double-button">
              {
                game.lifecycle !== "deleted" && game.lifecycle !== "expired"
                ? <Button theme="secondary"
                    label={ game.lifecycle !== "finished" ? "Resume" : "Afterparty" }
                    onClick={ () => this.handleJoinGame(game.game, game.room) }
                  />
                : null
              }
              {
                game.lifecycle !== "deleted" && game.lifecycle !== "finished" && game.lifecycle !== "expired"
                ? <Button theme="secondary" label="Delete"
                    onClick={ () => this.handleDeleteGame(game.game) }
                  />
                : null
              }
            </l.ListItemMeta>
          </l.ListItem>
        );
      }

          games = <div style={{ padding: '0.5rem 0rem 0.5rem 0rem' }} >
        <c.Card>
          <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
            <l.CollapsibleList handle={
                <l.SimpleListItem text={ <b>Games in room #{ this.props.room.id }</b> } metaIcon="chevron_right" />
              }
            >
              <l.List twoLine>
                { loaded_games }
              </l.List>
            </l.CollapsibleList>
          </div>
        </c.Card>
      </div>;
    } else if (this.state.game_lifecycle !== "any") {
      games = <div style={{ padding: '0.5rem 0rem 0.5rem 0rem' }} >
        <c.Card>
          <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
            <p>No games in the { this.state.game_lifecycle } lifecycle.</p>
          </div>
        </c.Card>
      </div>;
    }

    return (
      <div>
        <Helmet>
          <title>Archive</title>
        </Helmet>
        <Typography use="headline3">Archive</Typography>
        <div>
          <g.Grid fixedColumnWidth={ true }>
            <g.GridCell align="left" span={6} tablet={8}>
              <Typography use="headline4">Filter</Typography>
              <div style={{ padding: '0.5rem 0rem 0.5rem 0rem' }} >
                <c.Card>
                  <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
                    <Select label="Game Lifecycle" enhanced
                      value={ this.state.game_lifecycle }
                      onChange={ this.inputHandler("game_lifecycle") }
                      options={[
                        {
                          "label": "Any",
                          "value": "any",
                        },
                        {
                          "label": "Pending",
                          "value": "pending",
                        },
                        {
                          "label": "Playing",
                          "value": "playing",
                        },
                        {
                          "label": "Finished",
                          "value": "finished",
                        },
                        {
                          "label": "Deleted",
                          "value": "deleted",
                        },
                        {
                          "label": "Expired",
                          "value": "expired",
                        },
                      ]}
                    />
                  </div>
                </c.Card>
              </div>
            </g.GridCell>
            <g.GridCell align="right" span={6} tablet={8}>
              <Typography use="headline4">Results</Typography>
              { games }
            </g.GridCell>
          </g.Grid>
        </div>
      </div>
    );
  }
}

export { RoomArchiveTab };
