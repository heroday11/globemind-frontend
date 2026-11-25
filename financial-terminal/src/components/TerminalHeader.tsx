import { IconActivity } from './Icons'


export default function TerminalHeader() {
  return (
    <header className="world-state-header">
      <div className="world-state-heading">
        <div className="world-state-mark"><IconActivity className="h-5 w-5" /></div>
        <h1>世界状态信号库</h1>
      </div>
    </header>
  )
}
