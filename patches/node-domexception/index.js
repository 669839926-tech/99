/* dummy-domexception patch to fix "npm warn deprecated node-domexception@1.0.0" */
module.exports = globalThis.DOMException || Error;
