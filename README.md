# ⚰️💰 Ether Tontine

An old proof-of-concept I dusted off and updated to open source. This is not a
_true_ [tontine](https://en.wikipedia.org/wiki/Tontine) as it does not invest
capital nor provide interest; it's more akin to a death lottery where the last
player standing receives the sum of all contributions. Players must contribute a
fixed amount at a fixed interval defined by the opener of the tontine (contract
deployer). If a player misses a payment, the player is considered "dead" and can
no longer contribute or be considered as the final beneficiary.

## Parameters

There are five options when creating a new tontine:

- `dues` - `uint256` amount in wei each player is required to deposit every
  interval window to be considered "alive".
- `interval` - `uint256` interval window in seconds a player must contribute
  within (e.g. `31536000` for an annual required payment). Remember that time
  on-chain is imprecise and malleable by miners to a degree so a high frequency
  tontine is for true adrenaline fiends. It might go without saying that an
  interval shorter than the typical block time won't work.
- `minPlayers` - `uint256` of the required number of players to deposit a first
  payment for the interval to begin ticking. This allows the game to begin
  slowly without requiring fast coordination between all players and the tontine
  will remain in a paused state until the required minimum is met. Once the nth
  player joins, the game begins and payments at `interval` are expected.
- `allowLatecomers` - `bool` that determines whether players can join after the
  game clock has started ticking. This allows the potential growth rate of the
  pot to continue increasing over time but also offers no disadvantage to
  latecomers.
- `heirMustLive` - `bool` that determines whether the final claimant must be in
  a "living" state, i.e. in good standing with dues payments. Set this to
  `false` so that should all players forget about the tontine, the funds can
  still be withdrawn by the first player to remember to do so. Otherwise the
  chest is effectively burned.

## Lifecycle

1. The deployer of the contract creates a new tontine with the parameters
   described above. The tontine creator otherwise has no special privileges.
2. Players wishing to join call the `contribute()` method with the amount of
   ether defined as the periodic `dues`.
3. The tontine remains in a paused state until player n joins, where n is
   defined as `minPlayers`. At this point, the last payment time of each player
   is set to the block timestamp of the nth player's entrance transaction.
4. Players must call `contribute()` with `dues` within each subsequent
   `interval`. Missing a payment causes future ones from that player to be
   rejected and the player is considered to be expired.
5. Perhaps a century in the future (or a week, depending on how seriously the
   game is taken) a savvy player will notice that all other players have
   eventually missed a payment and will call `claim()`. If indeed all other
   players are dead, the contract will self destruct, sending its full balance
   to the final heir.

---

_caveat emptor_: Many smart contracts turn out to be tacitly dumb and this may
well be one of them; i.e. use at your own risk.
