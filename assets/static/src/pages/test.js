// Library imports
import React from 'react';

import '@rmwc/button/styles';
import '@rmwc/checkbox/styles';
import '@rmwc/select/styles';
import '@rmwc/typography/styles';
import '@rmwc/textfield/styles';

import { Button } from '@rmwc/button';
import { Checkbox } from '@rmwc/checkbox';
import { Select } from '@rmwc/select';
import { TextField } from '@rmwc/textfield';

// Application imports
import '../App.css';
import { ws } from '../models.js';
import { WebSocketController } from '../games/common.js';

//var StringSchema = {};
var NumberSchema = {
  "type": "number",
};
var BooleanSchema = {
  "type": "checkbox",
  "component": Checkbox,
};

var schemas = {
  "rush": {
    "play": {
      "tile_id": NumberSchema,
      "x": NumberSchema,
      "y": NumberSchema,
    },
  },
  "spades": {
    "play": {
      "card_id": NumberSchema,
    },
    "bid": {
      "bid": NumberSchema,
    },
    "decide": {
      "keep": BooleanSchema,
    },
  }
};

function MakeSchemas(mode) {
  var schema = schemas[mode];
  if (!schema) return { renders: {}, refs: {}, gets: {} };
  var refs = {};
  var renders = {};
  var gets = {};
  var getter = type => () => {
    var r = {};
    for (let prop in schema[type]) {
      var el = refs[type][prop].current;
      r[prop] = el.value;
      if (r[prop] === "") delete r[prop];
      if (el.type === 'number' && r[prop] !== undefined) {
        r[prop] = +r[prop];
      } else if (el.type === 'checkbox') {
        r[prop] = el.checked;
      }
    }
    return r;
  };
  for (let type in schema) {
    refs[type] = {};
    renders[type] = [];
    gets[type] = getter(type);
    for (let prop in schema[type]) {
      var ref = refs[type][prop] = React.createRef();
      renders[type].push(((type,prop,ref) => {
        var Comp = schema[type][prop].component || TextField;
        return <Comp key={ prop } label={ prop }
          inputRef={ ref }
          {... schema[type][prop] }
        />
      })(type,prop,ref));
    }
  }
  return {
    renders,
    refs,
    gets,
  };
}

