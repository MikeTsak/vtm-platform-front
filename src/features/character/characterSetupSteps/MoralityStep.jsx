import React from 'react';
import styles from '../../../styles/CharacterSetup.module.css';
import { Field, RandomizeButton } from './StepHelpers';
import { PREDATOR_TYPES } from '../../../data/predator_types';

const RULES = {
  humanity: 7,
  bloodPotency: 1
};

// A wider, generic pool — a Conviction is the principle, the Touchstone is
// the person that keeps it real. One click fills both.
const MORALITY_SEEDS = [
  { conviction: 'Never harm a child, mortal or Kindred.', touchstone: 'A younger sibling who still thinks you moved away.' },
  { conviction: 'I pay every debt I owe, in kind.', touchstone: 'The mentor who vouched for you before the Prince.' },
  { conviction: 'The Masquerade comes before my own comfort.', touchstone: 'A beat cop who trusts you more than she should.' },
  { conviction: "I protect those who can't protect themselves.", touchstone: "A shelter volunteer who doesn't know what you are." },
  { conviction: "I never feed from someone who hasn't consented, one way or another.", touchstone: 'A regular at your usual haunt who always says yes.' },
  { conviction: 'Family, blood or found, comes first.', touchstone: 'A childe you swore to protect no matter the cost.' },
  { conviction: 'I keep the promises I made before the Embrace.', touchstone: 'A mortal friend you swore never to abandon.' },
  { conviction: 'Knowledge is worth more than blood.', touchstone: 'A researcher whose work you quietly fund and protect.' },
  { conviction: 'I never let the Beast choose who I hurt.', touchstone: 'Someone you almost hurt once, and never want to again.' },
  { conviction: 'This city is mine to protect, not to feed on carelessly.', touchstone: 'A neighborhood watch organizer who trusts the streets are safer with you around.' },
  { conviction: 'I answer cruelty with mercy, even when it costs me.', touchstone: 'Someone who wronged you badly, and whom you forgave anyway.' },
  { conviction: 'My word is worth more than my safety.', touchstone: 'A business partner who has no idea what they actually owe you.' },
];

// Predator Type is the clearest signal of who a character actually
// encounters night to night — so it drives the most "connects with the
// character" touchstone suggestion.
const PREDATOR_TOUCHSTONE_HINTS = {
  Alleycat: { conviction: 'I only take from those who can afford to lose it.', touchstone: 'A mugging victim who never saw your face — you make sure of it.' },
  Bagger: { conviction: "I never take from the living if I don't have to.", touchstone: 'A blood bank employee who looks the other way for you.' },
  'Blood Leech': { conviction: 'I never diablerize the innocent.', touchstone: "A Kindred elder who suspects what you've done — and hasn't reported it yet." },
  Cleaver: { conviction: 'My family never finds out what I am.', touchstone: "The family member you still visit, pretending nothing's changed." },
  Consensualist: { conviction: 'No one feeds me without saying yes.', touchstone: 'A regular donor who trusts you completely.' },
  Farmer: { conviction: "I don't drink from people, not anymore.", touchstone: 'An animal shelter volunteer who thinks you just love the work.' },
  Osiris: { conviction: 'I never break the faith my followers place in me.', touchstone: "A devoted follower who'd die for you — and doesn't know why." },
  Sandman: { conviction: 'I never take more than they would miss.', touchstone: 'Someone who sleeps peacefully every night, never knowing you were there.' },
  'Scene Queen': { conviction: 'The scene stays safe, even from us.', touchstone: 'A young regular at the club who looks up to you.' },
  Siren: { conviction: "I never seduce someone who wouldn't have said yes anyway.", touchstone: 'A former lover who still wonders why you left.' },
  Extortionist: { conviction: 'I only squeeze those who can afford it.', touchstone: 'A small business owner who pays your "protection" fee — and actually needs the protection.' },
  Graverobber: { conviction: "I don't disturb the recently mourned.", touchstone: 'A mortician who looks the other way, for a price.' },
  'Roadside Killer': { conviction: 'Never twice on the same stretch of road.', touchstone: 'A trucker who picked you up once and never forgot the favor.' },
  'Grim Reaper': { conviction: 'Only the dying, never the living.', touchstone: 'A hospice nurse who suspects more than she says.' },
  Montero: { conviction: 'The hunt is a partnership, not a betrayal.', touchstone: 'The Kindred who hunts beside you and trusts you not to feed on them.' },
  Pursuer: { conviction: 'I finish what I start, cleanly.', touchstone: 'A target you let go, once, and still think about.' },
  Trapdoor: { conviction: 'My haven is sacred; what happens there stays there.', touchstone: 'Someone who visited your haven once and never mentions it.' },
  'Tithe Collector': { conviction: 'I take my due and nothing more.', touchstone: "A mortal 'client' who pays their tithe gladly, not knowing what it costs them." },
};

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

