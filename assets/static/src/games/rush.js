class RushController {
  constructor(game) {
    this.game = game;
    this.draw_id = 1;

    this.wsController = new WebSocketController(this.game);
    this.gameController = this;
  }

  async admitPlayer(player, admit) {
    return this.game.wsController.send({
      'message_type': 'admit',
      'target_id': +player,
      'admit': admit,
    });
  }

  async markReady(ready) {
    return this.game.wsController.send({
      'message_type': 'ready',
      'ready': ready,
    });
  }

  async startGame() {
    return this.game.wsController.send({
      'message_type': 'start',
    });
  }

  async drawTile() {
    return this.game.wsController.sendAndWait({
      'message_type': 'draw',
      'draw_id': this.draw_id++,
    });
  }

  async discard(tile) {
    return this.game.wsController.sendAndWait({
      'message_type': 'discard',
      'tile_id': tile.id,
    });
  }

  async recall(tile) {
    return this.game.wsController.send({
      'message_type': 'recall',
      'tile_id': tile.id,
    });
  }

  async swap(first, second) {
    return this.game.wsController.send({
      'message_type': 'swap',
      'first_id': first.id,
      'second_id': second.id,
    });
  }

  async move(tile, pos) {
    return this.game.wsController.send({
      'message_type': 'move',
      'tile_id': tile.id,
      'x': pos.x,
      'y': pos.y,
    });
  }

  async play(tile, pos) {
    return this.game.wsController.send({
      'message_type': 'play',
      'tile_id': tile.id,
      'x': pos.x,
      'y': pos.y,
    });
  }
}
