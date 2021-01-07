class MessageController {
  constructor(game) {
    this.message_id = 1;
    this.game = game;
  }

  setId(value) {
    this.message_id = value;
  }

  template(data) {
    let ret = {
      "game_mode": this.game.mode ? this.game.mode : this.game.style,
      "game_id": this.game.id,
      "player_id": this.game.user.id,
      "timestamp": Date.now(),
      "message_id": this.message_id++,
    };

    ret = Object.assign({}, ret, data);

    return ret;
  }
}

class WebSocketController {
  constructor(game) {
    this.game = game;
    this.msg_ctrl = new MessageController(game);
    this.cache = [];
    this.listeners = {};

    this.wsConnect();
    this.send({"message_type": "join"});
  }

  wsConnect() {
    // In the event that our websocket points to the wrong endpoint, that
    // we don't have a websocket, or that we have a closed websocket, open a
    // new one.
    if (!this.game.ws || this.game.ws.url !== this.game.endpoint ||
          this.game.ws.readyState !== WebSocket.OPEN) {
      console.log("Generating new WebSocket connection...", this.game.ws, this.game.endpoint);
      var old = this.game.ws;

      if (old !== undefined && old !== null) {
        // Remove all listeners from the old websocket.
        for (let type in this.listeners) {
          for (let handler of this.listeners[type]) {
            old.removeEventListener(type, handler);
          }
        }

        try {
          old.close();
        } catch {
          // Do nothing.
        }
      }

      this.game.ws = new WebSocket(this.game.endpoint);

      // Re-add all listeners to the websocket.
      for (let type in this.listeners) {
        for (let handler of this.listeners[type]) {
          this.game.ws.addEventListener(type, handler);
        }
      }
    }

    // After the WebSocket was opened, attempt to flush the cache of
    // messages waiting to be sent.
    this.flushCache();
  }

  // flushCache assumes an open WebSocket.
  async flushCache() {
    if (this.cache.length === 0) {
      return;
    }

    // Number of messages successfully sent.
    var sent = 0;
    for (let message of this.cache) {
      // Check if the websocket is open. If it is, we've successfully sent it.
      let open = true;
      await this.waitOpen().catch(() => open = false);
      if (!open) {
        break;
      }

      // Send this message.
      this.game.ws.send(JSON.stringify(message));

      // Verify the socket is still open. If it isn't, we probably failed to
      // send the message.
      await this.waitOpen().catch(() => open = false);
      if (!open) {
        break;
      }

      sent += 1;
    }

    // Remove all messages we've successfully sent.
    this.cache = this.cache.slice(sent);
  }

  // Add event listeners (evs: dict mapping event to function) to the websocket.
  // Returns a cleaner function to remove all added listeners.
  wsListeners(evs) {
    let clean = () => {
      // For each of the event listeners we're later going to add, remove them
      // when we're done with everything. This lets us register a listener and
      // then "scope" its lifetime to the bounds of wsPromise() function.
      for (let ev in evs) {
        this.game.ws.removeEventListener(ev, evs[ev]);
      }
    };

    // Add our specified event listeners.
    for (let ev in evs) {
      this.game.ws.addEventListener(ev, evs[ev]);
    }

    // Return the cleaner function for others to call later.
    return clean;
  }

