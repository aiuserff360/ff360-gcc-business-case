import { useCallback, useEffect, useMemo, useState } from 'react';
import { Sidebar, TopBar, Stepper, NAV, INPUT_NAV } from './components/Shell.jsx';
import { Dialog } from './components/ui.jsx';
import { Login } from './screens/Login.jsx';
import { Setup } from './screens/Setup.jsx';
import { Headcount } from './screens/Headcount.jsx';
import { People } from './screens/People.jsx';
import { RealEstate } from './screens/RealEstate.jsx';
import { Technology } from './screens/Technology.jsx';
import { CenterOps } from './screens/CenterOps.jsx';
import { Summaries } from './screens/Summaries.jsx';
import { Results } from './screens/Results.jsx';
import { Sensitivity } from './screens/Sensitivity.jsx';
import { compute } from './model/engine.js';
import { createDefaultModel, resizeModel, benchmarkEntries, convertModelCurrency, fxRate, FX } from './model/defaults.js';
import { loadWorkspace, saveWorkspace, loadSession, saveSession, clearSession, createScenario, exportScenarioJson, exportResultsCsv, readScenarioFile } from './model/storage.js';

const SCREENS = { setup: Setup, headcount: Headcount, people: People, realEstate: RealEstate, technology: Technology, center: CenterOps, summaries: Summaries, results: Results, sensitivity: Sensitivity };
const BENCH_ENTRIES = benchmarkEntries();
const has = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));

