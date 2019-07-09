import {BN, constants, expectEvent, expectRevert} from 'openzeppelin-test-helpers';

const TermsContract = artifacts.require('TermsContract');

const termsContractParams = {
  principalTokenAddr: '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359',
  principal: web3.utils.toWei('60000', 'ether'), // TODO(Dan): Replace with actual number 60000 * 10 ** 18
  amortizationUnitType: 3,
  termLength: 6,
  termPayment: 600,
  gracePeriodLength: 0,
  gracePeriodPayment: 0,
  interestRate: 50
};

contract('Terms Contract', accounts => {
  let termsContractInstance;
  const borrower = accounts[0];

  beforeEach(async () => {
    const params = Object.values(termsContractParams);
    termsContractInstance = await TermsContract.new(...params, {from: borrower});
  });

  it('should deploy successfully', async () => {
    assert.exists(
      termsContractInstance.address,
      'termsContractInstance was not successfully deployed'
    );
  });

  it('should record the loan parameters correctly', async () => {
    const params = await termsContractInstance.getLoanParams();
    console.log(params);
    console.log(termsContractParams);
  });

  xit('should revert if loan parameters are invalid', async () => {});
  xit('should getLoanStatus and initialize loanStatus as not started', async () => {});
  xit('should get the correct debtor', async () => {});

  xit('should generate an payments table without timestamps if loan has not been started', async () => {});
  xit('should generate an payments table with timestamps if loan has not been started', async () => {});
  xit('should get the expectedRepaymentTotal for a given timestamp', async () => {});

  xit('should get the startTimestamp of the loan', async () => {});
  xit('should get the endTimestamp of the loan', async () => {});
});
