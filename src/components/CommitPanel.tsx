import { useState } from 'react'
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
} from 'wagmi'
import { Loader2, Lock, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { STAKE_ARC_ADDRESS, STAKE_ARC_ABI, ARC_TESTNET_ID } from '@/contracts/stakeArc'
import { buildTxExplorerUrl } from '@/onchain-facts'
import { parseAmount, Amount, usdcDecimalsFor } from '@/onchain-money'

const DECIMALS = usdcDecimalsFor(ARC_TESTNET_ID)

const DURATIONS = [
  { label: '7 days', value: 7 * 24 * 60 * 60, bonus: '+2%', color: '#3b82f6' },
  { label: '30 days', value: 30 * 24 * 60 * 60, bonus: '+4%', color: '#1355d4' },
  { label: '90 days', value: 90 * 24 * 60 * 60, bonus: '+8%', color: '#0a2d6e' },
]

function parseOnchainError(err: unknown): string {
  const msg = (err as { message?: string })?.message?.toLowerCase() ?? ''
  if (msg.includes('user rejected') || msg.includes('denied')) return 'Transaction cancelled.'
  if (msg.includes('active commit')) return 'You already have an active commit.'
  if (msg.includes('insufficient stake')) return 'Not enough staked USDC.'
  if (msg.includes('reverted')) return 'Transaction failed on-chain.'
  return 'Something went wrong. Please try again.'
}

export default function CommitPanel() {
  const { address, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const [selectedDuration, setSelectedDuration] = useState(DURATIONS[1].value)
  const [amount, setAmount] = useState('')

  const wrongChain = !!address && chainId !== ARC_TESTNET_ID

  const { data: position, refetch } = useReadContract({
    address: STAKE_ARC_ADDRESS,
    abi: STAKE_ARC_ABI,
    functionName: 'positionOf',
    args: [address!],
    chainId: ARC_TESTNET_ID,
    query: { enabled: !!address, refetchInterval: 8_000 },
  })

  const { writeContract, data: hash, isPending, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  if (isSuccess) {
    setAmount('')
    void refetch()
    reset()
    toast.success('Commit locked in!')
  }

  const stakedFormatted = position
    ? Amount.fromRaw(position.stakedAmount, DECIMALS).toFixed(2)
    : '0.00'

  // commitDuration > 0 and commitAmount > 0 means a commit was set; we treat it
  // as active — the chain state (commitStart + commitDuration vs block.timestamp)
  // is the authoritative guard; here we just use it for UI display.
  const hasActiveCommit =
    !!position &&
    position.commitAmount > 0n &&
    position.commitDuration > 0n

  const commitEnds = hasActiveCommit
    ? new Date((Number(position.commitStart) + Number(position.commitDuration)) * 1000)
    : null

  const parsedAmount = (() => {
    try {
      if (!amount || Number(amount) <= 0) return null
      return parseAmount(ARC_TESTNET_ID, amount)
    } catch {
      return null
    }
  })()

  const isLoading = isPending || isConfirming

  const handleCommit = () => {
    if (!address) return
    if (wrongChain) { switchChain({ chainId: ARC_TESTNET_ID }); return }
    if (!parsedAmount) return
    try {
      writeContract({
        address: STAKE_ARC_ADDRESS,
        abi: STAKE_ARC_ABI,
        functionName: 'commit',
        args: [parsedAmount.raw, BigInt(selectedDuration)],
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
    return 'Lock Commit'
  }

  return (
    <div className="space-y-4">
      {/* Active commit badge */}
      {hasActiveCommit && commitEnds && (
        <div
          className="flex items-center gap-3 rounded-2xl p-4"
          style={{
            background: 'var(--accent-light)',
            border: '1px solid rgba(19,85,212,0.2)',
          }}
        >
          <Lock className="size-4 shrink-0" style={{ color: 'var(--accent)' }} />
          <div>
            <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              Active Commit
            </div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>
              {Amount.fromRaw(position.commitAmount, DECIMALS).toFixed(2)} USDC locked until{' '}
              {commitEnds.toLocaleDateString()}
            </div>
          </div>
        </div>
      )}

      {/* Duration selector */}
      <div>
        <div className="mb-2 text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>
          Lock Duration
        </div>
        <div className="grid grid-cols-3 gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d.value}
              onClick={() => setSelectedDuration(d.value)}
              className="flex flex-col items-center gap-1 rounded-2xl py-4 transition-all"
              style={{
                background:
                  selectedDuration === d.value ? 'var(--accent)' : 'var(--surface-muted)',
                border:
                  selectedDuration === d.value
                    ? '1px solid var(--accent)'
                    : '1px solid var(--border)',
                color: selectedDuration === d.value ? '#fff' : 'var(--ink)',
              }}
            >
              <Clock
                className="size-4"
                style={{ color: selectedDuration === d.value ? '#fff' : 'var(--muted)' }}
              />
              <span className="text-sm font-semibold">{d.label}</span>
              <span
                className="rounded-lg px-2 py-0.5 text-xs font-bold"
                style={{
                  background:
                    selectedDuration === d.value
                      ? 'rgba(255,255,255,0.2)'
                      : 'var(--accent-light)',
                  color: selectedDuration === d.value ? '#fff' : 'var(--accent)',
                }}
              >
                {d.bonus} APY
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Amount input */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
      >
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
            Amount to commit
          </span>
          <button
            className="text-xs font-semibold"
            style={{ color: 'var(--accent)' }}
            onClick={() => {
              if (position) {
                setAmount(Amount.fromRaw(position.stakedAmount, DECIMALS).toFixed(6))
              }
            }}
          >
            MAX
          </button>
        </div>
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => {
            const v = e.target.value.replace(/[^0-9.]/g, '')
            if (v === '' || /^\d*\.?\d*$/.test(v)) setAmount(v)
          }}
          placeholder="0.00"
          className="display w-full bg-transparent text-4xl font-bold tabular-nums outline-none placeholder:opacity-30"
          style={{ color: 'var(--ink)' }}
        />
        <div className="mt-2 text-xs" style={{ color: 'var(--subtle)' }}>
          Available to commit: {stakedFormatted} USDC
        </div>
      </div>

      {/* CTA */}
      <button
        disabled={
          isLoading ||
          !!hasActiveCommit ||
          (!wrongChain && !parsedAmount)
        }
        onClick={handleCommit}
        className="w-full rounded-2xl py-3.5 text-sm font-semibold text-white transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        style={{ background: 'var(--accent)' }}
      >
        {hasActiveCommit ? 'Commit Already Active' : ctaLabel()}
      </button>

      {isSuccess && hash && (
        <a
          href={buildTxExplorerUrl(ARC_TESTNET_ID, hash)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1.5 text-xs font-medium"
          style={{ color: 'var(--success)' }}
        >
          <Lock className="size-3.5" />
          Commit confirmed — view on ArcScan
        </a>
      )}

      {/* Info card */}
      <div
        className="rounded-2xl p-4 text-sm"
        style={{
          background: 'var(--surface-muted)',
          border: '1px solid var(--border)',
        }}
      >
        <div className="font-semibold mb-2" style={{ color: 'var(--ink-2)' }}>
          How Commits Work
        </div>
        <ul className="space-y-1 text-xs" style={{ color: 'var(--muted)' }}>
          <li>• Choose a lock duration to earn bonus APY on top of your base rate</li>
          <li>• Committed USDC cannot be unstaked until the lock expires</li>
          <li>• One active commit at a time per address</li>
          <li>• Rewards accrue continuously and can be claimed any time</li>
        </ul>
      </div>
    </div>
  )
}