function navFromHash() {
  const [module, page] = window.location.hash.replace(/^#\/?/, '').split('/');
  const item = NAV.find((n) => n.key === module);
  if (!item) return { module: 'setup', page: null };
  const validPage = item.pages.find(([k]) => k === page)?.[0] ?? item.pages[0]?.[0] ?? null;
  return { module, page: validPage };
}

export default function App() {
  const [session, setSession] = useState(() => loadSession());
  const [workspace, setWorkspace] = useState(() => loadWorkspace());
  const [nav, setNav] = useState(() => navFromHash());
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState('');
  const [dialog, setDialog] = useState(null);
  const ask = useCallback((spec) => new Promise((resolve) => setDialog({ ...spec, resolve })), []);
  const closeDialog = useCallback((result) => { setDialog((d) => { d?.resolve(result); return null; }); }, []);

  const active = workspace.scenarios.find((s) => s.id === workspace.activeId) || workspace.scenarios[0];
  const model = active.model;
  const results = useMemo(() => compute(model), [model]);

  useEffect(() => { saveWorkspace(workspace); }, [workspace]);
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [nav.module, nav.page]);
  useEffect(() => {
    const onHash = () => setNav(navFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const setActiveModel = useCallback((fn) => {
    setDirty(true);
    setWorkspace((ws) => ({
      ...ws,
      scenarios: ws.scenarios.map((s) => (s.id === ws.activeId ? { ...s, model: resizeModel(fn(structuredClone(s.model))) } : s)),
    }));
  }, []);

  const update = useCallback((path, value) => setActiveModel((draft) => {
    if (path.length === 2 && path[0] === 'settings' && path[1] === 'currency') {
      const from = draft.settings.currency;
      const n = convertModelCurrency(draft, from, value);
      setToast(`Converted ${n} amounts from ${from} to ${value} at 1 ${from} = ${fxRate(from, value).toLocaleString('en-US', { maximumFractionDigits: 4 })} ${value} (ECB, ${FX.asOf})`);
      return draft;
    }
    let target = draft;
    for (let i = 0; i < path.length - 1; i += 1) target = target[path[i]];
    target[path[path.length - 1]] = value;
    return draft;
  }), [setActiveModel]);

  const mutate = useCallback((fn) => setActiveModel((draft) => { fn(draft); return draft; }), [setActiveModel]);
  const bench = useCallback((key) => model.benchmarks?.[key] ?? null, [model.benchmarks]);
  const setBench = useCallback((key, value) => mutate((d) => { d.benchmarks = { ...(d.benchmarks || {}), [key]: value }; }), [mutate]);
  // Copy industry averages into inputs that are still empty, for keys under a prefix.
  const fillFromBench = useCallback((prefix) => {
    let filled = 0;
    mutate((d) => {
      BENCH_ENTRIES.filter((e) => e.key.startsWith(prefix)).forEach((e) => {
        const avg = d.benchmarks?.[e.key];
        if (!has(avg)) return;
        let target = d;
        for (let i = 0; i < e.path.length - 1; i += 1) target = target[e.path[i]];
        const leaf = e.path[e.path.length - 1];
        if (leaf === 'eligibility') {
          // Eligibility benchmarks below 100% imply a 'selected roles' row; apply them even over the default 100%.
          if (Number(avg) < 100 && (target.applyTo === 'all' || !has(target[leaf]) || Number(target[leaf]) === 100)) { target.applyTo = 'selected'; target[leaf] = avg; filled += 1; }
          return;
        }
        if (!has(target[leaf])) { target[leaf] = avg; filled += 1; }
      });
    });
    setToast(filled ? `Filled ${filled} empty input${filled === 1 ? '' : 's'} from industry averages` : 'No empty inputs with an industry average to fill');
  }, [mutate]);

  const go = useCallback((module, page) => {
    const item = NAV.find((n) => n.key === module);
    const next = { module, page: page ?? item?.pages[0]?.[0] ?? null };
    setNav(next);
    const hash = `#/${next.module}${next.page ? `/${next.page}` : ''}`;
    if (window.location.hash !== hash) window.history.pushState(null, '', hash);
  }, []);

  const actions = {
    go,
    save: () => {
      setWorkspace((ws) => ({ ...ws, scenarios: ws.scenarios.map((s) => (s.id === ws.activeId ? { ...s, updatedAt: new Date().toISOString() } : s)) }));
      setDirty(false);
      setToast('Scenario saved');
    },
    switchScenario: (id) => { setWorkspace((ws) => ({ ...ws, activeId: id })); setDirty(false); },
    newScenario: async () => {
      const name = await ask({ type: 'prompt', title: 'New scenario', message: 'Copies the current inputs and industry averages into a new scenario.', defaultValue: `${active.name} – variant`, confirmLabel: 'Create' });
      if (!name) return;
      const s = createScenario(name, model);
      setWorkspace((ws) => ({ scenarios: [...ws.scenarios, s], activeId: s.id }));
      setDirty(false);
      setToast(`Created “${s.name}”`);
    },
    duplicateScenario: (id) => {
      const src = workspace.scenarios.find((s) => s.id === id);
      if (!src) return;
      const s = createScenario(`${src.name} (copy)`, src.model);
      setWorkspace((ws) => ({ ...ws, scenarios: [...ws.scenarios, s] }));
      setToast(`Duplicated “${src.name}”`);
    },
    renameScenario: async (id) => {
      const target = workspace.scenarios.find((s) => s.id === (id || workspace.activeId));
      if (!target) return;
      const name = await ask({ type: 'prompt', title: 'Rename scenario', defaultValue: target.name, confirmLabel: 'Rename' });
      if (!name) return;
      setWorkspace((ws) => ({ ...ws, scenarios: ws.scenarios.map((s) => (s.id === target.id ? { ...s, name } : s)) }));
    },
    deleteScenario: async (id) => {
      const target = workspace.scenarios.find((s) => s.id === (id || workspace.activeId));
      if (!target || workspace.scenarios.length < 2) return;
      if (!(await ask({ type: 'confirm', title: `Delete “${target.name}”?`, message: 'This removes the scenario and its inputs. It cannot be undone.', confirmLabel: 'Delete', danger: true }))) return;
      setWorkspace((ws) => {
        const scenarios = ws.scenarios.filter((s) => s.id !== target.id);
        return { scenarios, activeId: ws.activeId === target.id ? scenarios[0].id : ws.activeId };
      });
      setToast(`Deleted “${target.name}”`);
    },
    resetScenario: async () => {
      if (!(await ask({ type: 'confirm', title: `Clear all inputs in “${active.name}”?`, message: 'Every input returns to empty. Industry averages you have loaded are kept.', confirmLabel: 'Clear inputs', danger: true }))) return;
      setActiveModel((draft) => ({ ...createDefaultModel(draft.settings.horizonYears, draft.settings.currency), benchmarks: draft.benchmarks }));
      setToast('Inputs cleared');
    },
    clearWorkspace: async () => {
      if (!(await ask({ type: 'confirm', title: 'Remove every scenario?', message: 'All scenarios saved in this browser are removed and a fresh, empty base case is created.', confirmLabel: 'Remove all', danger: true }))) return;
      const base = createScenario('Base case', createDefaultModel(5, model.settings.currency), { locked: true });
      setWorkspace({ scenarios: [base], activeId: base.id });
      setDirty(false);
      go('setup');
    },
    exportJson: () => exportScenarioJson(active),
    exportDeck: async () => {
      setToast('Building the pitch deck…');
      try {
        const { buildDeck } = await import('./model/deck.js');
        await buildDeck({ model, results, workspace });
        setToast('Pitch deck downloaded');
      } catch (e) {
        console.error(e);
        setToast('Could not build the deck in this browser');
      }
    },
    exportCsv: () => exportResultsCsv(active, results),
    importJson: async (file) => {
      try {
        const { name, model: imported } = await readScenarioFile(file);
        const s = createScenario(name, imported);
        setWorkspace((ws) => ({ scenarios: [...ws.scenarios, s], activeId: s.id }));
        setToast(`Imported “${s.name}”`);
      } catch {
        setToast('Could not read that file');
      }
    },
    signOut: () => { clearSession(); setSession(null); },
  };

  if (!session) return <Login onSignIn={(s) => { saveSession(s); setSession(s); }} />;

  const Screen = SCREENS[nav.module] || Setup;
  const isInput = INPUT_NAV.some((n) => n.key === nav.module);
  return (
    <div className="shell">
      <Sidebar nav={nav} go={go} status={results.status} />
      <div className="main">
        <TopBar model={model} workspace={workspace} dirty={dirty} actions={actions} user={session} results={results} />
        <main className="content">
          {isInput && <Stepper nav={nav} status={results.status} go={go} />}
          <Screen model={model} results={results} update={update} mutate={mutate} page={nav.page} nav={nav} go={go} currency={model.settings.currency} workspace={workspace} actions={actions} bench={bench} setBench={setBench} fillFromBench={fillFromBench} />
        </main>
      </div>
      {toast && <div className="toast">{toast}</div>}
      <Dialog dialog={dialog} onClose={closeDialog} />
    </div>
  );
}
