class MessageController {
  constructor(game) {
    this.message_id = 1;
    this.game = game;
  }

  template(data) {
    let ret = {
      "game_mode": this.game.mode,
      "game_id": this.game.id,
      "player_id": this.game.user.id,
      "timestamp": new Date().getMilliseconds(),
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
    if (!ws.readyState) {
      return this.wsPromise(resolve => ({ open: resolve }));
    } else {
      return Promise.resolve();
    }
  }

  // Wait for a response to a particular type of message.
  waitResponse(message_id) {
    return this.wsPromise(resolve => ({ data: buf }) => {
      var data = JSON.parse(buf);
      if (data.reply_to === message_id) {
        resolve(data);
      }
    });

    // Send an object to our peer. Wait for the peer to reply with a specific
    // message destined for us.
    sendAndWait(data) {
      var wire_data = this.msg_ctrl.template(data);
      var message_id = wire_data.message_id;
      this.game.ws.send(JSON.stringify(wire_data))
      return this.waitResponse(message_id);
    }

    // Send an object to our peer but don't wait for a reply.
    send(data) {
      var wire_data = this.msg_ctl.template(data);
      return this.game.ws.send(JSON.stringify(wire_data));
    }
  }
}
