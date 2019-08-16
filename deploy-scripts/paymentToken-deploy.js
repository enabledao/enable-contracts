require('dotenv').config();

const PaymentToken = artifacts.require('StandaloneERC20');

const extractTokenDetails = () => {
  const argvms = process.argv;
  const decimalsIndex = argvms.lastIndexOf('--decimals');
  const symbolIndex = argvms.lastIndexOf('--symbol');
  const nameIndex = argvms.lastIndexOf('--name');

  return {
    name: nameIndex > -1 ? argvms[nameIndex+1] : null,
    symbol: symbolIndex > -1 ? argvms[symbolIndex+1] : null,
    decimals: decimalsIndex > -1 ? argvms[decimalsIndex+1] : null
  }
}

const getAccounts = async () => {
  return await web3.eth.getAccounts();
}
// Deployed versions
// Kovan: 0x25567316b41BDFbFFb1D7c568Ebc1E075769548D

/**
  Deploy a generic ERC20 token, to any truffle configured network.
  @params --name string name of token
  @params --symbol string symbol of token
  @params --decimals number decimals of token
**/
module.exports = async () => {
  try {
    const tokenDetails = extractTokenDetails();
    const { name, symbol, decimals } = tokenDetails;

    if (name === null || symbol === null || decimals === null) {
      throw new Error('Incomplete Token details provided: --name, --symbol, --decimals required');
    }
    const accounts = await getAccounts()
    const paymentToken = await  PaymentToken.new();

    console.log('Deployed Token:', paymentToken.address);

    const initializeTx = await paymentToken.initialize (
        name,
        symbol,
        decimals,
        [accounts[0]], // minters
        [accounts[0]] // pausers
    )

    console.log('initializeTx:', initializeTx.tx);

    console.log('done!!!!');
  } catch (e) {
    console.error(e);
  }

  process.exit();
};
