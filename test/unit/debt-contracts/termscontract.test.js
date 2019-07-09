import {BN, constants, expectEvent, expectRevert} from 'openzeppelin-test-helpers';

const TermsContract = artifacts.require('TermsContract');

const params = {
  principalToken: '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359',
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
  let termsContractParams;
  const borrower = accounts[0];

  beforeEach(async () => {
    const values = Object.values(params);
    termsContractInstance = await TermsContract.new(...values, {from: borrower});
    termsContractParams = await termsContractInstance.getLoanParams();
  });

  it('should deploy successfully', async () => {
    assert.exists(
      termsContractInstance.address,
      'termsContractInstance was not successfully deployed'
    );
  });

  it('should record the loan parameters correctly', async () => {
    console.log(termsContractParams);
    console.log(termsContractParams);
    console.log(typeof termsContractParams);
    Object.keys(termsContractParams).forEach(key => {
      console.log(key);
      console.log(termsContractParams[key]);
      console.log(termsContractParams[key]);
      // expect(termsContractParams[key]).to.equal(params[key]);
    });
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
