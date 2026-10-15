import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../core/api';
import { NEWS_OUTLETS } from '../../constants/outletConstants';
import { apiJoin, isVideoUrl } from '../../utils/newsUtils';
import { formatAthensDate } from '../../utils/dateFormatter';
import themeStyles from '../../styles/NewsThemes.module.css';
import outletStyles from '../../styles/OutletView.module.css';
import { Skeleton } from 'boneyard-js/react';
import { useQuery } from '@tanstack/react-query';
import FaGlyph from '../../ui/FaGlyph';

// Per outlet navigation sections
const OUTLET_NAV = {
  KATHIMERINI: ['ΠΟΛΙΤΙΚΗ', 'ΟΙΚΟΝΟΜΙΑ', 'ΕΛΛΑΔΑ', 'ΚΟΣΜΟΣ', 'ΠΟΛΙΤΙΣΜΟΣ'],
  ALPHA:       ['ΚΟΙΝΩΝΙΑ', 'ΠΟΛΙΤΙΚΗ', 'ΔΙΕΘΝΗ', 'ΟΙΚΟΝΟΜΙΑ'],
  ERT:         ['ΕΛΛΑΔΑ', 'ΠΕΡΙΦΕΡΕΙΑ', 'ΠΟΛΙΤΙΚΗ', 'ΚΟΣΜΟΣ'],
  MEGA:        ['ΕΛΛΑΔΑ', 'ΚΟΣΜΟΣ', 'ΠΟΛΙΤΙΚΗ', 'ΟΙΚΟΝΟΜΙΑ'],
  GOSSIP:      ['SHOWBIZ', 'MEDIA', 'GOSSIP', 'ROYALS'],
  SKAI:        ['ΕΛΛΑΔΑ', 'ΚΟΣΜΟΣ', 'ΠΟΛΙΤΙΚΗ', 'ΟΙΚΟΝΟΜΙΑ', 'ΑΘΛΗΤΙΚΑ'],
  OPENTV:      ['NEWS', 'ΕΛΛΑΔΑ', 'ΚΟΣΜΟΣ', 'ΠΟΛΙΤΙΚΗ'],
  ALTER:       ['ΡΟΗ ΕΙΔΗΣΕΩΝ', 'ΠΟΛΙΤΙΚΗ', 'ΕΡΕΥΝΑ', 'ΚΟΙΝΩΝΙΑ', 'ΑΠΟΚΑΛΥΨΕΙΣ', 'ΚΟΣΜΟΣ'],
};

function ArticleCard({ item, theme }) {
  const mediaUrl = apiJoin(item.media_url);
  const excerpt = (item.body || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);

  return (
    <Link to={`/news/${item.id}`} className={outletStyles.card} style={{ '--card-accent': theme.color }}>
      {item.media_url && (
        <div className={outletStyles.cardMedia}>
          {isVideoUrl(item.media_url)
            ? <video src={mediaUrl} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <img src={mediaUrl} alt="" loading="lazy" />}
        </div>
      )}
      <div className={outletStyles.cardBody}>
        <h3 className={outletStyles.cardTitle}>{item.title}</h3>
        {item.subtitle && <p className={outletStyles.cardSubtitle} style={{ color: theme.color }}>{item.subtitle}</p>}
        <p className={outletStyles.cardExcerpt}>{excerpt}{excerpt.length >= 200 ? '...' : ''}</p>
        <div className={outletStyles.cardMeta}>
          {item.journalist_name && <span style={{ color: theme.color, fontWeight: 600 }}>{item.journalist_name}</span>}
          <span>{formatAthensDate(item.created_at)}</span>
        </div>
      </div>
    </Link>
  );
}

// Featured hero card for the first article
function HeroCard({ item, theme }) {
  const mediaUrl = apiJoin(item.media_url);
  const excerpt = (item.body || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 350);

  return (
    <Link to={`/news/${item.id}`} className={outletStyles.hero} style={{ '--card-accent': theme.color }}>
      {item.media_url && (
        <div className={outletStyles.heroMedia}>
          {isVideoUrl(item.media_url)
            ? <video src={mediaUrl} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <img src={mediaUrl} alt="" loading="lazy" />}
        </div>
      )}
      <div className={outletStyles.heroBody}>
        <h2 className={outletStyles.heroTitle}>{item.title}</h2>
        {item.subtitle && <p className={outletStyles.heroSubtitle}>{item.subtitle}</p>}
        <p className={outletStyles.heroExcerpt}>{excerpt}{excerpt.length >= 350 ? '...' : ''}</p>
        <div className={outletStyles.cardMeta}>
          {item.journalist_name && <span style={{ color: theme.color, fontWeight: 600 }}>{item.journalist_name}</span>}
          <span>{formatAthensDate(item.created_at)}</span>
        </div>
      </div>
    </Link>
  );
}