class TestGamePage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {status:"",messages:[],mode:'spades',compose:"",state:{}};
    this.schema = MakeSchemas();
  }
  render() {
    var open = this.state.wsController;
    function message(v) {
      var textAlign = v.sent ? "right" : "left";
      var message_info = "";
      var color = undefined;
      switch (v.data.message_type) {
        case "error":
          color = "red"; message_info = v.data.error;
          break;
        case "admitted":
          message_info = v.data.admitted;
          break;
        case "state":
          color = "darkmagenta";
          break;
        default:
          if (v.data.error) {
            color = "red"; message_info = v.data.error;
          }
          break;
      }
      if (message_info !== "") message_info = ": " + message_info;
      return (
        <>
          <details style={{ textAlign }}>
            <summary style={{ textAlign, outline: "none" }}>
              <h4 style={{ textAlign, color, margin: "0", display: "inline" }}>{ v.data.message_type }{ message_info }</h4>
            </summary>
            <pre style={{
                textAlign: "left",
                marginLeft: v.sent ? "auto" : "0",
                marginRight: v.sent ? "0" : "auto",
                width: "fit-content",
              }}>{JSON.stringify(v.data, null, 2)}</pre>
          </details>
        </>
      )
    }
    if (!open) {
      var n = Number(this.state.compose);
      var compose_valid = !isNaN(n) ? "" : "Please enter a numeric game id";
    } else {
      var is_json = this.state.compose !== "" && !/^\w+$/.test(this.state.compose);
      if (is_json) {
        compose_valid = "";
        try {
          JSON.parse(this.state.compose)
        } catch(e) {
          compose_valid += e;
        }
      } else {
        compose_valid = "";
      }
    }
    return (<>
      <details key="details" style={{ maxHeight: "30vh", overflow: "auto" }}>
        <summary style={{ outline: "none" }}>Details</summary>
        <h2>Props</h2>
        <pre style={{ textAlign: "left", whiteSpace: "pre" }}>{JSON.stringify(this.props, null, 2)}</pre>
        <h2>State</h2>
        <pre style={{ textAlign: "left", whiteSpace: "pre" }}>{JSON.stringify(this.state, null, 2)}</pre>
      </details>
      <Select label="Game Mode" options={['rush','spades']} disabled={ open }
        value={ this.state.mode }
        onChange={ e => {var v = e.target.value; this.setState(state => {state.mode = v; return state}) }} />
      <div key="body" style={{ display: "flex", justifyContent: "space-between" }}>
        <ol key="messages" style={{ margin: "0", flexGrow: 1, maxHeight: "70vh", overflow: "auto" }}>
          {this.state.messages.map((v,k) => <li key={k}><div style={{
            backgroundColor: "lightblue",
            borderRadius: "10px",
            padding: "6px",
            margin: "12px 2px",
            width: "fit-content",
            marginLeft: v.sent ? "auto" : "2px",
            marginRight: v.sent ? "2px" : "auto",
          }}>{ message(v) }</div></li>)}
        </ol>
        <div key="state" style={{
            width: "fit-content", maxWidth: "30%",
            maxHeight: "70vh", overflow: "auto",
            padding: "5px", flexGrow: 0,
            display: "flex", flexDirection: "column-reverse",
            backgroundColor: "rebeccapurple", color: "white",
            borderBottomLeftRadius: "5px",
          }}>
          <pre style={{ textAlign: "left", whiteSpace: "pre" }}>{JSON.stringify(this.state.state, null, 2)}</pre>
        </div>
      </div>
      <form key="open-send" style={{ display: "flex", alignItems: "baseline" }} onSubmit={ e => {e.preventDefault(); open ? this.send(e) : this.open(e)} }>
        <div style={{ flexGrow: 1 }}>
          <TextField fullwidth
            value={ this.state.compose } invalid={ compose_valid !== "" }
            label={ compose_valid || (open ? "Message" : "Game ID") }
            onChange={ e => {var v = e.target.value; this.setState(state => {state.compose = v; return state}) }} />
          <div className="fields" style={{ textAlign: "left" }}>
            { this.schema.renders[this.state.compose] || [] }
          </div>
        </div>
        <Button label={ open ? "Send" : "Open" } type="submit" unelevated ripple={false} disabled={ compose_valid !== "" } />
      </form>
    </>);
  }
  open() {
    var id = +this.state.compose;
    var mode = this.state.mode;
    var game = {
      user: this.props.user,
      id: +id,
      mode: mode,
      endpoint: ws() + "//" + document.location.host + "/api/v1/game/" + id + "/ws?user_id=" + this.props.user.id + '&api_token=' + this.props.user.token,
    };
    var wsController = new WebSocketController(game);
    wsController.addEventListener("message", this.receive.bind(this));
    this.schema = MakeSchemas(mode);
    this.setState(state => {
      state.game = game;
      state.wsController = wsController;
      state.compose = "";
      state.messages.push({ sent: true, data: { message_type: "join" }});
      return state;
    });
  }
  send() {
    var message = this.state.compose;
    try {
      message = JSON.parse(message);
      if (typeof message !== 'object') {
        message = { message_type: message };
      }
    } catch(e) {
      message = { message_type: message };
    }
    message = Object.assign((this.schema.gets[this.state.compose] || (() => ({})))(), message);
    this.state.wsController.send(message);
    this.setState(state => {
      state.messages.push({ sent: true, data: message });
      return state;
    });
  }
  receive(e) {
    this.setState(state => {
      var data = JSON.parse(e.data);
      state.messages.push({ sent: false, data: data, timestamp: e.timeStamp });
      if (data.message_type === "state") {
        state.state = data;
      } else if (data.message_type === "countdown") {
        var resp = {
          message_type: "countback",
          value: data.value,
        };
        state.messages.push({ sent: true, data: resp });
        this.state.wsController.send(resp);
      }
      return state;
    });
  }
}

export {
  TestGamePage,
}
