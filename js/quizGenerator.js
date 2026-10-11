// Pure quiz question generation + grading logic — no DOM access.
// Keeping this separate from quiz.js makes the generation/grading rules easy
// to reason about and change independently of rendering/state-machine code.
//
// The quiz only tests three facts per species: genus, species epithet, and
// common name. Every species gets exactly one randomly-chosen question so a
// full run always covers every genus and species at least once.

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalize(str) {
  return String(str ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

function toleranceFor(word) {
  if (word.length <= 4) return 0;
  if (word.length <= 7) return 1;
  return 2;
}

export function gradeTextAnswer(input, correct) {
  const a = normalize(input);
  const b = normalize(correct);
  if (!a) return false;
  if (a === b) return true;
  return levenshtein(a, b) <= toleranceFor(b);
}

function splitLatin(latinName) {
  const parts = latinName.trim().split(" ");
  return { genus: parts[0], epithet: parts.slice(1).join(" ") };
}

// Picks distractors for a species-level question, preferring other species
// in the same genus first (so e.g. a maple question is mixed in with other
// maples instead of obviously-unrelated trees) and only falling back to
// other genera if there aren't enough same-genus species to fill the count.
function pickDistractors(pool, excludeId, count, preferGenus) {
  const candidates = pool.filter((item) => item.id !== excludeId);
  const sameGenus = shuffleArray(
    candidates.filter((item) => item.genus === preferGenus),
  );
  const others = shuffleArray(
    candidates.filter((item) => item.genus !== preferGenus),
  );
  return [...sameGenus, ...others].slice(0, count);
}

function genCommonToSci(species, speciesList, mode) {
  const { genus, epithet } = splitLatin(species.latinName);
  const prompt = `What is the scientific name for "${species.commonName}"?`;
  if (mode === "typed") {
    return {
      type: "commonToSci",
      speciesId: species.id,
      maxPoints: 2,
      prompt,
      fields: [
        { key: "genus", label: "Genus", correctAnswer: genus },
        { key: "epithet", label: "Species epithet", correctAnswer: epithet },
      ],
    };
  }
  const distractors = pickDistractors(speciesList, species.id, 3, species.genus);
  const options = shuffleArray([species, ...distractors]).map(
    (s) => s.latinName,
  );
  return {
    type: "commonToSci",
    speciesId: species.id,
    maxPoints: 1,
    prompt,
    options,
    correctAnswer: species.latinName,
  };
}

function genSciToCommon(species, speciesList, mode) {
  const prompt = `What is the common name for "${species.latinName}"?`;
  if (mode === "typed") {
    return {
      type: "sciToCommon",
      speciesId: species.id,
      maxPoints: 1,
      prompt,
      fields: [
        {
          key: "commonName",
          label: "Common name",
          correctAnswer: species.commonName,
        },
      ],
    };
  }
  const distractors = pickDistractors(speciesList, species.id, 3, species.genus);
  const options = shuffleArray([species, ...distractors]).map(
    (s) => s.commonName,
  );
  return {
    type: "sciToCommon",
    speciesId: species.id,
    maxPoints: 1,
    prompt,
    options,
    correctAnswer: species.commonName,
  };
}

function genCommonToGenus(species, speciesList, mode, allGenera) {
  const prompt = `What genus does "${species.commonName}" belong to?`;
  if (mode === "typed") {
    return {
      type: "commonToGenus",
      speciesId: species.id,
      maxPoints: 1,
      prompt,
      fields: [{ key: "genus", label: "Genus", correctAnswer: species.genus }],
    };
  }
  const distractorPool = allGenera.filter((g) => g !== species.genus);
  const distractors = shuffleArray(distractorPool).slice(0, 3);
  const options = shuffleArray([species.genus, ...distractors]);
  return {
    type: "commonToGenus",
    speciesId: species.id,
    maxPoints: 1,
    prompt,
    options,
    correctAnswer: species.genus,
  };
}

// Each key is a selectable question type exposed in the quiz setup UI:
// - genusTyped: type the genus, given the common name
// - sciTyped: type the genus + species epithet, given the common name
// - commonTyped: type the common name, given the scientific name
// - mcMatchLatin: multiple choice, given the common name, pick the Latin name
// - mcMatchCommon: multiple choice, given the Latin name, pick the common name
export const QUESTION_TYPES = {
  genusTyped: { generator: genCommonToGenus, mode: "typed" },
  sciTyped: { generator: genCommonToSci, mode: "typed" },
  commonTyped: { generator: genSciToCommon, mode: "typed" },
  mcMatchLatin: { generator: genCommonToSci, mode: "mc" },
  mcMatchCommon: { generator: genSciToCommon, mode: "mc" },
};

// Builds a quiz covering every species exactly once (and therefore every
// genus at least once). `selectedKeys` is an array of QUESTION_TYPES keys —
// each question independently and randomly picks one of the selected types,
// so a single quiz can mix whichever question types the user chose.
export function buildQuestionPool(speciesList, selectedKeys) {
  const keys =
    Array.isArray(selectedKeys) && selectedKeys.length > 0
      ? selectedKeys
      : ["mcMatchLatin"];
  const allGenera = Array.from(new Set(speciesList.map((s) => s.genus)));
  const questions = speciesList.map((species) => {
    const key = keys[Math.floor(Math.random() * keys.length)];
    const { generator, mode } = QUESTION_TYPES[key];
    return generator(species, speciesList, mode, allGenera);
  });

  const shuffled = shuffleArray(questions);
  // Light pass to avoid the same species appearing back-to-back.
  for (let i = 1; i < shuffled.length; i += 1) {
    if (shuffled[i].speciesId === shuffled[i - 1].speciesId) {
      for (let j = i + 1; j < shuffled.length; j += 1) {
        if (shuffled[j].speciesId !== shuffled[i - 1].speciesId) {
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          break;
        }
      }
    }
  }
  return shuffled;
}

export function gradeQuestion(question, response) {
  if (question.fields) {
    let pointsEarned = 0;
    const perField = {};
    for (const field of question.fields) {
      const userVal = response?.[field.key] ?? "";
      const correct = gradeTextAnswer(userVal, field.correctAnswer);
      perField[field.key] = {
        correct,
        correctAnswer: field.correctAnswer,
        userAnswer: userVal,
      };
      if (correct) pointsEarned += 1;
    }
    return {
      pointsEarned,
      maxPoints: question.maxPoints,
      correctAnswer: question.fields.map((f) => f.correctAnswer).join(" "),
      perField,
    };
  }

  const userVal = response?.selected ?? "";
  const correct = normalize(userVal) === normalize(question.correctAnswer);
  return {
    pointsEarned: correct ? question.maxPoints : 0,
    maxPoints: question.maxPoints,
    correctAnswer: question.correctAnswer,
    userAnswer: userVal,
  };
}
