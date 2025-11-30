




import React from 'react';
import './theme.css';
// import '../components//theme.css';
import { LogOut } from 'lucide-react';

export default function Header({
  collapsed,
  setCollapsed,
  mobileVisible,
  setMobileVisible,
  userEmail,
  title,
  isMobile
}) {
  const handleMenuClick = () => {
    if (isMobile) {
      setMobileVisible(!mobileVisible);
    } else {
      setCollapsed(!collapsed);
    }
  };

  return (
    <header className={`topbar ${collapsed ? 'collapsed' : ''}`}>

      <div className="topbar-left">
        <button className="menu-btn" onClick={handleMenuClick} aria-label="Toggle menu">
          ☰
        </button>
        {title && <span className="portal-title">{title}</span>}
      </div>
      <div className="topbar-right">
        <span className="user-email">{userEmail}</span>
        <button
          className="logout-btn"
          onClick={() => {
            localStorage.clear();
            window.location.href = '/login';
          }}
          aria-label="Logout"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}


