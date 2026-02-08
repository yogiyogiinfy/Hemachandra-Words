const input = document.getElementById("wordInput");
const button = document.getElementById("solveBtn");
const resultsDiv = document.getElementById("results");

input.focus();
button.disabled = true;

/* Central function to control button state */
function updateButtonState() {
  const cleaned = input.value.replace(/[^a-zA-Z]/g, "").toLowerCase();
  if (input.value !== cleaned) input.value = cleaned;
  button.disabled = cleaned.length !== 8;
}

/* Covers typing, paste, autofill, mobile input */
input.addEventListener("input", updateButtonState);
input.addEventListener("keyup", updateButtonState);
input.addEventListener("change", updateButtonState);

/* ---------------- WORD DATA ---------------- */

let words2 = new Map();
let words3 = new Map();
let words5 = new Map();

let words8Dictionary = new Set();
let words8Hemachandra = new Set();

let fiveSplits = new Map();

function normalize(word) {
  return word.split("").sort().join("");
}

/* Load all word files */
Promise.all([
  fetch("./words_2.txt").then(r => r.text()),
  fetch("./words_3.txt").then(r => r.text()),
  fetch("./words_5.txt").then(r => r.text()),
  fetch("./words_8_dictionary.txt").then(r => r.text()),
  fetch("./words_8.txt").then(r => r.text())
]).then(([w2, w3, w5, w8dict, w8hema]) => {

  loadWords(w2, 2, words2);
  loadWords(w3, 3, words3);
  loadWords(w5, 5, words5);

  w8dict.split("\n").forEach(w => {
    w = w.trim().toLowerCase();
    if (w.length === 8) words8Dictionary.add(w);
  });

  w8hema.split("\n").forEach(w => {
    w = w.trim().toLowerCase();
    if (w.length === 8) words8Hemachandra.add(w);
  });

  buildFiveSplits();
});

function loadWords(text, len, map) {
  text.split("\n").forEach(w => {
    w = w.trim().toLowerCase();
    if (w.length !== len) return;
    const sig = normalize(w);
    if (!map.has(sig)) map.set(sig, []);
    map.get(sig).push(w);
  });
}

/* Build valid 5 → (2 + 3) splits */
function buildFiveSplits() {
  for (const [sig5, fives] of words5.entries()) {
    for (const five of fives) {
      const letters = five.split("");

      for (const combo of combinations(letters, 2)) {
        const twoSig = normalize(combo.join(""));
        const rest = subtract(letters, combo);
        const threeSig = normalize(rest.join(""));

        if (!words2.has(twoSig) || !words3.has(threeSig)) continue;

        for (const two of words2.get(twoSig)) {
          for (const three of words3.get(threeSig)) {
            if (!fiveSplits.has(sig5)) fiveSplits.set(sig5, []);
            fiveSplits.get(sig5).push({ five, two, three });
          }
        }
      }
    }
  }
}

/* ---------------- SOLVE ---------------- */

button.addEventListener("click", solve);

input.addEventListener("keydown", e => {
  if (e.key === "Enter" && !button.disabled) solve();
});

function solve() {
  resultsDiv.innerHTML = "";
  const word = input.value.trim();

  if (!words8Dictionary.has(word)) {
    showError("Not a valid English word");
    return;
  }

  if (!words8Hemachandra.has(word)) {
    showError("Not a Hemachandra word");
    return;
  }

  showMessage("Hemachandra word");

  const letters = word.split("");
  const found = new Set();

  for (const combo of combinations(letters, 3)) {
    const sig3 = normalize(combo.join(""));
    const rest = subtract(letters, combo);
    const sig5 = normalize(rest.join(""));

    if (!words3.has(sig3) || !fiveSplits.has(sig5)) continue;

    for (const three of words3.get(sig3)) {
      for (const split of fiveSplits.get(sig5)) {
        found.add(`${three} + ${split.five} (${split.two} + ${split.three})`);
      }
    }
  }

  [...found].sort().forEach(r => {
    const div = document.createElement("div");
    div.className = "result";
    div.textContent = r;
    resultsDiv.appendChild(div);
  });
}

function showMessage(text) {
  const div = document.createElement("div");
  div.className = "message";
  div.textContent = text;
  resultsDiv.appendChild(div);
}

function showError(text) {
  const div = document.createElement("div");
  div.className = "error";
  div.textContent = text;
  resultsDiv.appendChild(div);
}

/* Helpers */

function combinations(arr, k) {
  const res = [];
  (function backtrack(start, combo) {
    if (combo.length === k) return res.push([...combo]);
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      backtrack(i + 1, combo);
      combo.pop();
    }
  })(0, []);
  return res;
}

function subtract(full, used) {
  const temp = [...full];
  used.forEach(l => temp.splice(temp.indexOf(l), 1));
  return temp;
}

