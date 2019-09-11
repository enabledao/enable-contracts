import {BN} from 'openzeppelin-test-helpers';

const TOKEN_DECIMALS = new BN(18);
const DECIMAL_SHIFT = new BN(10).pow(TOKEN_DECIMALS);
const MAX_CROWDFUND = new BN(2000000);

const loanStatuses = {
  NOT_STARTED: new BN(0),
  FUNDING_STARTED: new BN(1),
  FUNDING_FAILED: new BN(2),
  FUNDING_COMPLETE: new BN(3),
  REPAYMENT_CYCLE: new BN(4),
  REPAYMENT_COMPLETE: new BN(5)
};

const repaymentStatuses = {
  ON_TIME: new BN(0),
  DEFAULT: new BN(1)
};

const crowdfundParams = {
  crowdfundLength: 600,
  crowdfundStart: 0
};

const loanParams = {
  principalRequested: web3.utils.toWei('60000', 'ether'), // TODO(Dan): Replace with actual number 60000 * 10 ** 18
  loanPeriod: 6,
  interestRate: 600,
  minimumRepayment: web3.utils.toWei('70000', 'ether'),
  maximumRepayment: web3.utils.toWei('90000', 'ether')
};

const paymentTokenParams = {
  name: 'PaymentToken',
  symbol: 'PAY',
  decimals: TOKEN_DECIMALS
};

export {
  TOKEN_DECIMALS,
  DECIMAL_SHIFT,
  MAX_CROWDFUND,
  loanStatuses,
  repaymentStatuses,
  crowdfundParams,
  loanParams,
  paymentTokenParams
};
