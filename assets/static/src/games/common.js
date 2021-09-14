import { WebSocketController } from './ws.js';

class GameController {
  constructor(game) {
    this.game = game;
    this.wsController = new WebSocketController(this.game);
  }

  async admitPlayer(player, admit, playing) {
    return await this.wsController.send({
      'message_type': 'admit',
      'target_id': +player,
      'admit': admit,
      'playing': playing,
    });
  }

  async markReady(ready) {
    return await this.wsController.send({
      'message_type': 'ready',
      'ready': ready,
    });
  }

  async bindToSpectator(spectator) {
    return await this.wsController.send({
      'message_type': 'bind-request',
      'target_id': +spectator,
    });
  }

  async unbindPeer(peer) {
    return await this.wsController.send({
      'message_type': 'unbind-request',
      'peer_id': +peer,
    });
  }

  async acceptBind(player) {
    return await this.wsController.send({
      'message_type': 'bind-accept',
      'initiator_id': +player,
    });
  }

  async startGame() {
    return await this.wsController.sendAndWait({
      'message_type': 'start',
    });
  }

  async cancelGame() {
    return await this.wsController.send({
      'message_type': 'cancel',
    });
  }

  async peek() {
    return await this.wsController.sendAndWait({
      'message_type': 'peek',
    });
  }

  onMessage(type, handler) {
    return this.wsController.onMessage(type, handler);
  }

  close() {
    this.wsController.close();
  }
}

export {
  WebSocketController,
  GameController,
};
