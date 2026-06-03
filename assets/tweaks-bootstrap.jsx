/* ============================================================
   YA HSIU — Tweaks bootstrap (font pairings)
   Mounted into #tweaks-root on every page.
   ============================================================ */

const FONT_PAIRINGS = [
  { id: 'poppins',  name: '圓潤幾何', note: 'Poppins · Lato',        display: 'Poppins',       body: 'Lato' },
  { id: 'jost',     name: '俐落幾何', note: 'Jost · Karla',          display: 'Jost',          body: 'Karla' },
  { id: 'quicksand',name: '柔和圓體', note: 'Quicksand · Nunito Sans',display: 'Quicksand',     body: 'Nunito Sans' },
  { id: 'grotesk',  name: '當代中性', note: 'Space Grotesk · IBM Plex',display: 'Space Grotesk', body: 'IBM Plex Sans' },
];

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "pairing": "poppins"
}/*EDITMODE-END*/;

const LS_KEY = 'yahsiu.tweaks';

function applyPairing(id) {
  const p = FONT_PAIRINGS.find((x) => x.id === id) || FONT_PAIRINGS[0];
  const r = document.documentElement.style;
  r.setProperty('--font-display', p.display);
  r.setProperty('--font-body', p.body);
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      pairing: id, fontDisplay: p.display, fontBody: p.body,
    }));
  } catch (e) {}
}

function readSavedPairing() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const t = JSON.parse(raw);
      if (t.pairing) return t.pairing;
    }
  } catch (e) {}
  return TWEAK_DEFAULTS.pairing;
}

function FontPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {FONT_PAIRINGS.map((p) => {
        const active = p.id === value;
        return (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 12, textAlign: 'left', cursor: 'default',
              padding: '10px 12px', borderRadius: 10,
              border: active ? '1.5px solid #b6853f' : '1px solid rgba(41,38,27,.14)',
              background: active ? 'rgba(182,133,63,.10)' : 'rgba(255,255,255,.55)',
              transition: 'all .15s ease',
            }}
          >
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontWeight: 600, fontSize: 12, color: '#29261b' }}>{p.name}</span>
              <span style={{ fontSize: 10, color: 'rgba(41,38,27,.5)', letterSpacing: '.02em' }}>{p.note}</span>
            </span>
            <span style={{
              fontFamily: `'${p.display}', sans-serif`, fontWeight: 700,
              fontSize: 22, lineHeight: 1, color: active ? '#9c6f31' : '#29261b',
            }}>Aa</span>
          </button>
        );
      })}
    </div>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // On mount, reconcile with cross-page localStorage choice.
  React.useEffect(() => {
    const saved = readSavedPairing();
    applyPairing(saved);
    if (saved !== t.pairing) setTweak('pairing', saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = (id) => {
    setTweak('pairing', id);
    applyPairing(id);
  };

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="字體配對 · Typeface" />
      <FontPicker value={t.pairing} onChange={choose} />
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById('tweaks-root')).render(<App />);
