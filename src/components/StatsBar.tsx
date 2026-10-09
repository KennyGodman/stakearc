import { useReadContract } from 'wagmi'
import { TrendingUp, Users, DollarSign, Info } from 'lucide-react'
import { STAKE_ARC_ADDRESS, STAKE_ARC_ABI } from '@/contracts/stakeArc'
import { ARC_TESTNET_ID } from '@/contracts/stakeArc'
import { Amount, usdcDecimalsFor } from '@/onchain-money'

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
}) {
  return (
    <div
      className="flex flex-1 flex-col gap-1 rounded-2xl p-4"
      style={{
        background: 'var(--surface-strong)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center gap-1.5">
        <div
          className="flex size-5 items-center justify-center rounded-md"
          style={{ background: 'var(--accent-light)' }}
        >
          <Icon className="size-3" style={{ color: 'var(--accent)' }} />
        </div>
        <span
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--muted)' }}
        >
          {label}
        </span>
      </div>
      <div
        className="display text-3xl font-bold tabular-nums"
        style={{ color: 'var(--ink)' }}
      >
        {value}
      </div>
      {sub && (
        <div className="text-xs" style={{ color: 'var(--subtle)' }}>
          {sub}
        </div>
      )}
    </div>
  )
}

export default function StatsBar() {
  const { data: totalStaked } = useReadContract({
    address: STAKE_ARC_ADDRESS,
    abi: STAKE_ARC_ABI,
    functionName: 'totalStaked',
    chainId: ARC_TESTNET_ID,
    query: { refetchInterval: 10_000 },
  })

  const { data: baseApyBps } = useReadContract({
    address: STAKE_ARC_ADDRESS,
    abi: STAKE_ARC_ABI,
    functionName: 'baseApyBps',
    chainId: ARC_TESTNET_ID,
    query: { refetchInterval: 30_000 },
  })

  const { data: rewardPool } = useReadContract({
    address: STAKE_ARC_ADDRESS,
    abi: STAKE_ARC_ABI,
    functionName: 'rewardPool',
    chainId: ARC_TESTNET_ID,
    query: { refetchInterval: 10_000 },
  })

  const decimals = usdcDecimalsFor(ARC_TESTNET_ID)

  const tvlFormatted =
    totalStaked !== undefined
      ? Amount.fromRaw(totalStaked, decimals).toFixed(2)
      : '—'

  const apyFormatted =
    baseApyBps !== undefined
      ? `${(Number(baseApyBps) / 100).toFixed(2)}%`
      : '—'

  const rewardPoolFormatted =
    rewardPool !== undefined
      ? Amount.fromRaw(rewardPool, decimals).toFixed(2)
      : '—'

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Announcement banner */}
      <div
        className="mb-6 flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
        style={{
          background: 'var(--accent-light)',
          border: '1px solid rgba(19,85,212,0.20)',
          color: 'var(--accent)',
        }}
      >
        <Info className="size-4 shrink-0" />
        <span>
          Stake USDC on Arc — earn up to{' '}
          <strong>
            {baseApyBps !== undefined
              ? `${(Number(baseApyBps) / 100 + 8).toFixed(0)}%`
              : '16%'}
          </strong>{' '}
          APY with committed positions. USDC is the gas token on Arc.
        </span>
      </div>

      {/* Stats row */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <StatCard
          label="TVL"
          value={`$${tvlFormatted}`}
          sub="Total value locked"
          icon={DollarSign}
        />
        <StatCard
          label="Base APY"
          value={apyFormatted}
          sub="Up to +8% for 90-day commits"
          icon={TrendingUp}
        />
        <StatCard
          label="Reward Pool"
          value={`$${rewardPoolFormatted}`}
          sub="USDC available for rewards"
          icon={Users}
        />
      </div>
    </div>
  )
}
