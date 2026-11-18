const fs = require('fs');
const cssPath = 'x:/Projects/Vampire Platform/front/src/styles/Home.module.css';

const newCss = `
/* =========================================
   NEW STITCH REDESIGN LAYOUT
   ========================================= */
.dashboardLayout {
  max-width: 1300px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
  align-items: start;
}

.mainColumn {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.sidebarColumn {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* OVERRIDE IDENTITY HEADER */
.identityHeader {
  background: #161515;
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid #333;
  margin-bottom: 0;
}

.neonateLabel {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
}

.charSub {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.headerStats {
  margin-left: auto;
  text-align: right;
}

.statBox {
  display: flex;
  flex-direction: column;
}

.statLabel {
  font-size: 0.7rem;
  text-transform: uppercase;
  color: var(--text-muted);
}

.statValue {
  font-size: 2rem;
  font-weight: 700;
  color: #fca5a5; /* Bright red/pinkish from mock */
}

.quotaBar {
  margin-top: 1.5rem;
  border-top: 1px solid #333;
  padding-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.quotaTrackWrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.quotaTrack {
  flex: 1;
  height: 6px;
  background: #222;
  border-radius: 3px;
  overflow: hidden;
}

.quotaFill {
  height: 100%;
  background: #555;
}

/* EVENT CARD */
.eventCard {
  background: #e8dbce;
  color: #222;
  border-radius: 4px;
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
}

.eventHeader {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 0 0 0.5rem 0;
  color: #555;
}

.eventTitle {
  font-family: 'Playfair Display', serif;
  font-size: 1.5rem;
  margin: 0 0 0.5rem 0;
}

.eventLocation {
  font-size: 0.9rem;
  margin: 0;
}

.rsvpBtn {
  background: #111;
  color: #fff;
  border: 1px solid #fca5a5;
  box-shadow: 0 0 10px rgba(252, 165, 165, 0.4);
  padding: 0.5rem 1.5rem;
  border-radius: 4px;
  font-weight: 700;
  text-transform: uppercase;
  cursor: pointer;
}

/* NAV GRID OVERRIDE */
.navGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.navCard {
  background: #ddd;
  color: #111;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  border-radius: 4px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.2s;
  box-shadow: inset 0 0 20px rgba(255,255,255,0.5);
}
.navCard:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(255,255,255,0.2);
}

.navCardIcon {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.navCardTitle {
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.malkCard {
  background: #111;
  color: #fca5a5;
  border: 1px solid #fca5a5;
  box-shadow: 0 0 15px rgba(252, 165, 165, 0.3);
}

/* BOTTOM ROW */
.bottomRowGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.chronicleEntryCard {
  background: #e8dbce;
  color: #222;
  padding: 1.5rem;
  border-radius: 4px;
}

.chronicleEntryLabel {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 0 0 1rem 0;
  color: #555;
}

.chronicleEntryText {
  font-size: 0.9rem;
  line-height: 1.5;
  margin-bottom: 1rem;
}

.readMore {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  cursor: pointer;
}

.restrictedCard {
  background: #111;
  border: 1px solid #333;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: #f00;
  font-weight: 700;
  letter-spacing: 0.1em;
}

/* STATUS PROTOCOL SIDEBAR */
.statusProtocolCard {
  background: #161515;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 1.5rem;
}

.sidebarHeader {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 0 0 1.5rem 0;
  color: var(--text-muted);
}

.statusBars {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.hungerSection {
  margin-bottom: 1.5rem;
  border-top: 1px solid #333;
  padding-top: 1rem;
}

.hungerLabel {
  display: block;
  font-size: 0.7rem;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}

.hungerDrops {
  display: flex;
  gap: 0.5rem;
}

.dropActive {
  color: #f00;
}

.dropInactive {
  opacity: 0.3;
}

.quickStatsSection {
  border-top: 1px solid #333;
  padding-top: 1rem;
}

.quickStatsLabel {
  display: block;
  font-size: 0.7rem;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}

.quickStatsGrid {
  display: flex;
  justify-content: space-between;
}

.qsItem {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.qsName {
  font-size: 0.65rem;
  color: var(--text-muted);
  margin-bottom: 0.25rem;
}

.qsDots {
  font-size: 0.8rem;
  color: #fca5a5;
  letter-spacing: 2px;
}

/* TABS SIDEBAR */
.sidebarFeedCard {
  background: #161515;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 1.5rem;
}

.feedTabs {
  display: flex;
  gap: 1rem;
  border-bottom: 1px solid #333;
  margin-bottom: 1rem;
}

.feedTab {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.5rem 0;
  cursor: pointer;
  text-transform: uppercase;
}

.feedTabActive {
  color: #fca5a5;
  border-bottom: 2px solid #fca5a5;
}

.feedContent {
  max-height: 400px;
  overflow-y: auto;
}

.feedContent::-webkit-scrollbar {
  width: 4px;
}
.feedContent::-webkit-scrollbar-track {
  background: rgba(0,0,0,0.1);
}
.feedContent::-webkit-scrollbar-thumb {
  background: #333;
}
`;

const currentCss = fs.readFileSync(cssPath, 'utf8');
fs.writeFileSync(cssPath, currentCss + '\n' + newCss);