export default function MoralityStep({
  tenets, setTenets,
  humanity,
  predatorType,
  convictions, setConvictions,
  touchstones, setTouchstones,
  bloodPotency,
  step, setStep
}) {
  const predatorEffects = PREDATOR_TYPES[predatorType]?.effects || {};
  const humanityMod = typeof predatorEffects.humanity === 'number' ? predatorEffects.humanity : 0;
  const derivedHumanity = Math.max(1, Math.min(10, (humanity ?? RULES.humanity) + humanityMod));

  const predatorSeed = PREDATOR_TOUCHSTONE_HINTS[predatorType] || null;
  const suggestionPool = predatorSeed ? [predatorSeed, ...MORALITY_SEEDS] : MORALITY_SEEDS;

  const applySeed = (seed) => {
    setConvictions(prev => {
      const filled = [...prev];
      const idx = filled.findIndex(c => !c);
      if (idx > -1) filled[idx] = seed.conviction; else filled.push(seed.conviction);
      return filled;
    });
    setTouchstones(prev => {
      const filled = [...prev];
      const idx = filled.findIndex(t => !t);
      if (idx > -1) filled[idx] = seed.touchstone; else filled.push(seed.touchstone);
      return filled;
    });
  };

  return (
    <section>
      <div className={styles.stepHeader}>
        <div>
          <h3 className={styles.sectionTitle} style={{ marginBottom: 4, borderBottom: 'none', paddingBottom: 0 }}>Touchstones & Morality</h3>
          <p className={`${styles.muted} ${styles.smallFlavor}`} style={{ textAlign: 'left', marginBottom: 0 }}>Remember what keeps the Beast at bay.</p>
        </div>
        <div className={styles.stepHeaderActions}>
          <RandomizeButton onClick={()=>applySeed(pickRandom(suggestionPool))} />
        </div>
      </div>

      {predatorSeed && (
        <div className={styles.cardIsh} style={{ marginBottom: 12 }}>
          <p className={styles.muted} style={{ margin: '0 0 8px' }}>
            <b>Suggested for a {predatorType}:</b> touchstones built around how your character actually feeds.
          </p>
          <button
            type="button"
            className={`${styles.tab} ${styles.tabActive}`}
            style={{ textAlign: 'left', whiteSpace: 'normal', display: 'block' }}
            onClick={()=>applySeed(predatorSeed)}
          >
            {predatorSeed.touchstone}
          </button>
        </div>
      )}

      <div className={styles.tabs} style={{ margin: '10px 0' }}>
        <span className={styles.muted} style={{ alignSelf: 'center', marginRight: 4 }}>More suggestions:</span>
        {MORALITY_SEEDS.slice(0, 6).map(seed => (
          <button key={seed.conviction} type="button" className={styles.tab} onClick={()=>applySeed(seed)} title={seed.touchstone}>
            {seed.conviction.slice(0, 28)}…
          </button>
        ))}
      </div>

      <div className={styles.grid2}>
        <Field label="Chronicle Tenets">
          <textarea className={styles.input} rows={3} value={tenets} onChange={e=>setTenets(e.target.value)} placeholder="List your chronicle’s tenets…" />
        </Field>
        <Field label="Humanity">
          <div className={styles.input} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'default' }}>
            <b>{derivedHumanity}</b>
            <small className={styles.muted}>
              {humanityMod !== 0
                ? `${humanity ?? RULES.humanity} base ${humanityMod > 0 ? '+' : ''}${humanityMod} from ${predatorType}`
                : 'Standard starting Humanity'}
            </small>
          </div>
        </Field>
        <Field label="Convictions">
          {convictions.map((c,i)=>(
            <div key={i} className={styles.flexRow}>
              <input className={styles.input} value={c} onChange={e=>setConvictions(p=>p.map((x,idx)=>idx===i?e.target.value:x))} placeholder="e.g., Never harm children" />
              <button className={styles.ghostBtn} type="button" onClick={()=>setConvictions(p=>p.filter((_,idx)=>idx!==i))}>Remove</button>
            </div>
          ))}
          <button className={styles.ghostBtn} type="button" onClick={()=>setConvictions(p=>[...p,''])}>+ Add Conviction</button>
        </Field>
        <Field label="Touchstones">
          {touchstones.map((t,i)=>(
            <div key={i} className={styles.flexRow}>
              <input className={styles.input} value={t} onChange={e=>setTouchstones(p=>p.map((x,idx)=>idx===i?e.target.value:x))} placeholder="A mortal tied to a conviction" />
              <button className={styles.ghostBtn} type="button" onClick={()=>setTouchstones(p=>p.filter((_,idx)=>idx!==i))}>Remove</button>
            </div>
          ))}
          <button className={styles.ghostBtn} type="button" onClick={()=>setTouchstones(p=>[...p,''])}>+ Add Touchstone</button>
        </Field>
        <Field label="Blood Potency">
          <div className={styles.input} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'default' }}>
            <b>{bloodPotency ?? RULES.bloodPotency}</b>
            <small className={styles.muted}>Fixed at character creation</small>
          </div>
        </Field>
      </div>
      <div className={styles.navRow}>
        <button className={styles.ghostBtn} type="button" onClick={()=>setStep(7)}>Back</button>
        <button className={styles.cta} type="button" onClick={()=>setStep(9)}>Next</button>
      </div>
    </section>
  );
}
