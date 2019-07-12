const {expect} = require('chai');

const {appCreate, getAppAddress, encodeCall} = require('../testHelpers');

const TermsContract = artifacts.require('TermsContract');
const Crowdloan = artifacts.require('Crowdloan');
const RepaymentManager = artifacts.require('RepaymentManager');

contract('Development', accounts => {
  let tx;

  it('deployment costs', async () => {
    this.termsContract = TermsContract.new();
    this.crowdloan = Crowdloan.new();
    this.repaymentManager = RepaymentManager.new();
  });
});
