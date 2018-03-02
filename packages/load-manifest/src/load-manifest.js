const path = require("path");
const loadJsonFile = require("load-json-file");
const sander = require("@marionebl/sander");

const PATTERNPLATE_ERR_NO_MANIFEST = 'PATTERNPLATE_ERR_NO_MANIFEST';
const PATTERNPLATE_ERR_MALFORMED_MANIFEST = 'PATTERNPLATE_ERR_MALFORMED_MANIFEST';

const DEFAULT_MANIFEST = {
  displayName: "",
  flag: "alpha",
  options: {},
  tags: [],
  version: "1.0.0",
};

module.exports = {
  PATTERNPLATE_ERR_NO_MANIFEST,
  PATTERNPLATE_ERR_MALFORMED_MANIFEST,
  loadManifest
};

const map = fn => Promise.all(['package.json', 'pattern.json'].map(fn));

async function loadManifest(dir) {
  if (typeof dir !== "string") {
    throw new Error(`load-manifest dir expects string, received ${dir}, typeof ${dir}`);
  }

  const files = (await map(async f => (await sander.exists(dir, f)) ? f : null)).filter(Boolean);
  const file = files[0];

  if (!file) {
    const err = new Error(`load-manifest could not find pattern.json, package.json in ${dir}`);
    err.errno = PATTERNPLATE_ERR_NO_MANIFEST;
    throw err;
  }

  const fullPath = path.resolve(dir, file);
  const data = await loadJSON(fullPath);

  const isPkg = path.basename(file) === "package.json";
  const isPatternPkg = typeof data.patternplate === "object";
  const needsPattern = isPkg && !isPatternPkg;

  if (needsPattern && files.length === 1) {
    const err = new Error(`load-manifest could not find pattern.json in ${dir}, package.json contains no patternplate object`);
    err.errno = PATTERNPLATE_ERR_NO_MANIFEST;
    throw err;
  }

  if (needsPattern && files.length === 2) {
    const fullPath = path.resolve(dir, files[1]);
    const data = await loadJSON(fullPath);
    return {file: fullPath, manifest: Object.assign({}, DEFAULT_MANIFEST, data)};
  }

  const extracted = {};

  if (data.hasOwnProperty('name')) {
    extracted.name = data.name;
  }

  if (data.hasOwnProperty('version')) {
    extracted.version = data.version;
  }

  if (data.hasOwnProperty('tags')) {
    extracted.tags = data.tags;
  }

  const sourceData = isPatternPkg ? data.patternplate : data;

  if (sourceData.hasOwnProperty("displayName")) {
    extracted.displayName = sourceData.displayName;
  }

  if (sourceData.hasOwnProperty("options")) {
    extracted.options = sourceData.options;
  }

  return {file: fullPath, manifest: Object.assign({}, DEFAULT_MANIFEST, extracted)};
}

async function loadJSON(file) {
  try {
    return await loadJsonFile(file);
  } catch (err) {
    err.errno = PATTERNPLATE_ERR_MALFORMED_MANIFEST;
    throw err;
  }
}