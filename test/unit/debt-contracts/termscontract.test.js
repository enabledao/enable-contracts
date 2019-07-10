import {BN, constants, expectEvent, expectRevert} from 'openzeppelin-test-helpers';
import {isContext} from 'vm';

const {expect} = require('chai');

const TermsContract = artifacts.require('TermsContract');

const params = {
  principalToken: '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359',
  principal: new BN(60000), // TODO(Dan): Replace with actual number 60000 * 10 ** 18
  timeUnitType: 3,
  loanPeriod: 6,
  interestRate: 6
};

contract('Terms Contract', ([sender, receiver]) => {
  let termsContractInstance;
  let termsContractParams;
  const borrower = sender;

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

  context('initial term loan params', async () => {
    it('should record loan params in storage', async () => {
      Object.keys(params).forEach(key => {
        const value = termsContractParams[key];
        if (value instanceof BN) {
          expect(value).to.be.a.bignumber.that.equals(new BN(params[key]));
        } else {
          expect(value).to.equal(params[key]);
        }
      });
    });
  });

  context('should revert if loan parameters are invalid', async () => {
    xit('should revert if principalTokenAddr is 0', async () => {});
    xit('should revert if timeUnitType is not valid', async () => {});
    xit('should revert if loanPeriod is 0', async () => {});
    xit('should revert if interest rate (in basis points) is above 10000 (i.e. 100%)', async () => {});
  });

  xit('should getLoanStatus and initialize loanStatus as not started', async () => {});

  xit('should get the correct debtor', async () => {});

  xit('should generate an payments table without timestamps if loan has not been started', async () => {});
  xit('should generate an payments table with timestamps if loan has not been started', async () => {});
  xit('should get the expectedRepaymentTotal for a given timestamp', async () => {});

  xit('should get the startTimestamp of the loan', async () => {});
  xit('should get the endTimestamp of the loan', async () => {});
});
