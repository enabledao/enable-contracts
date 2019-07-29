require('dotenv').config();

const mnemonic = process.env.MNEMONIC;
const HDWalletProvider = require('truffle-hdwallet-provider');

module.exports = {
  networks: {
    development: {
      protocol: 'http',
      host: 'localhost',
      port: 8545,
      gas: 5000000,
      gasPrice: 5e9,
      networkId: '*'
    },
    kovan: {
      protocol: 'http',
      provider() {
        return new HDWalletProvider(
          mnemonic,
          `https://kovan.infura.io/v3/${process.env.INFURA_API_KEY}`
        );
      },
      network_id: '42',
      gas: 4465030,
      gasPrice: 10000000000
    }
  }
};
