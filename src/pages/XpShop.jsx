import React, { useState, useEffect, useMemo } from 'react';
import styles from 'styles/CharacterView.module.css';
import { ALL_DISCIPLINE_NAMES } from 'data/disciplines';
import { RITUALS } from 'data/rituals';
import * as xp from 'utils/xpCosts';

// This constant was missing from the original file, causing a reference error.
const SKILLS = {
  Physical: ['Athletics','Brawl','Craft','Drive','Firearms','Larceny','Melee','Stealth','Survival'],
  Social: ['Animal Ken','Etiquette','Insight','Intimidation','Leadership','Performance','Persuasion','Streetwise','Subterfuge'],
  Mental: ['Academics','Awareness','Finance','Investigation','Medicine','Occult','Politics','Science','Technology'],
};

// Main Shop Component
export default function XpShop({ character, sheet, onSpend, onPickDiscipline }) {
    const currentXp = character.xp ?? 0;

    return (
        <section className={styles.section}>
            <div className={styles.sectionTitleWrap}>
                <h3 className={styles.sectionTitle}>XP Shop</h3>
            </div>
            
            <BuyAttribute currentXp={currentXp} attributes={sheet.attributes} onBuy={(args) => onSpend({ type:'attribute', ...args })} />
            <BuySkill currentXp={currentXp} skills={sheet.skills} onBuy={(args) => onSpend({ type:'skill', ...args })} />
            <BuySimple label="New Specialty" hint="Cost: 3 XP" cost={3} currentXp={currentXp} onBuy={target => onSpend({ type:'specialty', target, dots:1 })} options={['Melee: Knives','Persuasion: Bargaining','Science: Biology','Stealth: Urban']} />
            <BuyDiscipline currentXp={currentXp} disciplines={sheet.disciplines} clan={character.clan} onPick={onPickDiscipline} />
            <BuyRitual currentXp={currentXp} sheet={sheet} onBuy={(args) => onSpend({ type: 'ritual', ...args })} />
            <BuyDots label="Advantage (Merit/Background)" hint="3 XP per dot" costPerDot={3} currentXp={currentXp} onBuy={(target, dots) => onSpend({ type:'advantage', target, dots })} />
            <BuyLevel label="Blood Potency" currentLevel={sheet.blood_potency} hint="New level × 10" costMultiplier={10} currentXp={currentXp} onBuy={(args) => onSpend({ type:'blood_potency', ...args })} />
        </section>
    );
}

// ----- Subcomponents for each purchase type -----

