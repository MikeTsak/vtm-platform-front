// src/ui/Nav.jsx
import React, { useContext, useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AuthCtx } from '../core/AuthContext';
import api from '../core/api';

function NavDropdown({ title, icon, children, isMobile, isOpen, toggleOpen }) {
  const [isHovered, setIsHovered] = useState(false);

  if (isMobile) {
    return (
      <div className="w-full mb-2">
        <button
          onClick={toggleOpen}
          className={`w-full flex items-center justify-between p-3 rounded-lg border border-transparent transition-colors ${isOpen ? 'bg-primary-container/20 border-primary/30 text-primary' : 'bg-surface-variant/10 text-on-surface hover:bg-surface-variant/30'
            }`}
          data-cuelume-press
          data-cuelume-hover
        >
          <div className="flex items-center gap-3">
            {icon && <span className="material-symbols-outlined text-[20px]">{icon}</span>}
            <span className="font-['Playfair_Display'] font-bold text-[16px] tracking-wide">{title}</span>
          </div>
          <span className={`material-symbols-outlined transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : 'text-on-surface-variant'}`}>
            expand_more
          </span>
        </button>
        <div
          className={`overflow-hidden transition-all duration-300 flex flex-col pl-10 border-l-2 border-primary/30 ml-4 ${isOpen ? 'max-h-[500px] mt-2 opacity-100' : 'max-h-0 opacity-0'
            }`}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative group h-full flex items-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-cuelume-hover
    >
      <div className={`cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded transition-colors text-[13px] uppercase tracking-widest font-bold font-['Inter'] ${isHovered ? 'text-primary bg-surface-variant/30' : 'text-on-surface-variant'}`}>
        {icon && <span className="material-symbols-outlined text-[18px] mb-[2px]">{icon}</span>}
        {title}
        <span className={`material-symbols-outlined text-[16px] transition-transform duration-300 ${isHovered ? 'rotate-180 text-primary' : 'opacity-70'}`}>
          expand_more
        </span>
      </div>

      {/* Invisible bridge to prevent hover loss */}
      <div className="absolute top-[calc(100%-10px)] left-0 w-full h-[20px]"></div>

      <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-1 min-w-[200px] bg-surface-container-high border border-outline-variant/30 rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.6)] backdrop-blur-md flex flex-col py-2 z-50 transition-all duration-200 ${isHovered ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}>
        {children}
      </div>
    </div>
  );
}

const getNavItemClass = ({ isActive, isDropdownItem = false, isMobile = false }) => {
  if (isDropdownItem) {
    if (isMobile) {
      return `py-2.5 px-2 text-[14px] font-['Inter'] transition-colors whitespace-nowrap ${isActive ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface hover:pl-3'}`;
    }
    return `px-4 py-2 text-[13px] font-['Inter'] tracking-wide transition-all whitespace-nowrap border-l-2 ${isActive ? 'text-primary border-primary bg-primary/10 font-bold' : 'text-on-surface-variant border-transparent hover:text-on-surface hover:bg-surface-variant/50 hover:border-outline-variant hover:pl-5'}`;
  }

  if (isMobile) {
    return `flex items-center gap-3 p-3 rounded-lg transition-colors w-full mb-2 ${isActive ? 'bg-primary/20 text-primary border border-primary/30 font-bold' : 'bg-surface-variant/10 text-on-surface hover:bg-surface-variant/30'}`;
  }

  return `flex items-center gap-1.5 px-3 py-2 rounded transition-colors text-[13px] uppercase tracking-widest font-bold font-['Inter'] relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-0 after:h-[2px] after:bg-primary after:transition-all hover:after:w-[80%] ${isActive ? 'text-primary after:w-[80%]' : 'text-on-surface-variant hover:text-primary'}`;
};

