import React, { useEffect, useMemo, useState } from 'react';
import api from '../api';
import '../styles/CharacterView.css';

export default function CharacterView() {
  const [ch, setCh] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/characters/me').then(r => setCh(r.data.character));
  }, []);

  const clanList = useMemo(() => {
    try { return ch?.sheet?.disciplines ? Object.keys(ch.sheet.disciplines) : []; } catch { return []; }
  }, [ch]);

  async function spendXP(payload) {
    setErr(''); setMsg('');
    try {
      const { data } = await api.post('/characters/xp/spend', payload);
      setCh(data.character);
      setMsg(`Spent ${data.spent} XP.`);
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to spend XP');
    }
  }

  if (!ch) return null;

  return (
    <div className="character-view">
      <h2>{ch.name} ({ch.clan}) — XP: {ch.xp ?? 0}</h2>
      {err && <div className="alert-error">{err}</div>}
      {msg && <div className="alert-ok">{msg}</div>}

      <h3>XP Shop</h3>

      <BuyRow
        label="Increase Attribute"
        hint="New level × 5"
        onBuy={(target, current, next) => spendXP({ type:'attribute', target, currentLevel: current, newLevel: next })}
        options={['Strength','Dexterity','Stamina','Charisma','Manipulation','Composure','Intelligence','Wits','Resolve']}
      />

      <BuyRow
        label="Increase Skill"
        hint="New level × 3"
        onBuy={(target, current, next) => spendXP({ type:'skill', target, currentLevel: current, newLevel: next })}
        options={[
          'Athletics','Brawl','Craft','Drive','Firearms','Larceny','Melee','Stealth','Survival',
          'Animal Ken','Etiquette','Insight','Intimidation','Leadership','Performance','Persuasion','Streetwise','Subterfuge',
          'Academics','Awareness','Finance','Investigation','Medicine','Occult','Politics','Science','Technology'
        ]}
      />

      <BuySimple
        label="New Specialty"
        hint="Cost 3"
        onBuy={(target) => spendXP({ type:'specialty', target, dots:1 })}
        options={['Melee: Knives','Persuasion: Bargaining','Science: Biology','Stealth: Urban','Brawl: Clinch']}
      />

      <BuyDiscipline
        onBuyClan={(name, current, next) => spendXP({ type:'discipline', disciplineKind:'clan', target:name, currentLevel: current, newLevel: next })}
        onBuyOther={(name, current, next) => spendXP({ type:'discipline', disciplineKind:'other', target:name, currentLevel: current, newLevel: next })}
        onBuyCaitiff={(name, current, next) => spendXP({ type:'discipline', disciplineKind:'caitiff', target:name, currentLevel: current, newLevel: next })}
      />

      <BuyRitual onBuy={(lvl)=>spendXP({ type:'ritual', ritualLevel:lvl })}/>
      <BuyThinFormula onBuy={(lvl)=>spendXP({ type:'thin_blood_formula', formulaLevel:lvl })}/>
      <BuyDots
        label="Advantage (Merit/Background)"
        hint="3 per dot"
        onBuy={(name, dots)=>spendXP({ type:'advantage', target:name, dots })}
      />
      <BuyLevel
        label="Blood Potency"
        hint="New level × 10"
        onBuy={(current, next)=>spendXP({ type:'blood_potency', currentLevel: current, newLevel: next })}
      />
    </div>
  );
}

/* --- Subcomponents --- */
function BuyRow({ label, hint, options, onBuy }) {
  const [target, setTarget] = useState(options[0]);
  const [current, setCurrent] = useState(1);
  const [next, setNext] = useState(2);
  return (
    <div className="buy-card">
      <b>{label}</b> — <small>{hint}</small><br/>
      <select value={target} onChange={e=>setTarget(e.target.value)}>
        {options.map(o=><option key={o}>{o}</option>)}
      </select>
      Current:
      <input type="number" value={current} min={0} max={5} onChange={e=>setCurrent(Number(e.target.value))}/>
      New:
      <input type="number" value={next} min={1} max={5} onChange={e=>setNext(Number(e.target.value))}/>
      <button onClick={()=>onBuy(target, current, next)}>Buy</button>
    </div>
  );
}

function BuySimple({ label, hint, options, onBuy }) {
  const [target, setTarget] = useState(options[0]);
  return (
    <div className="buy-card">
      <b>{label}</b> — <small>{hint}</small><br/>
      <input value={target} onChange={e=>setTarget(e.target.value)} list="specs"/>
      <datalist id="specs">
        {options.map(o=><option key={o} value={o}/>)}
      </datalist>
      <button onClick={()=>onBuy(target)}>Buy</button>
    </div>
  );
}

function BuyDiscipline({ onBuyClan, onBuyOther, onBuyCaitiff }) {
  const [name, setName] = useState('Presence');
  const [current, setCurrent] = useState(1);
  const [next, setNext] = useState(2);
  return (
    <div className="buy-card">
      <b>Discipline</b> — <small>Clan: new×5 • Other: new×7 • Caitiff: new×6</small><br/>
      <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g., Presence"/>
      Current:
      <input type="number" value={current} min={0} max={5} onChange={e=>setCurrent(Number(e.target.value))}/>
      New:
      <input type="number" value={next} min={1} max={5} onChange={e=>setNext(Number(e.target.value))}/>
      <button onClick={()=>onBuyClan(name, current, next)}>Buy (Clan)</button>
      <button onClick={()=>onBuyOther(name, current, next)}>Buy (Other)</button>
      <button onClick={()=>onBuyCaitiff(name, current, next)}>Buy (Caitiff)</button>
    </div>
  );
}

function BuyRitual({ onBuy }) {
  const [lvl, setLvl] = useState(1);
  return (
    <div className="buy-card">
      <b>Blood Sorcery Ritual</b> — <small>level×3</small><br/>
      Level: <input type="number" value={lvl} min={1} max={5} onChange={e=>setLvl(Number(e.target.value))}/>
      <button onClick={()=>onBuy(lvl)}>Buy</button>
    </div>
  );
}

function BuyThinFormula({ onBuy }) {
  const [lvl, setLvl] = useState(1);
  return (
    <div className="buy-card">
      <b>Thin-blood Formula</b> — <small>level×3</small><br/>
      Level: <input type="number" value={lvl} min={1} max={5} onChange={e=>setLvl(Number(e.target.value))}/>
      <button onClick={()=>onBuy(lvl)}>Buy</button>
    </div>
  );
}

function BuyDots({ label, hint, onBuy }) {
  const [name, setName] = useState('Allies');
  const [dots, setDots] = useState(1);
  return (
    <div className="buy-card">
      <b>{label}</b> — <small>{hint}</small><br/>
      Name: <input value={name} onChange={e=>setName(e.target.value)}/>
      Dots: <input type="number" value={dots} min={1} max={5} onChange={e=>setDots(Number(e.target.value))}/>
      <button onClick={()=>onBuy(name, dots)}>Buy</button>
    </div>
  );
}

function BuyLevel({ label, hint, onBuy }) {
  const [curr, setCurr] = useState(1);
  const [next, setNext] = useState(2);
  return (
    <div className="buy-card">
      <b>{label}</b> — <small>{hint}</small><br/>
      Current: <input type="number" value={curr} min={0} max={10} onChange={e=>setCurr(Number(e.target.value))}/>
      New: <input type="number" value={next} min={1} max={10} onChange={e=>setNext(Number(e.target.value))}/>
      <button onClick={()=>onBuy(curr, next)}>Buy</button>
    </div>
  );
}
