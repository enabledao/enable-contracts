import {BN, constants, expectEvent, expectRevert} from 'openzeppelin-test-helpers';

const DebtTokenFactory = artifacts.require('TermsContract');

const loanParams = {
  debtToken: '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359',
  principalTokenAddr: '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359',
  principal: web3.utils.toWei('60000', 'ether'), // TODO(Dan): Replace with actual number 60000 * 10 ** 18
  amortizationUnitType: 3,
  termLength: 6,
  termPayment: 600,
  gracePeriodLength: 0,
  gracePeriodPayment: 0,
  interestRate: 50,
  crowdfundLength: 10,
  crowdfundStart: 10
};

contract('Terms Contract', accounts => {
  let termsContractInstance;

  beforeEach(async () => {
    const params = Object.values(loanParams);
    console.log(params);
    // TODO(Dan): Clarify whether we should deploy a TermsContract-only instance
    const {logs} = await crowdloanFactoryInstance.createCrowdloan(...params, {
      from: borrower
    });
    // termsContractInstance = await TermsContract.new(...loanParams);
  });

  it('should deploy successfully', async () => {
    // assert.exists(
    //   termsContractInstance.address,
    //   'termsContractInstance was not successfully deployed'
    // );
  });

  it('should record the loan parameters correctly', async () => {
    // expectEvent.inLogs(logs, 'loanCreated', {
    //   borrower,
    //   amount: borrowAmount
    // });
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
