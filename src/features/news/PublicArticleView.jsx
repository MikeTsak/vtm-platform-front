import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../core/api';
import styles from '../../styles/News.module.css';
import themeStyles from '../../styles/NewsThemes.module.css';
import { NEWS_OUTLETS } from '../../constants/newsConstants';
import { apiJoin, isVideoUrl } from '../../utils/newsUtils';
import { Skeleton } from 'boneyard-js/react';
import GoogleAd from '../../components/GoogleAd';

export default function PublicArticleView() {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const isRumor = location.pathname.startsWith('/rumors');

  useEffect(() => {
    setLoading(true);
    const endpoint = isRumor ? `/rumors/${id}` : `/news/public/${id}`;
    api.get(endpoint)
      .then(res => {
        setArticle(res.data.item || res.data);
        setLoading(false);
      })
      .catch(err => {
        setError('Article not found or you do not have permission to view it.');
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className={styles.page}>
        <Skeleton loading={true} name="article-loading" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className={styles.page} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <h2 style={{ color: 'var(--text-color)' }}>{error || 'Article not found'}</h2>
        <button onClick={() => navigate(isRumor ? '/rumors' : '/news')} className={styles.btnPrimary} style={{ marginTop: '1rem' }}>Back to {isRumor ? 'Rumors' : 'News'}</button>
      </div>
    );
  }

  const themeObj = NEWS_OUTLETS[article.theme] || NEWS_OUTLETS['ERT'];
  const mediaUrl = article.media_url ? apiJoin(article.media_url) : null;

  // Floating back button to return to the game
  const backBtn = (
    <button onClick={() => navigate(isRumor ? '/rumors' : '/news')} style={{ position: 'fixed', bottom: '20px', left: '20px', padding: '10px 20px', background: 'rgba(0,0,0,0.8)', color: '#fff', border: '1px solid #444', borderRadius: '4px', cursor: 'pointer', zIndex: 9999, fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.5)', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px' }}>
      ← Return to Hub
    </button>
  );

  const renderMedia = (borderRadius = '0px') => {
    if (!mediaUrl) return null;
    if (isVideoUrl(article.media_url)) {
      return <video src={mediaUrl} controls style={{ width: '100%', borderRadius }} />;
    }
    return <img src={mediaUrl} alt="News Media" style={{ width: '100%', borderRadius }} />;
  };

  const articleDate = new Date(article.created_at).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Render left and right ads
  const LeftAdSidebar = () => (
    <aside className={themeStyles.sidebarLeft}>
      <div className={themeStyles.adContainer} style={{ background: 'transparent', padding: '0' }}>
        <span className={themeStyles.adLabel}>Advertisement</span>
        <GoogleAd format="vertical" style={{ minHeight: '600px' }} />
      </div>
    </aside>
  );

  const RightAdSidebar = () => (
    <aside className={themeStyles.sidebarRight}>
      <div className={themeStyles.adContainer} style={{ background: 'transparent', padding: '0' }}>
        <span className={themeStyles.adLabel}>Advertisement</span>
        <GoogleAd format="vertical" style={{ minHeight: '600px' }} />
      </div>
    </aside>
  );

  const BottomAd = () => (
    <div className={themeStyles.adContainer} style={{ background: 'transparent', padding: '0', marginTop: '2rem', borderTop: '1px solid #ddd', paddingTop: '1rem' }}>
      <span className={themeStyles.adLabel}>Advertisement</span>
      <GoogleAd format="horizontal" style={{ minHeight: '200px' }} />
    </div>
  );

  // 1. KATHIMERINI
  if (article.theme === 'KATHIMERINI') {
    return (
      <div className={`${themeStyles.articleWrapper} ${themeStyles.kathimeriniWrapper}`}>
        {backBtn}
        <header className={themeStyles.kathimeriniHeader} style={{ flexDirection: 'column', padding: '0' }}>
          <div style={{ width: '100%', padding: '1.5rem', display: 'flex', justifyContent: 'center', borderBottom: '1px solid #ddd' }}>
            <img src={themeObj.logo} alt={themeObj.name} style={{ height: '45px' }} />
          </div>
          <nav style={{ width: '100%', padding: '0.8rem', display: 'flex', justifyContent: 'center', gap: '2.5rem', fontSize: '0.9rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
            <a href="#" onClick={e=>e.preventDefault()} style={{ color: '#111', textDecoration: 'none' }}>ΠΟΛΙΤΙΚΗ</a>
            <a href="#" onClick={e=>e.preventDefault()} style={{ color: '#111', textDecoration: 'none' }}>ΟΙΚΟΝΟΜΙΑ</a>
            <a href="#" onClick={e=>e.preventDefault()} style={{ color: '#111', textDecoration: 'none' }}>ΕΛΛΑΔΑ</a>
            <a href="#" onClick={e=>e.preventDefault()} style={{ color: '#111', textDecoration: 'none' }}>ΚΟΣΜΟΣ</a>
            <a href="#" onClick={e=>e.preventDefault()} style={{ color: '#111', textDecoration: 'none' }}>ΠΟΛΙΤΙΣΜΟΣ</a>
          </nav>
        </header>
        <div className={themeStyles.mainContent}>
          <LeftAdSidebar />
          <div className={`${themeStyles.articleBody} ${themeStyles.kathimeriniArticle}`}>
            <h1 className={themeStyles.kathimeriniTitle}>{article.title}</h1>
            {article.subtitle && <h3 style={{ margin: '1rem 0', fontSize: '1.3rem', color: '#555' }}>{article.subtitle}</h3>}
            <div className={themeStyles.kathimeriniMeta}>
              <span style={{ fontWeight: 'bold', color: themeObj.color }}>{article.journalist_name || 'ΣΥΝΤΑΚΤΗΣ'}</span> • <span>{articleDate}</span>
            </div>
            {renderMedia()}
            <div className={styles.fsBody} dangerouslySetInnerHTML={{ __html: article.body }} style={{ marginTop: '2rem', color: 'inherit', fontFamily: 'inherit' }} />
            <BottomAd />
          </div>
          <RightAdSidebar />
        </div>
      </div>
    );
  }

  // 2. ALPHA
  if (article.theme === 'ALPHA') {
    return (
      <div className={`${themeStyles.articleWrapper} ${themeStyles.alphaWrapper}`}>
        {backBtn}
        <header style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ backgroundColor: '#111', padding: '1rem 2rem', display: 'flex', alignItems: 'center' }}>
            <img src={themeObj.logo} alt={themeObj.name} className={themeStyles.alphaLogo} style={{ height: '35px', marginRight: '2rem' }} />
            <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.2rem', letterSpacing: '2px' }}>NEWS</div>
          </div>
          <nav style={{ backgroundColor: '#fff', borderBottom: '2px solid #ff3b3b', padding: '0.8rem 2rem', display: 'flex', gap: '1rem', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
            <a href="#" onClick={e=>e.preventDefault()} style={{ color: '#111', textDecoration: 'none', border: '1px solid #ddd', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>ΚΟΙΝΩΝΙΑ</a>
            <a href="#" onClick={e=>e.preventDefault()} style={{ color: '#111', textDecoration: 'none', border: '1px solid #ddd', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>ΠΟΛΙΤΙΚΗ</a>
            <a href="#" onClick={e=>e.preventDefault()} style={{ color: '#111', textDecoration: 'none', border: '1px solid #ddd', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>ΔΙΕΘΝΗ</a>
            <a href="#" onClick={e=>e.preventDefault()} style={{ color: '#111', textDecoration: 'none', border: '1px solid #ddd', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>ΟΙΚΟΝΟΜΙΑ</a>
          </nav>
        </header>
        <div className={themeStyles.mainContent} style={{ marginTop: '2rem' }}>
          <LeftAdSidebar />
          <div className={`${themeStyles.articleBody} ${themeStyles.alphaArticle}`}>
            <h1 className={themeStyles.alphaTitle}>{article.title}</h1>
            <div className={themeStyles.alphaMeta} style={{ margin: '1rem 0 2rem 0' }}>
              <span>{article.category || 'ΕΙΔΗΣΕΙΣ'}</span> <span style={{ marginLeft: '1rem' }}>{articleDate}</span>
            </div>
            {renderMedia('8px')}
            {article.subtitle && <h3 style={{ margin: '2rem 0 1rem', fontSize: '1.4rem', fontWeight: 'bold', color: themeObj.color }}>{article.subtitle}</h3>}
            <div className={styles.fsBody} dangerouslySetInnerHTML={{ __html: article.body }} style={{ marginTop: '1rem', color: 'inherit', fontFamily: 'inherit' }} />
            <BottomAd />
          </div>
          <RightAdSidebar />
        </div>
      </div>
    );
  }

  // 3. ERT
  if (article.theme === 'ERT') {
    return (
      <div className={`${themeStyles.articleWrapper} ${themeStyles.ertWrapper}`}>
        {backBtn}
        <header className={themeStyles.ertHeader} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '0' }}>
          <div style={{ padding: '1rem 2rem', width: '100%' }}>
            <img src={themeObj.logo} alt={themeObj.name} style={{ height: '40px' }} />
          </div>
          <nav style={{ width: '100%', backgroundColor: '#000', padding: '0.8rem 2rem', display: 'flex', gap: '2rem', fontSize: '0.9rem', color: '#fff', fontWeight: 'bold' }}>
            <a href="#" onClick={e=>e.preventDefault()} style={{ color: '#fff', textDecoration: 'none' }}>ΕΛΛΑΔΑ</a>
            <a href="#" onClick={e=>e.preventDefault()} style={{ color: '#fff', textDecoration: 'none' }}>ΠΕΡΙΦΕΡΕΙΑ</a>
            <a href="#" onClick={e=>e.preventDefault()} style={{ color: '#fff', textDecoration: 'none' }}>ΠΟΛΙΤΙΚΗ</a>
            <a href="#" onClick={e=>e.preventDefault()} style={{ color: '#fff', textDecoration: 'none' }}>ΚΟΣΜΟΣ</a>
          </nav>
        </header>
        <div className={themeStyles.mainContent} style={{ marginTop: '2rem' }}>
          <LeftAdSidebar />
          <div className={`${themeStyles.articleBody} ${themeStyles.ertArticle}`}>
            <h1 className={themeStyles.ertTitle}>{article.title}</h1>
            {article.subtitle && <h3 style={{ margin: '1rem 0', fontSize: '1.2rem', color: '#555' }}>{article.subtitle}</h3>}
            <div className={themeStyles.ertMeta} style={{ margin: '1rem 0', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
              <span>{articleDate}</span>
            </div>
            {renderMedia()}
            <div className={styles.fsBody} dangerouslySetInnerHTML={{ __html: article.body }} style={{ marginTop: '2rem', color: 'inherit', fontFamily: 'inherit' }} />
            <BottomAd />
          </div>
          <RightAdSidebar />
        </div>
      </div>
    );
  }

  // 4. MEGA
  if (article.theme === 'MEGA') {
    return (
      <div className={`${themeStyles.articleWrapper} ${themeStyles.megaWrapper}`}>
        {backBtn}
        <header className={themeStyles.megaHeader}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img src={themeObj.logo} alt={themeObj.name} style={{ height: '40px', marginRight: '2rem' }} />
            <nav style={{ display: 'flex', gap: '1.5rem', fontWeight: 'bold' }}>
              <a href="#" onClick={e=>e.preventDefault()} style={{ color: '#fff', textDecoration: 'none' }}>ΕΛΛΑΔΑ</a>
              <a href="#" onClick={e=>e.preventDefault()} style={{ color: '#fff', textDecoration: 'none' }}>ΚΟΣΜΟΣ</a>
              <a href="#" onClick={e=>e.preventDefault()} style={{ color: '#fff', textDecoration: 'none' }}>ΠΟΛΙΤΙΚΗ</a>
              <a href="#" onClick={e=>e.preventDefault()} style={{ color: '#fff', textDecoration: 'none' }}>ΟΙΚΟΝΟΜΙΑ</a>
            </nav>
          </div>
          <div style={{ color: '#cc0000', fontWeight: 'bold' }}>LIVE TV</div>
        </header>
        <div className={themeStyles.mainContent} style={{ marginTop: '2rem' }}>
          <LeftAdSidebar />
          <div className={`${themeStyles.articleBody} ${themeStyles.megaArticle}`}>
            <div className={themeStyles.megaMeta} style={{ marginBottom: '1rem' }}>{articleDate}</div>
            <h1 className={themeStyles.megaTitle}>{article.title}</h1>
            {article.subtitle && <h3 style={{ margin: '1rem 0 2rem', fontSize: '1.4rem', color: '#aaa', fontWeight: 'normal' }}>{article.subtitle}</h3>}
            {renderMedia()}
            <div className={styles.fsBody} dangerouslySetInnerHTML={{ __html: article.body }} style={{ marginTop: '2rem', color: 'inherit', fontFamily: 'inherit' }} />
            <BottomAd />
          </div>
          <RightAdSidebar />
        </div>
      </div>
    );
  }

  // 5. GOSSIP
  if (article.theme === 'GOSSIP') {
    return (
      <div className={`${themeStyles.articleWrapper} ${themeStyles.gossipWrapper}`}>
        {backBtn}
        <header className={themeStyles.gossipHeader} style={{ flexDirection: 'column', padding: '0' }}>
          <div style={{ width: '100%', padding: '1rem', display: 'flex', justifyContent: 'center' }}>
            <img src={themeObj.logo} alt={themeObj.name} style={{ height: '60px', borderRadius: '10px', border: '2px solid #fff' }} />
          </div>
          <nav style={{ width: '100%', backgroundColor: '#ff99cc', padding: '0.8rem', display: 'flex', justifyContent: 'center', gap: '2rem', fontWeight: '900', color: '#fff' }}>
            <a href="#" onClick={e=>e.preventDefault()} style={{ color: '#fff', textDecoration: 'none' }}>SHOWBIZ</a>
            <a href="#" onClick={e=>e.preventDefault()} style={{ color: '#fff', textDecoration: 'none' }}>MEDIA</a>
            <a href="#" onClick={e=>e.preventDefault()} style={{ color: '#fff', textDecoration: 'none' }}>GOSSIP</a>
            <a href="#" onClick={e=>e.preventDefault()} style={{ color: '#fff', textDecoration: 'none' }}>ROYALS</a>
          </nav>
        </header>
        <div className={themeStyles.mainContent} style={{ marginTop: '2rem' }}>
          <LeftAdSidebar />
          <div className={`${themeStyles.articleBody} ${themeStyles.gossipArticle}`}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <span className={themeStyles.gossipMeta}>{articleDate}</span>
            </div>
            <h1 className={themeStyles.gossipTitle} style={{ textAlign: 'center' }}>{article.title}</h1>
            {article.subtitle && <h3 style={{ margin: '1rem 0 2rem', fontSize: '1.2rem', color: '#e6007e', textAlign: 'center' }}>{article.subtitle}</h3>}
            {renderMedia('15px')}
            <div className={styles.fsBody} dangerouslySetInnerHTML={{ __html: article.body }} style={{ marginTop: '2rem', color: 'inherit', fontFamily: 'inherit' }} />
            <BottomAd />
          </div>
          <RightAdSidebar />
        </div>
      </div>
    );
  }

  // 6. SKAI
  if (article.theme === 'SKAI') {
    return (
      <div className={`${themeStyles.articleWrapper} ${themeStyles.skaiWrapper}`}>
        {backBtn}
        <header className={themeStyles.skaiHeader}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img src={themeObj.logo} alt={themeObj.name} style={{ height: '35px', marginRight: '3rem', backgroundColor: '#fff', padding: '5px' }} />
            <nav style={{ display: 'flex', gap: '1.5rem', fontWeight: 'bold' }}>
              <a href="#" onClick={e=>e.preventDefault()} style={{ color: '#004d99', textDecoration: 'none' }}>ΕΛΛΑΔΑ</a>
              <a href="#" onClick={e=>e.preventDefault()} style={{ color: '#004d99', textDecoration: 'none' }}>ΚΟΣΜΟΣ</a>
              <a href="#" onClick={e=>e.preventDefault()} style={{ color: '#004d99', textDecoration: 'none' }}>ΠΟΛΙΤΙΚΗ</a>
              <a href="#" onClick={e=>e.preventDefault()} style={{ color: '#004d99', textDecoration: 'none' }}>ΟΙΚΟΝΟΜΙΑ</a>
              <a href="#" onClick={e=>e.preventDefault()} style={{ color: '#004d99', textDecoration: 'none' }}>ΑΘΛΗΤΙΚΑ</a>
            </nav>
          </div>
        </header>
        <div className={themeStyles.mainContent} style={{ marginTop: '2rem' }}>
          <LeftAdSidebar />
          <div className={`${themeStyles.articleBody} ${themeStyles.skaiArticle}`}>
            <h1 className={themeStyles.skaiTitle}>{article.title}</h1>
            {article.subtitle && <h3 style={{ margin: '1rem 0', fontSize: '1.3rem', color: '#555' }}>{article.subtitle}</h3>}
            <div className={themeStyles.skaiMeta} style={{ margin: '1rem 0 2rem' }}>
              <span style={{ fontWeight: 'bold' }}>Ενημερώθηκε:</span> {articleDate}
            </div>
            {renderMedia()}
            <div className={styles.fsBody} dangerouslySetInnerHTML={{ __html: article.body }} style={{ marginTop: '2rem', color: 'inherit', fontFamily: 'inherit' }} />
            <BottomAd />
          </div>
          <RightAdSidebar />
        </div>
      </div>
    );
  }

  // 7. OPENTV
  if (article.theme === 'OPENTV') {
    return (
      <div className={`${themeStyles.articleWrapper} ${themeStyles.openWrapper}`}>
        {backBtn}
        <header className={themeStyles.openHeader}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img src={themeObj.logo} alt={themeObj.name} style={{ height: '40px', marginRight: '3rem' }} />
            <nav style={{ display: 'flex', gap: '2rem', fontWeight: 'bold' }}>
              <a href="#" onClick={e=>e.preventDefault()} style={{ color: '#fa8301', textDecoration: 'none' }}>NEWS</a>
              <a href="#" onClick={e=>e.preventDefault()} style={{ color: '#fff', textDecoration: 'none' }}>ΕΛΛΑΔΑ</a>
              <a href="#" onClick={e=>e.preventDefault()} style={{ color: '#fff', textDecoration: 'none' }}>ΚΟΣΜΟΣ</a>
              <a href="#" onClick={e=>e.preventDefault()} style={{ color: '#fff', textDecoration: 'none' }}>ΠΟΛΙΤΙΚΗ</a>
            </nav>
          </div>
        </header>
        <div className={themeStyles.mainContent} style={{ marginTop: '2rem' }}>
          <LeftAdSidebar />
          <div className={`${themeStyles.articleBody} ${themeStyles.openArticle}`}>
            <div className={themeStyles.openMeta} style={{ marginBottom: '1rem' }}>{articleDate}</div>
            <h1 className={themeStyles.openTitle}>{article.title}</h1>
            {article.subtitle && <h3 style={{ margin: '1rem 0 2rem', fontSize: '1.4rem', color: '#444' }}>{article.subtitle}</h3>}
            {renderMedia()}
            <div className={styles.fsBody} dangerouslySetInnerHTML={{ __html: article.body }} style={{ marginTop: '2rem', color: 'inherit', fontFamily: 'inherit' }} />
            <BottomAd />
          </div>
          <RightAdSidebar />
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className={styles.page}>
      {backBtn}
      <h2>Unsupported Theme</h2>
    </div>
  );
}
