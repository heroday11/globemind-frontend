import { NavLink } from 'react-router-dom'
import { IconActivity } from './Icons'

const nav = [
  { to: '/', label: '世界状态' },
  { to: '/numerical-alert', label: '阈值预警' },
]

export default function TerminalHeader() {
  return (
    <header className="world-state-header">
      <div className="world-state-heading">
        <div className="world-state-mark"><IconActivity className="h-5 w-5" /></div>
        <h1>世界状态信号库</h1>
      </div>
      <nav className="world-state-switch" aria-label="页面选择">
        {nav.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'}
            className={({ isActive }) => isActive ? 'is-active' : undefined}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}
