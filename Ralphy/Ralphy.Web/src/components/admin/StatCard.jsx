export default function StatCard({ label, value, color = 'blue', icon }) {
    const colors = {
      blue:   'bg-blue-500/10  text-blue-400  border-blue-500/20',
      green:  'bg-green-500/10 text-green-400 border-green-500/20',
      amber:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
      red:    'bg-red-500/10   text-red-400   border-red-500/20',
    }
  
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-slate-400 text-xs font-medium uppercase
                          tracking-widest mb-1">
              {label}
            </p>
            <p className="text-3xl font-bold text-white">{value ?? '—'}</p>
          </div>
          {icon && (
            <div className={`w-10 h-10 rounded-lg border flex items-center
                             justify-center ${colors[color]}`}>
              {icon}
            </div>
          )}
        </div>
      </div>
    )
  }