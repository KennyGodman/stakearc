import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import StatsBar from '@/components/StatsBar'
import StakePanel from '@/components/StakePanel'
import CommitPanel from '@/components/CommitPanel'
import EarnPanel from '@/components/EarnPanel'

const PANELS: Record<string, React.ComponentType> = {
  Stake: StakePanel,
  Commit: CommitPanel,
  Earn: EarnPanel,
}

const TAB_DESCRIPTIONS: Record<string, string> = {
  Stake: 'Deposit USDC to start earning. Receive stARC as your receipt token and withdraw anytime.',
  Commit: 'Lock a portion of your staked USDC for a fixed duration to earn boosted APY rewards.',
  Earn: 'Track your accrued rewards and claim USDC directly to your wallet at any time.',
}

export default function App() {
  const [activeTab, setActiveTab] = useState('Stake')
  const ActivePanel = PANELS[activeTab]

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-gradient)' }}>
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <Hero />
      <StatsBar />

      <main className="mx-auto max-w-5xl px-4 pb-16">
        <div className="mx-auto max-w-md">
          {/* Tab description */}
          <p className="mb-4 text-center text-sm" style={{ color: 'var(--muted)' }}>
            {TAB_DESCRIPTIONS[activeTab]}
          </p>

          {/* Panel card */}
          <div
            className="overflow-hidden rounded-3xl p-6 shadow-lg"
            style={{
              background: 'var(--surface-strong)',
              border: '1px solid var(--border)',
              boxShadow:
                '0 4px 24px rgba(19,85,212,0.08), 0 1px 4px rgba(0,0,0,0.06)',
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: 'easeInOut' }}
              >
                <ActivePanel />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer note */}
          <p className="mt-4 text-center text-xs" style={{ color: 'var(--subtle)' }}>
            Deployed on{' '}
            <span className="font-semibold" style={{ color: 'var(--accent)' }}>
              Arc Testnet
            </span>
            . USDC is the native gas token on Arc.
          </p>
        </div>
      </main>
    </div>
  )
}
