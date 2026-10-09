import { useState } from 'react'
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
} from 'wagmi'
import { erc20Abi } from 'viem'
import { Loader2, ArrowDownCircle, ArrowUpCircle, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { STAKE_ARC_ADDRESS, STAKE_ARC_ABI, ARC_TESTNET_ID } from '@/contracts/stakeArc'
import { getUsdc, buildTxExplorerUrl } from '@/onchain-facts'
import { parseAmount, Amount, usdcDecimalsFor } from '@/onchain-money'

const usdc = getUsdc(ARC_TESTNET_ID)!
const USDC_ADDRESS = usdc.address as `0x${string}`
const DECIMALS = usdcDecimalsFor(ARC_TESTNET_ID)

function parseOnchainError(err: unknown): string {
  const msg = (err as { message?: string })?.message?.toLowerCase() ?? ''
  if (msg.includes('user rejected') || msg.includes('denied')) return 'Transaction cancelled.'
  if (msg.includes('insufficient funds') || msg.includes('exceeds balance'))
    return 'Insufficient balance.'
  if (msg.includes('reverted')) return 'Transaction failed on-chain.'
  if (msg.includes('network') || msg.includes('timeout'))
    return 'Network error — please retry.'
  return 'Something went wrong. Please try again.'
}

export default function StakePanel() {
  const { address, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const [mode, setMode] = useState<'stake' | 'unstake'>('stake')
  const [amount, setAmount] = useState('')

  const wrongChain = !!address && chainId !== ARC_TESTNET_ID

  // USDC balance
  const { data: usdcBalance, refetch: refetchBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address!],
    chainId: ARC_TESTNET_ID,
    query: { enabled: !!address, refetchInterval: 8_000 },
  })

  // USDC allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [address!, STAKE_ARC_ADDRESS as `0x${string}`],
    chainId: ARC_TESTNET_ID,
    query: { enabled: !!address, refetchInterval: 8_000 },
  })

  // Staked position
  const { data: position, refetch: refetchPosition } = useReadContract({
    address: STAKE_ARC_ADDRESS,
    abi: STAKE_ARC_ABI,
    functionName: 'positionOf',
    args: [address!],
    chainId: ARC_TESTNET_ID,
    query: { enabled: !!address, refetchInterval: 8_000 },
  })

  const stakedFormatted = position
    ? Amount.fromRaw(position.stakedAmount, DECIMALS).toFixed(2)
    : '0.00'

  const balanceFormatted = usdcBalance
    ? Amount.fromRaw(usdcBalance, DECIMALS).toFixed(2)
    : '0.00'

  // Approve
  const {
    writeContract: approve,
    data: approveHash,
    isPending: isApprovePending,
  } = useWriteContract()
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({
      hash: approveHash,
      onReplaced: () => { void refetchAllowance().catch(() => undefined) },
    })

  // Stake / Unstake
  const {
    writeContract: writeStake,
    data: stakeHash,
    isPending: isStakePending,
    reset: resetStake,
  } = useWriteContract()
  const { isLoading: isStakeConfirming, isSuccess: isStakeSuccess } =
    useWaitForTransactionReceipt({
      hash: stakeHash,
    })

  if (isApproveSuccess) {
    void refetchAllowance()
  }
  if (isStakeSuccess) {
    setAmount('')
    void refetchBalance()
    void refetchPosition()
    resetStake()
    toast.success(mode === 'stake' ? 'Staked successfully!' : 'Unstaked successfully!')
  }

  const parsedAmount = (() => {
    try {
      if (!amount || Number(amount) <= 0) return null
      return parseAmount(ARC_TESTNET_ID, amount)
    } catch {
      return null
    }
  })()

  const needsApproval =
    mode === 'stake' &&
    parsedAmount !== null &&
    (allowance === undefined || (allowance) < parsedAmount.raw)

  const isLoading =
    isApprovePending ||
    isApproveConfirming ||
    isStakePending ||
    isStakeConfirming

  const handleAction = () => {
    if (!address) return
    if (wrongChain) {
      switchChain({ chainId: ARC_TESTNET_ID })
      return
    }
    if (!parsedAmount) return

    if (needsApproval) {
      try {
        approve({
          address: USDC_ADDRESS,
          abi: erc20Abi,
          functionName: 'approve',
          args: [STAKE_ARC_ADDRESS as `0x${string}`, parsedAmount.raw],
        })
      } catch (err) {
        toast.error(parseOnchainError(err))
      }
      return
    }

    try {
      writeStake({
        address: STAKE_ARC_ADDRESS,
        abi: STAKE_ARC_ABI,
        functionName: mode === 'stake' ? 'stake' : 'unstake',
        args: [parsedAmount.raw],
      })
    } catch (err) {
      toast.error(parseOnchainError(err))
    }
  }

  const ctaLabel = () => {
    if (!address) return 'Connect Wallet'
    if (wrongChain) return 'Switch to Arc Testnet'
    if (isApprovePending || isApproveConfirming) return (
      <span className="flex items-center justify-center gap-2">
        <Loader2 className="size-4 animate-spin" />
        {isApproveConfirming ? 'Approving...' : 'Confirm approval...'}
      </span>
    )
    if (isStakePending || isStakeConfirming) return (
      <span className="flex items-center justify-center gap-2">
        <Loader2 className="size-4 animate-spin" />
        {isStakeConfirming ? 'Confirming...' : 'Confirm in wallet...'}
      </span>
    )
    if (needsApproval) return 'Allow USDC'
    return mode === 'stake' ? 'Stake USDC' : 'Unstake USDC'
  }

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div
        className="flex gap-1 rounded-2xl p-1"
        style={{ background: 'var(--surface-muted)' }}
      >
        {(['stake', 'unstake'] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setAmount(''); resetStake() }}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold capitalize transition-all"
            style={{
              background: mode === m ? 'var(--surface-strong)' : 'transparent',
              color: mode === m ? 'var(--ink)' : 'var(--muted)',
              boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {m === 'stake' ? 'Stake' : 'Unstake'}
          </button>
        ))}
      </div>

      {/* Amount input */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: 'var(--surface-muted)',
          border: '1px solid var(--border)',
        }}
      >
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
            {mode === 'stake' ? 'Enter amount to stake' : 'Enter amount to unstake'}
          </span>
          <button
            className="text-xs font-semibold"
            style={{ color: 'var(--accent)' }}
            onClick={() => {
              if (mode === 'stake' && usdcBalance !== undefined) {
                setAmount(Amount.fromRaw(usdcBalance, DECIMALS).toFixed(6))
              } else if (mode === 'unstake' && position) {
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
        <div className="mt-2 flex items-center justify-between text-xs" style={{ color: 'var(--subtle)' }}>
          <span>USDC</span>
          <span>
            {mode === 'stake'
              ? `Wallet: ${balanceFormatted} USDC`
              : `Staked: ${stakedFormatted} USDC`}
          </span>
        </div>
      </div>

      {/* Arrow */}
      <div className="flex justify-center">
        <div
          className="flex size-8 items-center justify-center rounded-full"
          style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}
        >
          <ChevronDown className="size-4" style={{ color: 'var(--muted)' }} />
        </div>
      </div>

      {/* Receive box */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: 'var(--surface-muted)',
          border: '1px solid var(--border)',
        }}
      >
        <div className="mb-1 text-xs font-medium" style={{ color: 'var(--muted)' }}>
          You receive
        </div>
        <div
          className="display text-4xl font-bold tabular-nums"
          style={{ color: 'var(--ink)', opacity: amount && Number(amount) > 0 ? 1 : 0.3 }}
        >
          {amount && Number(amount) > 0 ? Number(amount).toFixed(2) : '0.00'}
        </div>
        <div className="mt-2 text-xs" style={{ color: 'var(--subtle)' }}>
          {mode === 'stake' ? 'stARC (receipt token)' : 'USDC'}
        </div>
      </div>

      {/* CTA */}
      <button
        disabled={isLoading || (!wrongChain && !parsedAmount)}
        onClick={handleAction}
        className="w-full rounded-2xl py-3.5 text-sm font-semibold text-white transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        style={{ background: 'var(--accent)' }}
      >
        {ctaLabel()}
      </button>

      {/* Success receipt */}
      {isStakeSuccess && stakeHash && (
        <a
          href={buildTxExplorerUrl(ARC_TESTNET_ID, stakeHash)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1.5 text-xs font-medium"
          style={{ color: 'var(--success)' }}
        >
          {mode === 'stake' ? (
            <ArrowDownCircle className="size-3.5" />
          ) : (
            <ArrowUpCircle className="size-3.5" />
          )}
          Transaction confirmed — view on ArcScan
        </a>
      )}

      {/* Position summary */}
      {address && position && position.stakedAmount > 0n && (
        <div
          className="rounded-2xl p-4 text-sm"
          style={{
            background: 'var(--accent-light)',
            border: '1px solid rgba(19,85,212,0.15)',
          }}
        >
          <div className="mb-2 font-semibold" style={{ color: 'var(--ink-2)' }}>
            Your Position
          </div>
          <div className="flex justify-between" style={{ color: 'var(--muted)' }}>
            <span>Staked</span>
            <span className="font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
              {stakedFormatted} USDC
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
