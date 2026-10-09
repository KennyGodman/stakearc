import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
} from 'wagmi'
import { Loader2, TrendingUp, Gift, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { STAKE_ARC_ADDRESS, STAKE_ARC_ABI, ARC_TESTNET_ID } from '@/contracts/stakeArc'
import { buildTxExplorerUrl } from '@/onchain-facts'
import { Amount, usdcDecimalsFor } from '@/onchain-money'

const DECIMALS = usdcDecimalsFor(ARC_TESTNET_ID)

function parseOnchainError(err: unknown): string {
  const msg = (err as { message?: string })?.message?.toLowerCase() ?? ''
  if (msg.includes('user rejected') || msg.includes('denied')) return 'Transaction cancelled.'
  if (msg.includes('no rewards')) return 'No rewards available to claim yet.'
  if (msg.includes('insufficient reward pool'))
    return 'Reward pool is insufficient. Contact admin.'
  if (msg.includes('reverted')) return 'Transaction failed on-chain.'
  return 'Something went wrong. Please try again.'
}

export default function EarnPanel() {
  const { address, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const wrongChain = !!address && chainId !== ARC_TESTNET_ID

  const { data: claimable, refetch } = useReadContract({
    address: STAKE_ARC_ADDRESS,
    abi: STAKE_ARC_ABI,
    functionName: 'claimableRewards',
    args: [address!],
    chainId: ARC_TESTNET_ID,
    query: { enabled: !!address, refetchInterval: 5_000 },
  })

  const { data: position } = useReadContract({
    address: STAKE_ARC_ADDRESS,
    abi: STAKE_ARC_ABI,
    functionName: 'positionOf',
    args: [address!],
    chainId: ARC_TESTNET_ID,
    query: { enabled: !!address, refetchInterval: 8_000 },
  })

  const { data: baseApyBps } = useReadContract({
    address: STAKE_ARC_ADDRESS,
    abi: STAKE_ARC_ABI,
    functionName: 'baseApyBps',
    chainId: ARC_TESTNET_ID,
    query: { refetchInterval: 30_000 },
  })

  const { writeContract, data: hash, isPending, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  if (isSuccess) {
    void refetch()
    reset()
    toast.success('Rewards claimed!')
  }

  const claimableFormatted = claimable !== undefined
    ? Amount.fromRaw(claimable, DECIMALS).toFixed(6)
    : '—'

  const stakedFormatted = position
    ? Amount.fromRaw(position.stakedAmount, DECIMALS).toFixed(2)
    : '0.00'

  const baseApy = baseApyBps !== undefined ? Number(baseApyBps) / 100 : 8

  // Treat commitAmount > 0 as active commit for UI display
  // (contract enforces the actual expiry on-chain)
  const hasActiveCommit =
    !!position &&
    position.commitAmount > 0n &&
    position.commitDuration > 0n

  const commitBonus = hasActiveCommit
    ? (() => {
        const d = Number(position.commitDuration)
        if (d === 90 * 24 * 60 * 60) return 8
        if (d === 30 * 24 * 60 * 60) return 4
        return 2
      })()
    : 0

  const effectiveApy = baseApy + commitBonus

  const isLoading = isPending || isConfirming

  const handleClaim = () => {
    if (!address) return
    if (wrongChain) { switchChain({ chainId: ARC_TESTNET_ID }); return }
    try {
      writeContract({
        address: STAKE_ARC_ADDRESS,
        abi: STAKE_ARC_ABI,
        functionName: 'claimRewards',
        args: [],
      })
    } catch (err) {
      toast.error(parseOnchainError(err))
    }
  }

  const ctaLabel = () => {
    if (!address) return 'Connect Wallet'
    if (wrongChain) return 'Switch to Arc Testnet'
    if (isPending) return (
      <span className="flex items-center justify-center gap-2">
        <Loader2 className="size-4 animate-spin" /> Confirm in wallet...
      </span>
    )
    if (isConfirming) return (
      <span className="flex items-center justify-center gap-2">
        <Loader2 className="size-4 animate-spin" /> Confirming...
      </span>
    )
    return 'Claim Rewards'
  }

  return (
    <div className="space-y-4">
      {/* Hero rewards card */}
      <div
        className="rounded-3xl p-6 text-center"
        style={{
          background: 'linear-gradient(135deg, #1355d4 0%, #0e45b2 100%)',
        }}
      >
        <div className="mb-1 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-white/70">
          <Gift className="size-3.5" />
          Claimable Rewards
        </div>
        <div className="display text-5xl font-bold tabular-nums text-white">
          {claimableFormatted}
        </div>
        <div className="mt-1 text-sm text-white/70">USDC</div>
      </div>

      {/* APY breakdown */}
      <div
        className="grid grid-cols-2 gap-3"
      >
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'var(--surface-strong)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="mb-1 flex items-center gap-1.5">
            <TrendingUp className="size-3.5" style={{ color: 'var(--accent)' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
              Base APY
            </span>
          </div>
          <div
            className="display text-2xl font-bold tabular-nums"
            style={{ color: 'var(--ink)' }}
          >
            {baseApy.toFixed(2)}%
          </div>
        </div>

        <div
          className="rounded-2xl p-4"
          style={{
            background: hasActiveCommit ? 'var(--accent-light)' : 'var(--surface-strong)',
            border: hasActiveCommit ? '1px solid rgba(19,85,212,0.2)' : '1px solid var(--border)',
          }}
        >
          <div className="mb-1 flex items-center gap-1.5">
            <Zap
              className="size-3.5"
              style={{ color: hasActiveCommit ? 'var(--accent)' : 'var(--muted)' }}
            />
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: hasActiveCommit ? 'var(--accent)' : 'var(--muted)' }}
            >
              Commit Bonus
            </span>
          </div>
          <div
            className="display text-2xl font-bold tabular-nums"
            style={{ color: hasActiveCommit ? 'var(--accent)' : 'var(--subtle)' }}
          >
            +{commitBonus.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Effective APY row */}
      <div
        className="flex items-center justify-between rounded-2xl px-4 py-3"
        style={{
          background: 'var(--surface-muted)',
          border: '1px solid var(--border)',
        }}
      >
        <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
          Your Effective APY
        </span>
        <span
          className="display text-xl font-bold tabular-nums"
          style={{ color: 'var(--accent)' }}
        >
          {effectiveApy.toFixed(2)}%
        </span>
      </div>

      {/* Position row */}
      {address && position && position.stakedAmount > 0n && (
        <div
          className="space-y-2 rounded-2xl p-4 text-sm"
          style={{
            background: 'var(--surface-strong)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="flex justify-between">
            <span style={{ color: 'var(--muted)' }}>Staked</span>
            <span className="font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
              {stakedFormatted} USDC
            </span>
          </div>
          {hasActiveCommit && (
            <div className="flex justify-between">
              <span style={{ color: 'var(--muted)' }}>Committed</span>
              <span className="font-semibold tabular-nums" style={{ color: 'var(--accent)' }}>
                {Amount.fromRaw(position.commitAmount, DECIMALS).toFixed(2)} USDC
              </span>
            </div>
          )}
        </div>
      )}

      {/* Claim CTA */}
      <button
        disabled={
          isLoading ||
          (!wrongChain && (claimable === undefined || (claimable) === 0n))
        }
        onClick={handleClaim}
        className="w-full rounded-2xl py-3.5 text-sm font-semibold text-white transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        style={{ background: 'var(--accent)' }}
      >
        {ctaLabel()}
      </button>

      {isSuccess && hash && (
        <a
          href={buildTxExplorerUrl(ARC_TESTNET_ID, hash)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1.5 text-xs font-medium"
          style={{ color: 'var(--success)' }}
        >
          <Gift className="size-3.5" />
          Rewards claimed — view on ArcScan
        </a>
      )}
    </div>
  )
}