export default function Nav() {
  const { user, logout } = useContext(AuthCtx);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [canSeePremonitions, setCanSeePremonitions] = useState(false);
  const [isCharActive, setIsCharActive] = useState(false);
  const location = useLocation();

  const [openMobileDropdown, setOpenMobileDropdown] = useState(null);

  const toggleMenu = () => setIsMenuOpen(v => !v);
  const closeMenu = () => { setIsMenuOpen(false); setOpenMobileDropdown(null); };

  const handleMobileDropdownToggle = (title) => {
    setOpenMobileDropdown(openMobileDropdown === title ? null : title);
  };

  useEffect(() => {
    closeMenu();
  }, [location]);

  useEffect(() => {
    if (isMenuOpen) document.documentElement.style.overflow = 'hidden';
    else document.documentElement.style.overflow = '';
    return () => { document.documentElement.style.overflow = ''; };
  }, [isMenuOpen]);

  useEffect(() => {
    let live = true;
    setCanSeePremonitions(false);

    if (!user) return;
    if (user.role === 'admin' || user.role === 'courtuser') {
      if (user.role === 'admin') setCanSeePremonitions(true);
      setIsCharActive(true);
      return;
    }

    api.get('/characters/me')
      .then(({ data }) => {
        if (!live) return;
        const clan = data?.character?.clan;
        setCanSeePremonitions(clan === 'Malkavian');
        setIsCharActive(data?.character?.sheet?.is_active === true);
      })
      .catch(() => { });

    return () => { live = false; };
  }, [user]);

  return (
    <>
      <style>{`
        .gothic-etched-border { border: 1px solid rgba(224, 224, 224, 0.1); }
      `}</style>

      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-[998] transition-opacity duration-300 lg:hidden ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={closeMenu}
      />

      {/* Main Top Nav */}
      <nav className="sticky top-0 z-[1000] bg-surface/90 backdrop-blur-md border-b border-outline-variant/30 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between px-4 lg:px-8 h-16 max-w-[1920px] mx-auto">

          {/* Logo & Brand */}
          <Link 
  data-cuelume-press 
  data-cuelume-hover to="/" className="flex items-center gap-3 z-[1001] group" onClick={closeMenu}>
            <img src="/img/animated.gif" alt="ATT Logo" className="w-8 h-8 object-contain rounded-md border border-outline-variant/50 bg-surface-container p-0.5 shadow-lg group-hover:border-primary transition-colors" />
            <span className="font-['Playfair_Display'] font-bold text-[20px] tracking-wide text-on-surface group-hover:text-primary transition-colors">Erebus Portal</span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden lg:flex items-center justify-center gap-2 flex-grow mx-8 h-full">
            {user && (
              <>
                <NavDropdown title="Personal" icon="person" isMobile={false}>
                  <NavLink 
  data-cuelume-press 
  data-cuelume-hover end to="/character" className={({ isActive }) => getNavItemClass({ isActive, isDropdownItem: true, isMobile: false })}>Character Sheet</NavLink>
                  <NavLink 
  data-cuelume-press 
  data-cuelume-hover to="/downtimes" className={({ isActive }) => getNavItemClass({ isActive, isDropdownItem: true, isMobile: false })}>Actions & Projects</NavLink>
                  {canSeePremonitions && (
                    <NavLink 
  data-cuelume-press 
  data-cuelume-hover to="/premonitions" className={({ isActive }) => getNavItemClass({ isActive, isDropdownItem: true, isMobile: false })}>Premonitions</NavLink>
                  )}
                  <NavLink 
  data-cuelume-press 
  data-cuelume-hover to="/retainers" className={({ isActive }) => getNavItemClass({ isActive, isDropdownItem: true, isMobile: false })}>Retainers</NavLink>
                </NavDropdown>

                <NavDropdown title="Athens" icon="account_balance" isMobile={false}>
                  <NavLink 
  data-cuelume-press 
  data-cuelume-hover to="/court/hierarchy" className={({ isActive }) => getNavItemClass({ isActive, isDropdownItem: true, isMobile: false })}>Court Hierarchy</NavLink>
                  <NavLink 
  data-cuelume-press 
  data-cuelume-hover to="/court/announcements" className={({ isActive }) => getNavItemClass({ isActive, isDropdownItem: true, isMobile: false })}>Announcements</NavLink>
                  <NavLink 
  data-cuelume-press 
  data-cuelume-hover to="/court/coteries" className={({ isActive }) => getNavItemClass({ isActive, isDropdownItem: true, isMobile: false })}>Coteries</NavLink>
                  <NavLink 
  data-cuelume-press 
  data-cuelume-hover to="/boons" className={({ isActive }) => getNavItemClass({ isActive, isDropdownItem: true, isMobile: false })}>Boons Ledger</NavLink>
                  <NavLink 
  data-cuelume-press 
  data-cuelume-hover to="/domains" className={({ isActive }) => getNavItemClass({ isActive, isDropdownItem: true, isMobile: false })}>City Domains</NavLink>
                  <NavLink 
  data-cuelume-press 
  data-cuelume-hover to="/news" className={({ isActive }) => getNavItemClass({ isActive, isDropdownItem: true, isMobile: false })}>Official News</NavLink>
                  <NavLink 
  data-cuelume-press 
  data-cuelume-hover to="/rumors" className={({ isActive }) => getNavItemClass({ isActive, isDropdownItem: true, isMobile: false })}>Rumors</NavLink>
                </NavDropdown>

                <NavDropdown title="Comms" icon="rss_feed" isMobile={false}>
                  <NavLink 
  data-cuelume-press 
  data-cuelume-hover to="/schrecknet" className={({ isActive }) => getNavItemClass({ isActive, isDropdownItem: true, isMobile: false })}>SchreckNet</NavLink>
                  <NavLink 
  data-cuelume-press 
  data-cuelume-hover to="/surfaceweb" className={({ isActive }) => getNavItemClass({ isActive, isDropdownItem: true, isMobile: false })}>Surface Web</NavLink>
                </NavDropdown>

                <NavLink 
  data-cuelume-press 
  data-cuelume-hover to="/live-session" className={({ isActive }) => getNavItemClass({ isActive, isMobile: false })}>
                  <span className="material-symbols-outlined text-[18px] mb-[2px]">play_circle</span>
                  Live Session
                </NavLink>
              </>
            )}

            {user?.role === 'admin' && (
              <NavDropdown title="Admin" icon="admin_panel_settings" isMobile={false}>
                <NavLink 
  data-cuelume-press 
  data-cuelume-hover to="/admin" className={({ isActive }) => getNavItemClass({ isActive, isDropdownItem: true, isMobile: false })}>Admin Panel</NavLink>
                <NavLink 
  data-cuelume-press 
  data-cuelume-hover to="/admin/live-session" className={({ isActive }) => getNavItemClass({ isActive, isDropdownItem: true, isMobile: false })}>Live Session Dashboard</NavLink>
              </NavDropdown>
            )}
          </div>

          {/* Desktop User Info */}
          <div className="hidden lg:flex items-center gap-4">
            {user ? (
              <>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Logged In</span>
                  <span className="text-[14px] text-primary font-bold font-['Playfair_Display']">{user.display_name}</span>
                </div>
                <button type="button" onClick={logout} className="border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:bg-error-container hover:border-error text-[12px] uppercase font-bold tracking-widest px-4 py-2 rounded transition-all" data-cuelume-press="pop" data-cuelume-hover>
                  Logout
                </button>
              </>
            ) : (
              <NavLink 
  data-cuelume-press 
  data-cuelume-hover to="/login" className="bg-primary text-on-primary font-bold uppercase tracking-widest text-[12px] px-6 py-2.5 rounded shadow-lg hover:brightness-110 active:scale-95 transition-all">Login</NavLink>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            className="lg:hidden z-[1001] p-2 text-on-surface-variant hover:text-primary transition-colors focus:outline-none"
            onClick={toggleMenu}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            data-cuelume-press
            data-cuelume-hover
          >
            <span className="material-symbols-outlined text-[28px]">{isMenuOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </nav>

      {/* Mobile Side Drawer */}
      <div
        className={`fixed top-0 right-0 h-[100dvh] w-72 sm:w-80 bg-surface-container shadow-[-8px_0_25px_rgba(0,0,0,0.6)] z-[999] gothic-etched-border border-r-0 border-y-0 flex flex-col pt-20 pb-8 px-4 overflow-y-auto transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:hidden ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        <div className="flex flex-col h-full">
          {user && (
            <div className="space-y-1 flex-grow">
              <NavDropdown title="Personal" icon="person" isMobile={true} isOpen={openMobileDropdown === 'Personal'} toggleOpen={() => handleMobileDropdownToggle('Personal')}>
                <NavLink 
  data-cuelume-press 
  data-cuelume-hover end to="/character" className={({ isActive }) => getNavItemClass({ isActive, isDropdownItem: true, isMobile: true })}>Character Sheet</NavLink>
                <NavLink 
  data-cuelume-press 
  data-cuelume-hover to="/downtimes" className={({ isActive }) => getNavItemClass({ isActive, isDropdownItem: true, isMobile: true })}>Actions & Projects</NavLink>
                {canSeePremonitions && (
                  <NavLink 
  data-cuelume-press 
  data-cuelume-hover to="/premonitions" className={({ isActive }) => getNavItemClass({ isActive, isDropdownItem: true, isMobile: true })}>Premonitions</NavLink>
                )}
                <NavLink 
  data-cuelume-press 
  data-cuelume-hover to="/retainers" className={({ isActive }) => getNavItemClass({ isActive, isDropdownItem: true, isMobile: true })}>Retainers</NavLink>
              </NavDropdown>

              <NavDropdown title="Athens" icon="account_balance" isMobile={true} isOpen={openMobileDropdown === 'Athens'} toggleOpen={() => handleMobileDropdownToggle('Athens')}>
                <NavLink 
  data-cuelume-press 
  data-cuelume-hover to="/court/hierarchy" className={({ isActive }) => getNavItemClass({ isActive, isDropdownItem: true, isMobile: true })}>Court Hierarchy</NavLink>
                <NavLink 
  data-cuelume-press 
  data-cuelume-hover to="/court/announcements" className={({ isActive }) => getNavItemClass({ isActive, isDropdownItem: true, isMobile: true })}>Announcements</NavLink>
                <NavLink 
  data-cuelume-press 
  data-cuelume-hover to="/court/coteries" className={({ isActive }) => getNavItemClass({ isActive, isDropdownItem: true, isMobile: true })}>Coteries</NavLink>
                <NavLink 
  data-cuelume-press 
  data-cuelume-hover to="/boons" className={({ isActive }) => getNavItemClass({ isActive, isDropdownItem: true, isMobile: true })}>Boons Ledger</NavLink>
                <NavLink 
  data-cuelume-press 
  data-cuelume-hover to="/domains" className={({ isActive }) => getNavItemClass({ isActive, isDropdownItem: true, isMobile: true })}>City Domains</NavLink>
                <NavLink 
  data-cuelume-press 
  data-cuelume-hover to="/news" className={({ isActive }) => getNavItemClass({ isActive, isDropdownItem: true, isMobile: true })}>Official News</NavLink>
                <NavLink 
  data-cuelume-press 
  data-cuelume-hover to="/rumors" className={({ isActive }) => getNavItemClass({ isActive, isDropdownItem: true, isMobile: true })}>Rumors</NavLink>
              </NavDropdown>

              <NavDropdown title="Comms" icon="rss_feed" isMobile={true} isOpen={openMobileDropdown === 'Comms'} toggleOpen={() => handleMobileDropdownToggle('Comms')}>
                <NavLink 
  data-cuelume-press 
  data-cuelume-hover to="/schrecknet" className={({ isActive }) => getNavItemClass({ isActive, isDropdownItem: true, isMobile: true })}>SchreckNet</NavLink>
                <NavLink 
  data-cuelume-press 
  data-cuelume-hover to="/surfaceweb" className={({ isActive }) => getNavItemClass({ isActive, isDropdownItem: true, isMobile: true })}>Surface Web</NavLink>
              </NavDropdown>

              <NavLink 
  data-cuelume-press 
  data-cuelume-hover to="/live-session" className={({ isActive }) => getNavItemClass({ isActive, isMobile: true })}>
                <span className="material-symbols-outlined text-[20px]">play_circle</span>
                <span className="font-['Playfair_Display'] font-bold text-[16px] tracking-wide">Live Session</span>
              </NavLink>

              {user?.role === 'admin' && (
                <div className="pt-4 mt-4 border-t border-outline-variant/20">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary-container px-3 mb-2 block">Administration</span>
                  <NavDropdown title="Admin" icon="admin_panel_settings" isMobile={true} isOpen={openMobileDropdown === 'Admin'} toggleOpen={() => handleMobileDropdownToggle('Admin')}>
                    <NavLink 
  data-cuelume-press 
  data-cuelume-hover to="/admin" className={({ isActive }) => getNavItemClass({ isActive, isDropdownItem: true, isMobile: true })}>Admin Panel</NavLink>
                    <NavLink 
  data-cuelume-press 
  data-cuelume-hover to="/admin/live-session" className={({ isActive }) => getNavItemClass({ isActive, isDropdownItem: true, isMobile: true })}>Live Session Dashboard</NavLink>
                  </NavDropdown>
                </div>
              )}
            </div>
          )}

          {/* Mobile User Footer */}
          <div className="mt-auto pt-6 border-t border-outline-variant/30 flex flex-col gap-4">
            {user ? (
              <>
                <div className="bg-surface-container-highest p-4 rounded-xl border border-outline-variant/10 text-center">
                  <p className="text-[12px] text-on-surface-variant uppercase font-bold tracking-widest mb-1">Authenticated</p>
                  <p className="text-[18px] font-bold text-primary font-['Playfair_Display']">{user.display_name}</p>
                </div>
                <button type="button" onClick={logout} className="w-full bg-error-container/20 border border-error-container text-error hover:bg-error-container hover:text-on-error py-3 rounded-lg text-[14px] uppercase font-bold tracking-widest transition-colors flex items-center justify-center gap-2" data-cuelume-press="pop" data-cuelume-hover>
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  Sever Connection
                </button>
              </>
            ) : (
              <NavLink 
  data-cuelume-press 
  data-cuelume-hover to="/login" className="w-full bg-primary text-on-primary py-3 rounded-lg text-[14px] uppercase font-bold tracking-widest text-center shadow-lg active:scale-95 transition-transform">
                Establish Link
              </NavLink>
            )}
          </div>
        </div>
      </div>
    </>
  );
}