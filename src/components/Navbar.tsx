import { ConnectKitButton } from 'connectkit'
import { Layers } from 'lucide-react'

interface NavbarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const tabs = ['Stake', 'Commit', 'Earn']

export default function Navbar({ activeTab, onTabChange }: NavbarProps) {
  return (
    <header
      className="sticky top-0 z-40 w-full border-b"
      style={{
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div
            className="flex size-8 items-center justify-center rounded-xl"
            style={{ background: 'var(--accent)' }}
          >
            <Layers className="size-4 text-white" />
          </div>
          <span
            className="display text-lg font-bold"
            style={{ color: 'var(--ink)' }}
          >
            StakeArc
          </span>
        </div>

        {/* Nav tabs */}
        <nav className="hidden items-center gap-1 sm:flex">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className="relative rounded-xl px-4 py-2 text-sm font-medium transition-all"
              style={{
                color: activeTab === tab ? 'var(--accent)' : 'var(--muted)',
                background:
                  activeTab === tab ? 'var(--accent-light)' : 'transparent',
              }}
            >
              {tab}
              {activeTab === tab && (
                <span
                  className="absolute bottom-0 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full"
                  style={{ background: 'var(--accent)' }}
                />
              )}
            </button>
          ))}
        </nav>

        {/* Connect */}
        <ConnectKitButton.Custom>
          {({ isConnected, show, address, truncatedAddress }) => (
            <button
              onClick={show}
              className="rounded-2xl px-4 py-2 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: isConnected
                  ? 'var(--accent-light)'
                  : 'var(--accent)',
                color: isConnected ? 'var(--accent)' : '#fff',
              }}
            >
              {isConnected
                ? truncatedAddress ?? `${address?.slice(0, 6)}...${address?.slice(-4)}`
                : 'Connect Wallet'}
            </button>
          )}
        </ConnectKitButton.Custom>
      </div>

      {/* Mobile tabs */}
      <div className="flex gap-1 border-t px-4 py-2 sm:hidden" style={{ borderColor: 'var(--border)' }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className="flex-1 rounded-xl py-2 text-sm font-medium transition-all"
            style={{
              color: activeTab === tab ? 'var(--accent)' : 'var(--muted)',
              background:
                activeTab === tab ? 'var(--accent-light)' : 'transparent',
            }}
          >
            {tab}
          </button>
        ))}
      </div>
    </header>
  )
}
