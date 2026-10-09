import { Layers, ArrowRight, Zap, Lock, Gift } from 'lucide-react'


const FEATURES = [
  {
    icon: Zap,
    title: 'Stake USDC',
    desc: 'Deposit and earn 8% base APY. Withdraw anytime.',
  },
  {
    icon: Lock,
    title: 'Commit to Earn More',
    desc: 'Lock for 7, 30, or 90 days and boost your yield up to +8%.',
  },
  {
    icon: Gift,
    title: 'Claim Rewards',
    desc: 'Rewards accrue every second. Claim USDC directly to your wallet.',
  },
]

export default function Hero() {
  return (
    <section className="mx-auto max-w-5xl px-4 pb-2 pt-10">
      {/* Badge */}
      <div className="mb-5 flex justify-center">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            background: 'var(--accent-light)',
            color: 'var(--accent)',
            border: '1px solid rgba(19,85,212,0.18)',
          }}
        >
          <span
            className="inline-block size-1.5 rounded-full"
            style={{ background: 'var(--accent)' }}
          />
          Live on Arc Testnet
        </span>
      </div>

      {/* Headline */}
      <div className="text-center">
        <div className="mb-3 flex items-center justify-center gap-3">
          <div
            className="flex size-12 items-center justify-center rounded-2xl"
            style={{ background: 'var(--accent)' }}
          >
            <Layers className="size-6 text-white" />
          </div>
          <h1
            className="display text-5xl font-bold tracking-tight"
            style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}
          >
            StakeArc
          </h1>
        </div>

        <p
          className="mx-auto mt-3 max-w-lg text-lg font-medium"
          style={{ color: 'var(--ink-2)' }}
        >
          Stake, commit, and earn USDC on Arc — the chain where USDC is the native gas token.
        </p>
        <p
          className="mx-auto mt-2 max-w-md text-sm"
          style={{ color: 'var(--muted)' }}
        >
          No ETH needed. No volatile gas fees. Just stable, predictable yields paid in USDC with sub-second finality.
        </p>
      </div>

      {/* Feature pills */}
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="flex items-start gap-3 rounded-2xl p-4"
            style={{
              background: 'var(--surface-strong)',
              border: '1px solid var(--border)',
            }}
          >
            <div
              className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl"
              style={{ background: 'var(--accent-light)' }}
            >
              <Icon className="size-4" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                {title}
              </div>
              <div className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>
                {desc}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Scroll cue */}
      <div className="mt-6 flex items-center justify-center gap-2 text-xs" style={{ color: 'var(--subtle)' }}>
        <span>Scroll down to start staking</span>
        <ArrowRight className="size-3 rotate-90" />
      </div>
    </section>
  )
}
