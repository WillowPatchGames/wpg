var GameConfig = {
  'rush': {
    "description": "In Rush, when one player draws a tile, all players must draw tiles and catch up – first to finish their board when there are no more tiles left wins!",
    "name": 'Rush (Fast-Paced Word Game)',
    'options': [
      {
        'name': 'num_players',
        'values': {
          'type': 'int', 'min': 2, 'max': 15, 'step': 1, 'default': 5, 'value': (x) => +x,
        },
        "label": "Number of players",
      },
      {
        'name': 'num_tiles',
        'values': {
          'type': 'int', 'min': 10, 'max': 200, 'step': 1, 'default': 75, 'value': (x) => +x,
        },
        "label": "Number of tiles",
      },
      {
        "name": 'tiles_per_player',
        "values": {
          'type': 'bool', 'default': false, 'value': (x) => x,
        },
        "label": {
          "true": "Tiles per Player",
          "false": "Total number of tiles",
        },
      },
      {
        "name": 'frequency',
        "values": {
          'type': 'select',
          'options': [
            {
              "label": 'Standard US English Letter Frequencies',
              "value": '1',
            },
            {
              "label": 'Bananagrams Tile Frequency',
              "value": '2',
            },
            {
              "label": 'Scrabble Tile Frequency',
              "value": '3',
            },
          ],
          'default': 1,
          'value': (x) => +x,
        },
        "label": "Tile frequency",
      },
      {
        "name": 'start_size',
        "values": {
          'type': 'int', 'min': 7, 'max': 25, 'step': 1, 'default': 12, 'value': (x) => +x,
        },
        "label": "Player tile start size",
      },
      {
        "name": 'draw_size',
        "values": {
          'type': 'int', 'min': 1, 'max': 10, 'step': 1, 'default': 1, 'value': (x) => +x,
        },
        "label": "Player tile draw size",
      },
      {
        "name": 'discard_penalty',
        "values": {
          'type': 'int', 'min': 1, 'max': 5, 'step': 1, 'default': 3, 'value': (x) => +x,
        },
        "label": "Player tile discard penalty",
      },
    ],
  },
  'spades': {
    "description": "In Spades, players bid how many tricks they will take. If they make their bid, they get more points. First to a set amount wins!",
    "name": 'Spades (Card Game)',
    "options": [
      {
        'name': 'num_players',
        'values': {
          'type': 'int', 'min': 2, 'max': 6, 'step': 1, 'default': 4, 'value': (x) => +x,
        },
        "label": "Number of players",
      },
      {
        "name": 'overtakes',
        "values": {
          'type': 'bool', 'default': true, 'value': (x) => x,
        },
        "label": {
          "true": "Overtakes counted",
          "false": "No overtakes",
        },
      },
      {
        'name': 'overtake_limit',
        'values': {
          'type': 'int', 'min': 2, 'max': 15, 'step': 1, 'default': 10, 'value': (x) => +x,
        },
        "label": "Overtake penalty limit",
      },
      {
        "name": 'must_break_spades',
        "values": {
          'type': 'bool', 'default': true, 'value': (x) => x,
        },
        "label": {
          "true": "Must wait for spades to be sluffed before leading spades",
          "false": "Can play spades at any time",
        },
      },
      {
        "name": 'add_jokers',
        "values": {
          'type': 'bool', 'default': false, 'value': (x) => x,
        },
        "label": {
          "true": "Add jokers for three or six players",
          "false": "Leave jokers out",
        },
      },
      {
        "name": 'first_wins',
        "values": {
          'type': 'bool', 'default': true, 'value': (x) => x,
        },
        "label": {
          "true": "First highest played card wins (six players only)",
          "false": "Last highest played card wins (six players only)",
        },
      },
      {
        "name": 'with_nil',
        "values": {
          'type': 'bool', 'default': true, 'value': (x) => x,
        },
        "label": {
          "true": "Allow nil bids",
          "false": "Forbid nil and zero bids",
        },
      },
      {
        "name": 'overtakes_nil',
        "values": {
          'type': 'bool', 'default': false, 'value': (x) => x,
        },
        "label": {
          "true": "Score overtakes with nil",
          "false": "Ignore overtakes with nil bids",
        },
      },
      {
        "name": 'blind_bidding',
        "values": {
          'type': 'bool', 'default': true, 'value': (x) => x,
        },
        "label": {
          "true": "Enable blind bidding",
          "false": "Always peek at cards before bidding",
        },
      },
      {
        "name": 'with_double_nil',
        "values": {
          'type': 'bool', 'default': true, 'value': (x) => x,
        },
        "label": {
          "true": "Require both partners make nil if both bid nil (double nil)",
          "false": "Score partners bidding nil separately",
        },
      },
      {
        "name": 'with_break_bonus',
        "values": {
          'type': 'bool', 'default': false, 'value': (x) => x,
        },
        "label": {
          "true": "Give a bonus for breaking both partners in double nil",
          "false": "No bonus for breaking both partners nil bids",
        },
      },
      {
        'name': 'win_amount',
        'values': {
          'type': 'int', 'min': 50, 'max': 1000, 'step': 1, 'default': 500, 'value': (x) => +x,
        },
        "label": "Winning point threshold",
      },
      {
        "name": 'overtake_penalty',
        "values": {
          'type': 'select',
          'options': [
            {
              "label": '50 Points',
              "value": '50',
            },
            {
              "label": '100 Points',
              "value": '100',
            },
            {
              "label": '150 Points',
              "value": '150',
            },
            {
              "label": '200 Points',
              "value": '200',
            },
          ],
          'default': '100',
          'value': (x) => +x,
        },
        "label": "Overtake penalty",
      },
      {
        "name": 'trick_multiplier',
        "values": {
          'type': 'select',
          'options': [
            {
              "label": '5x',
              "value": '5',
            },
            {
              "label": '10x',
              "value": '10',
            },
          ],
          'default': '10',
          'value': (x) => +x,
        },
        "label": "Trick multiplier",
      },
      {
        "name": 'perfect_round',
        "values": {
          'type': 'bool', 'default': false, 'value': (x) => x,
        },
        "label": {
          "true": "Score half of winning amount for a perfect round (Moon or Boston)",
          "false": "Score no additional points for a perfect round",
        },
      },
      {
        "name": 'nil_score',
        "values": {
          'type': 'select',
          'options': [
            {
              "label": '50 Points',
              "value": '50',
            },
            {
              "label": '75 Points',
              "value": '75',
            },
            {
              "label": '100 Points',
              "value": '100',
            },
            {
              "label": '125 Points',
              "value": '125',
            },
            {
              "label": '150 Points',
              "value": '150',
            },
            {
              "label": '200 Points',
              "value": '200',
            },
          ],
          'default': '100',
          'value': (x) => +x,
        },
        "label": "Single nil score",
      },
    ],
  },
  'hearts': {
    "description": "In Hearts, players pass cards and avoid taking tricks with Hearts or the Queen of Spades. Be careful though: let someone get all the points and they'll shoot the moon!",
    "name": 'Hearts (Card Game)',
    "options": [
      {
        'name': 'num_players',
        'values': {
          'type': 'int', 'min': 3, 'max': 7, 'step': 1, 'default': 4, 'value': (x) => +x,
        },
        "label": "Number of players",
      },
      {
        'name': 'number_to_pass',
        'values': {
          'type': 'int', 'min': 1, 'max': 8, 'step': 1, 'default': 3, 'value': (x) => +x,
        },
        "label": "Number of cards to pass",
      },
      {
        "name": 'hold_round',
        "values": {
          'type': 'bool', 'default': true, 'value': (x) => x,
        },
        "label": {
          "true": "Pass left, right, then hold (non-four players only)",
          "false": "Only pass left and then right (non-four players only)",
        },
      },
      {
        "name": 'must_break_hearts',
        "values": {
          'type': 'bool', 'default': true, 'value': (x) => x,
        },
        "label": {
          "true": "Hearts must be broken before being lead",
          "false": "Can lead Hearts at any time",
        },
      },
      {
        "name": 'black_widow_breaks',
        "values": {
          'type': 'bool', 'default': false, 'value': (x) => x,
        },
        "label": {
          "true": "Black Widow (Queen of Spades) breaks Hearts",
          "false": "Black Widow (Queen of Spades) doesn't break Hearts",
        },
      },
      {
        "name": 'first_trick_hearts',
        "values": {
          'type': 'bool', 'default': false, 'value': (x) => x,
        },
        "label": {
          "true": "Can sluff points on the first trick",
          "false": "Can't play points on the first trick",
        },
      },
      {
        "name": 'with_crib',
        "values": {
          'type': 'bool', 'default': false, 'value': (x) => x,
        },
        "label": {
          "true": "Put extra cards in a crib (taken with the first trick)",
          "false": "Remove cards to deal evenly",
        },
      },
      {
        'name': 'win_amount',
        'values': {
          'type': 'int', 'min': 50, 'max': 250, 'step': 1, 'default': 100, 'value': (x) => +x,
        },
        "label": "Ending amount",
      },
      {
        "name": 'shoot_moon_reduces',
        "values": {
          'type': 'bool', 'default': false, 'value': (x) => x,
        },
        "label": {
          "true": "Shooting the Moon reduces your score",
          "false": "Shooting the Moon raises everyone elses' scores",
        },
      },
      {
        "name": 'shoot_the_sun',
        "values": {
          'type': 'bool', 'default': true, 'value': (x) => x,
        },
        "label": {
          "true": "Score double for Shooting the Sun (taking all tricks)",
          "false": "No bonus for taking all tricks",
        },
      },
      {
        "name": 'jack_of_dimaonds',
        "values": {
          'type': 'bool', 'default': false, 'value': (x) => x,
        },
        "label": {
          "true": "Taking the Jack of Diamonds reduces your score by 11",
          "false": "No bonus for taking the Jack of Diamonds",
        },
      },
      {
        "name": 'ten_of_clubs',
        "values": {
          'type': 'bool', 'default': false, 'value': (x) => x,
        },
        "label": {
          "true": "Taking the Ten of Clubs doubles your score for the round",
          "false": "No penalty for taking the Ten of Clubs",
        },
      },
      {
        "name": 'black_widow_for_five',
        "values": {
          'type': 'bool', 'default': false, 'value': (x) => x,
        },
        "label": {
          "true": "Black Widow (Queen of Spades) counts as 5",
          "false": "Black WIdow (Queen of Spades) counts as 13",
        },
      },
      {
        "name": 'ace_of_hearts',
        "values": {
          'type': 'bool', 'default': false, 'value': (x) => x,
        },
        "label": {
          "true": "Ace of Hearts counts as 5",
          "false": "Ace of Hearts counts as 1",
        },
      },
      {
        "name": 'no_trick_bonus',
        "values": {
          'type': 'bool', 'default': false, 'value': (x) => x,
        },
        "label": {
          "true": "Taking no tricks reduces your score by 5",
          "false": "No bonus for taking no tricks",
        },
      },
      {
        "name": 'hundred_to_half',
        "values": {
          'type': 'bool', 'default': false, 'value': (x) => x,
        },
        "label": {
          "true": "Exactly hitting the ending amount halves your score",
          "false": "No prize for hitting the ending amount exactly",
        },
      },
    ],
  },
  'eight jacks': {
    "description": "In Eight Jacks, players compete to create runs of cards on the board. Runs can be diagonal, left or right, or up and down. Watch those jacks and jokers carefully!",
    "name": 'Eight Jacks (Card Game)',
    "options": [
      {
        'name': 'num_players',
        'values': {
          'type': 'int', 'min': 2, 'max': 8, 'step': 1, 'default': 4, 'value': (x) => +x,
        },
        "label": "Number of players",
      },
      {
        'name': 'run_length',
        'values': {
          'type': 'int', 'min': 3, 'max': 6, 'step': 1, 'default': 4, 'value': (x) => +x,
        },
        "label": "Run length",
      },
      {
        'name': 'win_limit',
        'values': {
          'type': 'int', 'min': 1, 'max': 5, 'step': 1, 'default': 2, 'value': (x) => +x,
        },
        "label": "Win limit",
      },
      {
        'name': 'board_width',
        'values': {
          'type': 'int', 'min': 8, 'max': 10, 'step': 1, 'default': 10, 'value': (x) => +x,
        },
        "label": "Board width",
      },
      {
        'name': 'board_height',
        'values': {
          'type': 'int', 'min': 8, 'max': 10, 'step': 1, 'default': 10, 'value': (x) => +x,
        },
        "label": "Board height",
      },
      {
        "name": 'remove_unused',
        "values": {
          'type': 'bool', 'default': true, 'value': (x) => x,
        },
        "label": {
          "true": "Remove cards not used on the board",
          "false": "Keep all cards even if not present on the board",
        },
      },
      {
        "name": 'wild_corners',
        "values": {
          'type': 'bool', 'default': true, 'value': (x) => x,
        },
        "label": {
          "true": "Add wild cards in the corners",
          "false": "Don't fill in corners with wild cards",
        },
      },
      {
        'name': 'hand_size',
        'values': {
          'type': 'int', 'min': 2, 'max': 15, 'step': 1, 'default': 7, 'value': (x) => +x,
        },
        "label": "Hand size",
      },
      {
        'name': 'joker_count',
        'values': {
          'type': 'int', 'min': 0, 'max': 16, 'step': 1, 'default': 8, 'value': (x) => +x,
        },
        "label": "Joker count",
      },
    ],
  },
  'three thirteen': {
    "description": "In Three Thirteen, players compete against each other to score the least points each round. Each round, a new wild card pops up... try not to discard it!",
    "name": 'Three Thirteen (Card Game)',
    "options": [
      {
        'name': 'num_players',
        'values': {
          'type': 'int', 'min': 1, 'max': 15, 'step': 1, 'default': 4, 'value': (x) => +x,
        },
        "label": "Number of players",
      },
      {
        'name': 'min_draw_size',
        'values': {
          'type': 'int', 'min': 13, 'max': 40, 'step': 1, 'default': 15, 'value': (x) => +x,
        },
        "label": "Minimum extra cards (per player)",
      },
      {
        "name": 'add_jokers',
        "values": {
          'type': 'bool', 'default': true, 'value': (x) => x,
        },
        "label": {
          "true": "Add Jokers as permanent wild cards",
          "false": "Leave Jokers out",
        },
      },
      {
        "name": 'wilds_as_rank',
        "values": {
          'type': 'bool', 'default': true, 'value': (x) => x,
        },
        "label": {
          "true": "Use non-Joker wild cards as their rank",
          "false": "Always treat wild cards as wild",
        },
      },
      {
        "name": 'allow_mostly_wild',
        "values": {
          'type': 'bool', 'default': false, 'value': (x) => x,
        },
        "label": {
          "true": "Allow groups with mostly wild cards",
          "false": "Only allow up to half of the cards in a group to be wild",
        },
      },
      {
        "name": 'allow_all_wild_cards',
        "values": {
          'type': 'bool', 'default': false, 'value': (x) => x,
        },
        "label": {
          "true": "Allow all cards in a group to be wild",
          "false": "Forbid all-wild groups",
        },
      },
      {
        "name": 'same_suit_runs',
        "values": {
          'type': 'bool', 'default': true, 'value': (x) => x,
        },
        "label": {
          "true": "Require runs to be of the same suit",
          "false": "Allow mixed-suit runs",
        },
      },
      {
        "name": 'ace_high',
        "values": {
          'type': 'bool', 'default': false, 'value': (x) => x,
        },
        "label": {
          "true": "Aces are high",
          "false": "Aces are low",
        },
      },
      {
        'name': 'laying_down_limit',
        'values': {
          'type': 'int', 'min': 0, 'max': 20, 'step': 1, 'default': 0, 'value': (x) => +x,
        },
        "label": "Laying down limit",
      },
      {
        "name": 'with_fourteenth_round',
        "values": {
          'type': 'bool', 'default': false, 'value': (x) => x,
        },
        "label": {
          "true": "Play an extra round with no ranked wild cards",
          "false": "Stick to thirteen rounds (Kings wild)",
        },
      },
      {
        "name": 'allow_last_draw',
        "values": {
          'type': 'bool', 'default': true, 'value': (x) => x,
        },
        "label": {
          "true": "Give everyone else one last draw after going out",
          "false": "End round immediately after going out",
        },
      },
      {
        'name': 'to_point_limit',
        "values": {
          'type': 'select',
          'options': [
            {
              "label": 'No Point Limit',
              "value": '-1',
            },
            {
              "label": '50 Points',
              "value": '50',
            },
            {
              "label": '100 Points',
              "value": '100',
            },
            {
              "label": '150 Points',
              "value": '150',
            },
            {
              "label": '200 Points',
              "value": '200',
            },
            {
              "label": '250 Points',
              "value": '250',
            },
          ],
          'default': '-1',
          'value': (x) => +x,
        },
        "label": "Point limit to end early",
      },
      {
        "name": 'golf_scoring',
        "values": {
          'type': 'bool', 'default': true, 'value': (x) => x,
        },
        "label": {
          "true": "Count points against yourself",
          "false": "Give points to the player laying down",
        },
      },
      {
        "name": 'suggest_better',
        "values": {
          'type': 'bool', 'default': true, 'value': (x) => x,
        },
        "label": {
          "true": "Tell users if they could get a better score",
          "false": "Don't tell users if they could get a better score",
        },
      },
    ],
  },
};

export {
  GameConfig
}