function BuyAttribute({ currentXp, attributes, onBuy }) {
    const options = useMemo(() => ['Strength','Dexterity','Stamina','Charisma','Manipulation','Composure','Intelligence','Wits','Resolve'], []);
    const [target, setTarget] = useState(options[0]);
    const current = useMemo(() => attributes?.[target] || 0, [attributes, target]);
    const next = current + 1;
    
    const cost = xp.calculateAttributeCost(next);
    const canAfford = currentXp >= cost && next <= 5;

    return (
        <div className={`${styles.card} ${!canAfford ? styles.disabled : ''}`}>
            <div className={styles.cardHead}><b>Increase Attribute</b> <small className={styles.muted}>— {xp.calculateAttributeCost('N')} XP</small></div>
            <div className={styles.rowForm}>
                <select className={styles.input} value={target} onChange={e => setTarget(e.target.value)}>
                    {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <span className={styles.dim}>Level: {current} → {next}</span>
                <span className={styles.costText}>Cost: {cost} XP</span>
                <button className={styles.cta} disabled={!canAfford} onClick={() => onBuy({ target, currentLevel: current, newLevel: next })}>Buy</button>
            </div>
        </div>
    );
}

function BuySkill({ currentXp, skills, onBuy }) {
    const options = useMemo(() => Object.keys(SKILLS).flatMap(g => SKILLS[g]).sort(), []);
    const [target, setTarget] = useState(options[0]);
    const current = useMemo(() => skills?.[target]?.dots || 0, [skills, target]);
    const next = current + 1;
    
    const cost = xp.calculateSkillCost(next);
    const canAfford = currentXp >= cost && next <= 5;

    return (
        <div className={`${styles.card} ${!canAfford ? styles.disabled : ''}`}>
            <div className={styles.cardHead}><b>Increase Skill</b> <small className={styles.muted}>— {xp.calculateSkillCost('N')} XP</small></div>
            <div className={styles.rowForm}>
                <select className={styles.input} value={target} onChange={e => setTarget(e.target.value)}>
                    {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <span className={styles.dim}>Level: {current} → {next}</span>
                <span className={styles.costText}>Cost: {cost} XP</span>
                <button className={styles.cta} disabled={!canAfford} onClick={() => onBuy({ target, currentLevel: current, newLevel: next })}>Buy</button>
            </div>
        </div>
    );
}

function BuySimple({ label, hint, cost, currentXp, options, onBuy }) {
    const [target, setTarget] = useState(options[0]);
    const canAfford = currentXp >= cost;

    return (
        <div className={`${styles.card} ${!canAfford ? styles.disabled : ''}`}>
            <div className={styles.cardHead}><b>{label}</b> <small className={styles.muted}>— {hint}</small></div>
            <div className={styles.rowForm}>
                <input className={styles.input} value={target} onChange={e=>setTarget(e.target.value)} list={`${label}-options`} placeholder="e.g., Finance: Stock Market"/>
                <datalist id={`${label}-options`}>
                    {options.map(o=><option key={o} value={o}/>)}
                </datalist>
                <span className={styles.costText}>Cost: {cost} XP</span>
                <button className={styles.cta} disabled={!canAfford} onClick={()=>onBuy(target)}>Buy</button>
            </div>
        </div>
    );
}

function BuyDiscipline({ currentXp, disciplines, clan, onPick }) {
  const [name, setName] = useState(ALL_DISCIPLINE_NAMES[0]);
  const [kind, setKind] = useState('clan');
  const current = useMemo(() => disciplines?.[name] || 0, [disciplines, name]);
  const next = current + 1;

  const cost = xp.calculateDisciplineCost(next, kind);
  const canAfford = currentXp >= cost && next <= 5;

  return (
    <div className={`${styles.card} ${!canAfford ? styles.disabled : ''}`}>
      <div className={styles.cardHead}><b>Discipline</b> <small className={styles.muted}>— Clan: N×5, Other: N×7</small></div>
      <div className={styles.rowForm}>
        <select className={styles.input} value={name} onChange={(e)=>setName(e.target.value)}>
          {ALL_DISCIPLINE_NAMES.map(n => <option key={n}>{n}</option>)}
        </select>
        <select className={styles.input} value={kind} onChange={e=>setKind(e.target.value)} style={{flex:'0 1 120px'}}>
          <option value="clan">Clan</option>
          <option value="other">Other</option>
          <option value="caitiff">Caitiff</option>
        </select>
        <span className={styles.dim}>Level: {current} → {next}</span>
        <span className={styles.costText}>Cost: {cost} XP</span>
        <button className={styles.cta} disabled={!canAfford} onClick={()=>onPick({ name, current, next, kind, assignOnly: false })}>Select Power & Buy</button>
      </div>
    </div>
  );
}

function BuyRitual({ currentXp, sheet, onBuy }) {
    const [kind, setKind] = useState('blood_sorcery');
    const allRituals = useMemo(() => Object.values(RITUALS[kind].levels).flat(), [kind]);
    const [target, setTarget] = useState(allRituals[0]?.id);

    const selectedRitual = useMemo(() => allRituals.find(r => r.id === target), [allRituals, target]);
    const level = selectedRitual?.level ?? 1;
    const cost = xp.calculateRitualCost(level);

    const hasDiscipline = (kind === 'blood_sorcery' && (sheet.disciplines?.['Blood Sorcery'] || 0) > 0) || (kind === 'oblivion' && (sheet.disciplines?.['Oblivion'] || 0) > 0);
    const canAfford = currentXp >= cost && hasDiscipline;

    useEffect(() => {
        setTarget(Object.values(RITUALS[kind].levels).flat()[0].id);
    }, [kind]);

    return (
        <div className={`${styles.card} ${!canAfford ? styles.disabled : ''}`}>
            <div className={styles.cardHead}><b>Ritual or Ceremony</b> <small className={styles.muted}>— Level × 3 XP</small></div>
            {!hasDiscipline && <div className={styles.alertWarning}>Requires at least one dot in {kind === 'blood_sorcery' ? 'Blood Sorcery' : 'Oblivion'} to purchase.</div>}
            <div className={styles.rowForm}>
                <select className={styles.input} value={kind} onChange={e => { setKind(e.target.value); }} style={{flex:'0 1 180px'}}>
                    <option value="blood_sorcery">Blood Sorcery</option>
                    <option value="oblivion">Oblivion</option>
                </select>
                <select className={styles.input} value={target} onChange={e => setTarget(e.target.value)}>
                    {Object.entries(RITUALS[kind].levels).map(([lvl, rituals]) => (
                        <optgroup key={lvl} label={`Level ${lvl}`}>
                            {rituals.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </optgroup>
                    ))}
                </select>
                <span className={styles.costText}>Cost: {cost} XP</span>
                <button className={styles.cta} disabled={!canAfford} onClick={() => onBuy({ name: selectedRitual.name, ritualId: target, ritualLevel: level, ritualType: kind })}>Buy</button>
            </div>
        </div>
    );
}

function BuyDots({ label, hint, costPerDot, currentXp, onBuy }) {
  const [name, setName] = useState('Allies');
  const [dots, setDots] = useState(1);
  const cost = xp.calculateAdvantageCost(dots);
  const canAfford = currentXp >= cost;

  return (
    <div className={`${styles.card} ${!canAfford ? styles.disabled : ''}`}>
      <div className={styles.cardHead}><b>{label}</b> <small className={styles.muted}>— {hint}</small></div>
      <div className={styles.rowForm}>
        <input className={styles.input} value={name} onChange={e=>setName(e.target.value)} placeholder="Advantage Name"/>
        <input className={styles.input} type="number" value={dots} min={1} max={5} onChange={e=>setDots(Number(e.target.value))} title="Dots" style={{flex:'0 1 100px'}}/>
        <span className={styles.costText}>Cost: {cost} XP</span>
        <button className={styles.cta} disabled={!canAfford} onClick={()=>onBuy(name, dots)}>Buy</button>
      </div>
    </div>
  );
}

function BuyLevel({ label, hint, costMultiplier, currentLevel, currentXp, onBuy }) {
  const next = (currentLevel || 0) + 1;
  const cost = xp.calculateBloodPotencyCost(next);
  const canAfford = currentXp >= cost && next <= 10;

  return (
    <div className={`${styles.card} ${!canAfford ? styles.disabled : ''}`}>
      <div className={styles.cardHead}><b>{label}</b> <small className={styles.muted}>— {hint}</small></div>
      <div className={styles.rowForm}>
         <span className={styles.dim}>Level: {currentLevel} → {next}</span>
        <span className={styles.costText}>Cost: {cost} XP</span>
        <button className={styles.cta} disabled={!canAfford} onClick={()=>onBuy({ currentLevel: currentLevel, newLevel: next })}>Buy</button>
      </div>
    </div>
  );
}

