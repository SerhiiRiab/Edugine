// Sidebar — tutor app dark-violet sidebar from src/components/tutor/tutor-shell.tsx
const {
  LayoutDashboard, BookOpen, GraduationCap, Play, Settings, LogOut
} = window.EdugineIcons;

const NAV_ITEMS = [
  { key: 'dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { key: 'content-sets', label: 'Content Sets', icon: BookOpen },
  { key: 'lessons',      label: 'Lessons',      icon: GraduationCap },
  { key: 'sessions',     label: 'Sessions',     icon: Play },
  { key: 'settings',     label: 'Settings',     icon: Settings },
];

function Sidebar({ active, onNav, email }) {
  return (
    <aside style={{
      width: 240, flexShrink: 0, background: 'var(--violet-950)',
      color: '#fff', display: 'flex', flexDirection: 'column', height: '100vh'
    }}>
      {/* Logo lockup */}
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid rgba(91, 33, 182, 0.6)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="../../assets/edugine-mark.svg" alt="" style={{ width: 32, height: 32, display: 'block' }}/>
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>Edugine</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
          const isActive = active === key;
          return (
            <a key={key} onClick={() => onNav(key)} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', borderRadius: 12, fontSize: 14, fontWeight: 500,
              cursor: 'pointer', transition: 'all 150ms',
              background: isActive ? 'var(--violet-600)' : 'transparent',
              color: isActive ? '#fff' : 'var(--violet-300)'
            }}
            onMouseEnter={e => {
              if (!isActive) { e.currentTarget.style.background = 'rgba(91, 33, 182, 0.6)'; e.currentTarget.style.color = '#fff'; }
            }}
            onMouseLeave={e => {
              if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--violet-300)'; }
            }}>
              <Icon width={16} height={16}/>
              {label}
            </a>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '16px 12px', borderTop: '1px solid rgba(91, 33, 182, 0.6)',
        display: 'flex', flexDirection: 'column', gap: 4
      }}>
        <div style={{ padding: '8px 12px' }}>
          <p style={{ fontSize: 12, color: 'var(--violet-400)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {email}
          </p>
        </div>
        <a style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
          borderRadius: 12, fontSize: 14, fontWeight: 500, color: 'var(--violet-300)',
          cursor: 'pointer', transition: 'all 150ms'
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(91, 33, 182, 0.6)'; e.currentTarget.style.color = '#fff'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--violet-300)'; }}>
          <LogOut width={16} height={16}/>
          Logout
        </a>
      </div>
    </aside>
  );
}

window.TutorSidebar = Sidebar;