// Reusable navigation bar
function NavBar({ items, style = {}, linkStyle = {}, inline, firstColor, activeCategory, onSelectCategory }) {
  const renderItem = (label, i) => {
    const isActive = activeCategory && activeCategory.toUpperCase() === label.toUpperCase();
    return (
      <button
        key={label}
        type="button"
        onClick={() => onSelectCategory(isActive ? '' : label)}
        style={{
          background: 'none',
          border: 'none',
          padding: '4px 8px',
          cursor: 'pointer',
          font: 'inherit',
          textTransform: 'uppercase',
          fontWeight: isActive ? 900 : 'bold',
          textDecoration: isActive ? 'underline' : 'none',
          ...(i === 0 && firstColor && !isActive ? { color: firstColor } : linkStyle),
          ...(isActive ? { opacity: 1 } : { opacity: 0.85 }),
        }}
      >
        {label}
      </button>
    );
  };

  if (inline) {
    return (
      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap', ...style }}>
        {items.map((label, i) => renderItem(label, i))}
      </div>
    );
  }
  return (
    <nav style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem', textTransform: 'uppercase', flexWrap: 'wrap', alignItems: 'center', ...style }}>
      {items.map((label, i) => renderItem(label, i))}
    </nav>
  );
}

// Theme specific headers
function KathimeriniHeader({ theme, navItems, themeKey, activeCategory, onSelectCategory }) {
  return (
    <header className={themeStyles.kathimeriniHeader} style={{ flexDirection: 'column', padding: '0' }}>
      <div style={{ width: '100%', padding: '1.5rem', display: 'flex', justifyContent: 'center', borderBottom: '1px solid #ddd' }}>
        <Link to={`/news/outlet/${themeKey.toLowerCase()}`} onClick={() => onSelectCategory('')}>
          <img src={theme.logo} alt={theme.name} style={{ height: '65px', width: 'auto', objectFit: 'contain' }} />
        </Link>
      </div>
      <NavBar
        items={navItems}
        style={{ color: '#111', justifyContent: 'center', padding: '0.8rem' }}
        linkStyle={{ color: '#111' }}
        activeCategory={activeCategory}
        onSelectCategory={onSelectCategory}
      />
    </header>
  );
}

