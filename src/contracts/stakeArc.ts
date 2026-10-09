// StakeArc contract config — address filled after deploy
export const ARC_TESTNET_ID = 5042002

// Deployed on Arc Testnet — 2026-09-18
export const STAKE_ARC_ADDRESS = '0x1b80547765d9d25e2af506ecda304008ca9b1650'

export const STAKE_ARC_ABI = [
  // View
  {
    type: 'function',
    name: 'totalStaked',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'rewardPool',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'baseApyBps',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'positionOf',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'stakedAmount', type: 'uint256' },
          { name: 'commitAmount', type: 'uint256' },
          { name: 'commitStart', type: 'uint256' },
          { name: 'commitDuration', type: 'uint256' },
          { name: 'lastRewardTimestamp', type: 'uint256' },
          { name: 'pendingRewards', type: 'uint256' },
          { name: 'stArcBalance', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'claimableRewards',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'lockedAmountOf',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  // Write
  {
    type: 'function',
    name: 'stake',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'unstake',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'commit',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'duration', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'claimRewards',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  // Events
  {
    type: 'event',
    name: 'Staked',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'Unstaked',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'Committed',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256' },
      { name: 'startTime', type: 'uint256' },
      { name: 'duration', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'RewardsClaimed',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256' },
    ],
  },
] as const
