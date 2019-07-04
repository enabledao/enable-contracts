module.exports = {
  env: {
    mocha: true,
    es6: true
  },
  plugins: ["mocha"],
  extends: ["airbnb-base"],
  globals: {
    Atomics: "readonly",
    SharedArrayBuffer: "readonly",
    web3: false,
    artifacts: true,
    assert: false,
    contract: false
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module"
  },
  rules: {
    "mocha/no-exclusive-tests": "error"
  }
};