  // Create a new promise backed by WebSocket data. In particular, mkpromise
  // returns either a dictionary of events and their handlers or a function for
  // the message event handler. Returns a new promise that'll resolve as
  // when the handlers fire. This allows us to wait for a reply to a specific
  // message, by adding an onMessage event handler, checking if it is the right
  // message, and resolving when so.
  wsPromise(mkpromise) {
    // Create a new promise to resolve later.
    return new Promise((resolve, reject) => {
      // Whether or not we've cleaned up the event listeners we're adding later.
      var cleaned = false;

      // In the case when we already have the data we want (and this promise can)
      // be resolved synchronously, mark cleaned as true. This indicates to our
      // later code that we don't have to add the listeners in the first place,
      // much less clean up after ourselves.
      var clean = () => { cleaned = true };

      // Wrapper around resolve and reject so that we clean up after ourselves.
      var wrap = fn => (...arg) => {
        var ret = fn(...arg);
        clean();
        return ret;
      };

      // Wrap resolve and reject so we can tell if the promise completed
      // immediately.
      var yes = wrap(resolve);
      var no = wrap(reject);

      // Create a new promise using our passed-in constructor.
      var cbs = mkpromise(yes, no);

      // If this result isn't yet resolved, add a listener on our websocket. This
      // listener waits for a message and calls cbs when the message is
      // available. In the event that no error/close handlers are defined, use
      // the reject promise handler to handle this instead.
      if (!cleaned) {
        // Ergonomics: when the result from mkpromise is itself a function,
        // assume we meant to added a onMessage event listener. This lets us
        // write simpler code. :-)
        if (typeof cbs === 'function') {
          cbs = {message: cbs};
        }

        // When the promise fails and we have no other callbacks, use the wrapped
        // reject handler.
        if (!cbs.error && !cbs.close) {
          cbs.error = cbs.close = no;
        }

        // Since the promise didn't immediately resolve, add our callbacks to the
        // WebSocket. Update clean to remove our handlers once the promise
        // resolves and we find the type of event we want.
        clean = this.wsListeners(cbs);
      }
    });
  }

  // Returns a promise which will wait for the websocket to open. Resolves
  // immediately when the websocket is already open.
  waitOpen() {
    // A websocket can either be opening, open, or closing/closed. In the
    // former case, we need to register an even listener and wait for the
    // open result. In the case when we're already open, we should resolve.
    // However, in the case when the socket is actually closed, we should
    // reject instead of resolving.
    if (!this.game.ws) {
      this.wsConnect();
    }

    if (this.game.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    } else if (!this.game.ws.readyState) {
      return this.wsPromise(resolve => ({ open: resolve }));
    } else {
      this.wsConnect();
      return this.waitOpen();
    }
  }

  // Wait for a response to a particular type of message.
  waitResponse(message_id) {
    return this.wsPromise(resolve => ({ data: buf }) => {
      var data = JSON.parse(buf);
      if (data.reply_to === message_id) {
        console.log(data);
        resolve(data);
      }
    });
  }

  // Wait for a response to a particular type of message.
  waitType(message_type) {
    return this.wsPromise(resolve => ({ data: buf }) => {
      var data = JSON.parse(buf);
      if (data.message_type === message_type) {
        resolve(data);
      }
    });
  }

  // Send an object to our peer. Wait for the peer to reply with a specific
  // message destined for us.
  async sendAndWait(data) {
    await this.waitOpen();

    var wire_data = this.msg_ctrl.template(data);
    var message_id = wire_data.message_id;
    this.game.ws.send(JSON.stringify(wire_data));
    return this.waitResponse(message_id);
  }

  // Send an object to our peer but don't wait for a reply.
  async send(data) {
    await this.waitOpen();

    var wire_data = this.msg_ctrl.template(data);
    return this.game.ws.send(JSON.stringify(wire_data));
  }

  addEventListener(type, handler) {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }

    if (this.listeners[type].indexOf(handler) === -1) {
      this.listeners[type].push(handler);
    }

    if (this.game.ws) {
      this.game.ws.addEventListener(type, handler);
    }
  }

  removeEventListener(type, handler) {
    if (this.listeners[type]) {
      var index = this.listeners[type].indexOf(handler);
      if (index >= 0) {
        this.listeners[type].splice(index, 1);
      }
    }

    if (this.game.ws) {
      this.game.ws.removeEventListener(type, handler);
    }
  }

  // Notify on an incoming message of a particular type.
  onMessage(message_type, handler) {
    var event_handler = (message_event) => {
      var data = JSON.parse(message_event.data);
      if (message_type === "" || data.message_type === message_type) {
        handler(data);
      }
    };

    this.addEventListener("message", event_handler);
    return () => this.removeEventListener("message", event_handler);
  }

  close() {
    if (this.game.ws) {
      this.game.ws.close();
    }

    for (let type in this.listeners) {
      for (let handler of this.listeners[type]) {
        this.removeEventListener(type, handler);
      }
    }
  }
}

export {
  WebSocketController
};
