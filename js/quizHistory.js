const STORAGE_KEY = "treeIdQuizHistory";

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn("Failed to read quiz history from localStorage", err);
    return [];
  }
}

function saveAll(history) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (err) {
    console.warn("Failed to save quiz history to localStorage", err);
  }
}

export function addAttempt(record) {
  const history = loadAll();
  history.push({ date: new Date().toISOString(), ...record });
  saveAll(history);
}

export function getHistory() {
  return loadAll();
}

export function getSummary() {
  const history = loadAll();
  if (history.length === 0) return null;
  const last = history[history.length - 1];
  const best = history.reduce((top, attempt) =>
    attempt.percentage > top.percentage ? attempt : top,
  );
  return {
    lastPercentage: last.percentage,
    bestPercentage: best.percentage,
    attemptCount: history.length,
  };
}