function AlphaHeader({ theme, navItems, themeKey, activeCategory, onSelectCategory }) {
  return (
    <header style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ backgroundColor: '#111', padding: '1rem 2rem', display: 'flex', alignItems: 'center' }}>
        <Link to={`/news/outlet/${themeKey.toLowerCase()}`} onClick={() => onSelectCategory('')} style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src={theme.logo} alt={theme.name} className={themeStyles.alphaLogo} style={{ height: '35px', marginRight: '2rem' }} />
          <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.2rem', letterSpacing: '2px' }}>NEWS</div>
        </Link>
      </div>
      <nav style={{ backgroundColor: '#fff', borderBottom: '2px solid #ff3b3b', padding: '0.8rem 2rem', display: 'flex', gap: '1rem', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', flexWrap: 'wrap' }}>
        {navItems.map(label => {
          const isActive = activeCategory && activeCategory.toUpperCase() === label.toUpperCase();
          return (
            <button
              key={label}
              type="button"
              onClick={() => onSelectCategory(isActive ? '' : label)}
              style={{
                cursor: 'pointer',
                background: isActive ? '#ff3b3b' : 'transparent',
                color: isActive ? '#fff' : '#111',
                border: '1px solid #ddd',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 'bold',
              }}
            >
              {label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}

function ErtHeader({ theme, navItems, themeKey, activeCategory, onSelectCategory }) {
  return (
    <header className={themeStyles.ertHeader} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '0' }}>
      <div style={{ padding: '1rem 2rem', width: '100%' }}>
        <Link to={`/news/outlet/${themeKey.toLowerCase()}`} onClick={() => onSelectCategory('')}>
          <img src={theme.logo} alt={theme.name} style={{ height: '40px' }} />
        </Link>
      </div>
      <NavBar
        items={navItems}
        style={{ width: '100%', backgroundColor: '#000', padding: '0.8rem 2rem', color: '#fff', fontWeight: 'bold' }}
        linkStyle={{ color: '#fff' }}
        activeCategory={activeCategory}
        onSelectCategory={onSelectCategory}
      />
    </header>
  );
}

function MegaHeader({ theme, navItems, themeKey, activeCategory, onSelectCategory }) {
  return (
    <header className={themeStyles.megaHeader}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Link to={`/news/outlet/${themeKey.toLowerCase()}`} onClick={() => onSelectCategory('')}>
          <img src={theme.logo} alt={theme.name} style={{ height: '40px', marginRight: '2rem' }} />
        </Link>
        <NavBar
          items={navItems}
          style={{ display: 'flex', gap: '1.5rem', fontWeight: 'bold' }}
          linkStyle={{ color: '#fff' }}
          inline
          activeCategory={activeCategory}
          onSelectCategory={onSelectCategory}
        />
      </div>
      <div style={{ color: '#cc0000', fontWeight: 'bold' }}>LIVE TV</div>
    </header>
  );
}

function GossipHeader({ theme, navItems, themeKey, activeCategory, onSelectCategory }) {
  return (
    <header className={themeStyles.gossipHeader} style={{ flexDirection: 'column', padding: '0' }}>
      <div style={{ width: '100%', padding: '1rem', display: 'flex', justifyContent: 'center', background: '#e6007e' }}>
        <Link to={`/news/outlet/${themeKey.toLowerCase()}`} onClick={() => onSelectCategory('')}>
          <img src={theme.logo} alt={theme.name} style={{ height: '60px', borderRadius: '10px', border: '2px solid #fff' }} />
        </Link>
      </div>
      <NavBar
        items={navItems}
        style={{ width: '100%', backgroundColor: '#ff99cc', padding: '0.8rem', justifyContent: 'center', fontWeight: '900', color: '#fff' }}
        linkStyle={{ color: '#fff' }}
        activeCategory={activeCategory}
        onSelectCategory={onSelectCategory}
      />
    </header>
  );
}

function SkaiHeader({ theme, navItems, themeKey, activeCategory, onSelectCategory }) {
  return (
    <header className={themeStyles.skaiHeader}>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <Link to={`/news/outlet/${themeKey.toLowerCase()}`} onClick={() => onSelectCategory('')}>
          <img src={theme.logo} alt={theme.name} style={{ height: '34px', marginRight: '2rem', objectFit: 'contain' }} />
        </Link>
        <NavBar
          items={navItems}
          style={{ display: 'flex', gap: '1.5rem', fontWeight: 'bold' }}
          linkStyle={{ color: '#005bfe' }}
          inline
          activeCategory={activeCategory}
          onSelectCategory={onSelectCategory}
        />
      </div>
    </header>
  );
}

function OpenHeader({ theme, navItems, themeKey, activeCategory, onSelectCategory }) {
  return (
    <header className={themeStyles.openHeader}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Link to={`/news/outlet/${themeKey.toLowerCase()}`} onClick={() => onSelectCategory('')}>
          <img src={theme.logo} alt={theme.name} style={{ height: '40px', marginRight: '3rem' }} />
        </Link>
        <NavBar
          items={navItems}
          style={{ display: 'flex', gap: '2rem', fontWeight: 'bold' }}
          linkStyle={{ color: '#fff' }}
          inline
          firstColor="#fa8301"
          activeCategory={activeCategory}
          onSelectCategory={onSelectCategory}
        />
      </div>
    </header>
  );
}

function AlterHeader({ theme, navItems, themeKey, activeCategory, onSelectCategory }) {
  return (
    <header className={themeStyles.alterHeader}>
      <div className={themeStyles.alterTopBar}>
        <div className={themeStyles.alterLogoContainer}>
          <Link to={`/news/outlet/${themeKey.toLowerCase()}`} onClick={() => onSelectCategory('')} style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img src={theme.logo} alt={theme.name} className={themeStyles.alterLogo} />
            <span className={themeStyles.alterSlogan}>ΤΟ ΚΑΝΑΛΙ ΤΗΣ ΕΝΗΜΕΡΩΣΗΣ</span>
          </Link>
        </div>
        <div className={themeStyles.alterLiveBadge}>
          <span className={themeStyles.alterLiveDot} />
          <span>LIVE</span>
        </div>
      </div>
      <nav className={themeStyles.alterNav}>
        {navItems.map(label => {
          const isActive = activeCategory && activeCategory.toUpperCase() === label.toUpperCase();
          return (
            <button
              key={label}
              type="button"
              onClick={() => onSelectCategory(isActive ? '' : label)}
              style={{
                background: isActive ? '#cc0000' : 'none',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                font: 'inherit',
                padding: '6px 12px',
                fontWeight: 'bold',
              }}
            >
              {label}
            </button>
          );
        })}
      </nav>
      <div className={themeStyles.alterTickerBar}>
        <span className={themeStyles.alterTickerLabel}>ΕΚΤΑΚΤΟ</span>
        <span>ΕΝΗΜΕΡΩΤΙΚΟ ΔΕΛΤΙΟ : ΣΥΝΕΧΗΣ ΕΝΗΜΕΡΩΣΗ</span>
      </div>
    </header>
  );
}

function OutletHeader({ themeKey, theme, navItems, activeCategory, onSelectCategory }) {
  const props = { theme, navItems, themeKey, activeCategory, onSelectCategory };
  switch (themeKey) {
    case 'KATHIMERINI': return <KathimeriniHeader {...props} />;
    case 'ALPHA':       return <AlphaHeader {...props} />;
    case 'ERT':         return <ErtHeader {...props} />;
    case 'MEGA':        return <MegaHeader {...props} />;
    case 'GOSSIP':      return <GossipHeader {...props} />;
    case 'SKAI':        return <SkaiHeader {...props} />;
    case 'OPENTV':      return <OpenHeader {...props} />;
    case 'ALTER':       return <AlterHeader {...props} />;
    default: return null;
  }
}

const WRAPPER_CLASS = {
  KATHIMERINI: themeStyles.kathimeriniWrapper,
  ALPHA:       themeStyles.alphaWrapper,
  ERT:         themeStyles.ertWrapper,
  MEGA:        themeStyles.megaWrapper,
  GOSSIP:      themeStyles.gossipWrapper,
  SKAI:        themeStyles.skaiWrapper,
  OPENTV:      themeStyles.openWrapper,
  ALTER:       themeStyles.alterWrapper,
};

export default function OutletView() {
  const { theme: rawTheme } = useParams();
  const themeKey = (rawTheme || '').toUpperCase();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeCategory = searchParams.get('cat') || searchParams.get('category') || '';

  const theme = NEWS_OUTLETS[themeKey];
  const navItems = OUTLET_NAV[themeKey] || [];

  const handleSelectCategory = (cat) => {
    if (!cat) {
      setSearchParams({});
    } else {
      setSearchParams({ cat });
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['news-outlet', themeKey],
    queryFn: async () => {
      const res = await api.get(`/news/public?theme=${themeKey}`);
      return res.data;
    },
    enabled: !!theme,
  });

  if (!theme || themeKey === 'RUMOR') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a', color: '#fff' }}>
        <h2>Unknown outlet</h2>
        <button
          type="button"
          onClick={() => navigate('/news')}
          style={{ marginTop: '1rem', padding: '10px 20px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer' }}
        >
          Return to News Hub
        </button>
      </div>
    );
  }

  const allArticles = (data?.items || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const wrapperCls = WRAPPER_CLASS[themeKey] || '';
  const heroItem = allArticles[0];
  const restItems = allArticles.slice(1);

  const backBtn = (
    <button
      type="button"
      onClick={() => navigate('/news')}
      className="no-print"
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        padding: '10px 20px',
        background: 'rgba(0,0,0,0.85)',
        color: '#fff',
        border: '1px solid #444',
        borderRadius: '4px',
        cursor: 'pointer',
        zIndex: 9999,
        fontWeight: 'bold',
        boxShadow: '0 4px 6px rgba(0,0,0,0.5)',
        textTransform: 'uppercase',
        fontSize: '0.8rem',
        letterSpacing: '1px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <FaGlyph name="fa-arrow-left" style={{ width: '12px', height: '12px' }} />
      <span>Return to News Hub</span>
    </button>
  );

  return (
    <Skeleton loading={isLoading} name="outlet-page">
      <div className={`${themeStyles.articleWrapper} ${wrapperCls}`} style={{ minHeight: '100vh' }}>
        <Helmet>
          <title>{theme.name} : Athens Through Time | Erebus Portal</title>
          <meta name="description" content={`All news articles from ${theme.name}, in the Athens Through Time vampire LARP chronicle.`} />
          <link rel="canonical" href={`https://portal.attlarp.gr/news/outlet/${rawTheme}`} />
        </Helmet>

        {backBtn}
        <OutletHeader
          themeKey={themeKey}
          theme={theme}
          navItems={navItems}
          activeCategory={activeCategory}
          onSelectCategory={handleSelectCategory}
        />

        <div style={{ maxWidth: '1100px', margin: '2rem auto', padding: '0 1rem' }}>
          {/* Disclaimer banner */}
          <div className={outletStyles.disclaimer}>
            <strong>Disclaimer:</strong> This content is entirely fictional and created for the <em>Athens Through Time</em> Live Action Role Playing (LARP) game.
          </div>

          {allArticles.length === 0 && !isLoading && (
            <div className={outletStyles.empty}>
              <FaGlyph name="fa-newspaper" style={{ width: '48px', height: '48px', opacity: 0.4 }} />
              <p>No articles from this outlet yet.</p>
            </div>
          )}

          {heroItem && <HeroCard item={heroItem} theme={theme} />}

          {restItems.length > 0 && (
            <div className={outletStyles.grid}>
              {restItems.map(item => (
                <ArticleCard key={item.id} item={item} theme={theme} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Skeleton>
  );
}
