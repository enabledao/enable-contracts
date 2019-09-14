require('dotenv').config();

const TokenFaucet = artifacts.require('TokenFaucet');

const getAccounts = async () => {
  return await web3.eth.getAccounts();
}
// Deployed versions
// Kovan: 0x25567316b41BDFbFFb1D7c568Ebc1E075769548D

/**
  Deploy a generic ERC20 Faucet contract, to any truffle configured network.
**/
module.exports = async () => {
  try {
    const accounts = await getAccounts();
    const tokenFaucet = await  TokenFaucet.new();

    console.log('Deployed Token:', tokenFaucet.address);
    const initializeTx = await tokenFaucet.initialize (accounts[0]);

    console.log('initializeTx:', initializeTx.tx);

    console.log('done!!!!');
  } catch (e) {
    console.error(e);
  }

  process.exit();
};
