require('dotenv').config();
require('@babel/register');
require('@babel/polyfill');

const mnemonic = process.env.MNEMONIC;
const infuraProjectId = process.env.INFURA_PROJECT_ID;
const HDWalletProvider = require('truffle-hdwallet-provider');
// Create your own key for Production environments (https://infura.io/)

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  networks: {
    development: {
      host: '127.0.0.1',
      port: 8545,
      network_id: '*'
    },
    local: {
      host: '127.0.0.1',
      port: 8545,
      network_id: '*'
    },
    ropsten: {
      provider() {
        return new HDWalletProvider(mnemonic, `https://ropsten.infura.io/v3/${infuraProjectId}`);
      },
      network_id: '3',
      gas: 4465030,
      gasPrice: 10000000000
    },
    kovan: {
      provider() {
        return new HDWalletProvider(mnemonic, `https://kovan.infura.io/v3/${infuraProjectId}`);
      },
      network_id: '42',
      gas: 4465030,
      gasPrice: 10000000000
    },
    rinkeby: {
      provider: () =>
        new HDWalletProvider(
          process.env.MNEMONIC,
          `https://rinkeby.infura.io/v3/${infuraProjectId}`
        ),
      network_id: 4,
      gas: 3000000,
      gasPrice: 10000000000
    },
    // main ethereum network(mainnet)
    main: {
      provider: () =>
        new HDWalletProvider(
          process.env.MAINNET_MNEMONIC,
          `https://mainnet.infura.io/v3/${infuraProjectId}`
        ),
      network_id: 1,
      gas: 4465030,
      gasPrice: 10000000000
    }
  },
  mocha: {
    reporter: 'eth-gas-reporter'
  },
  compilers: {
    solc: {
      version: '0.5.11'
    }
  }
};
