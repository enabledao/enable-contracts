import {BN, constants, expectEvent, expectRevert} from 'openzeppelin-test-helpers';

const DebtToken = artifacts.require('DebtToken');
const RepaymentRouter = artifacts.require('RepaymentRouter');
const TermsContract = artifacts.require('TermsContract');

contract('RepaymentRouter', accounts => {

  let debtToken;
  let termsContract;
  let repaymentRouter;

  const tokenDetails = {
    name: 'Ines Cornell Loan',
    symbol: 'ICL'
  };

  const loanParams = {
    principalTokenAddr: '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359',
    principal: web3.utils.toWei('60000', 'ether'), // TODO(Dan): Replace with actual number 60000 * 10 ** 18
    loanStatus: 0,
    amortizationUnitType: 3,
    termLength: 6,
    interestRate: 50,
    termStart: 10,
    termEnd: 10
  };

  before(async () => {
    debtToken = await DebtToken.new(tokenDetails.name, tokenDetails.symbol);
    assert.exists(debtToken.address, 'Failed to deploy DebtToken with address');

    const params = Object.values(loanParams);
    termsContract = await TermsContract.new(...params);
    assert.exists(termsContract.address, 'Failed to deploy TermsContract with address');

    repaymentRouter = await RepaymentRouter.new(termsContract.address, debtToken.address);
  });

  it('should successfully deploy RepaymentRouter', function () {
    assert.exists(repaymentRouter.address, 'Failed to deploy RepaymentRouter with address');
  });
});
