import {BN} from 'openzeppelin-test-helpers';

const crowdfundParams ={
  crowdfundLength: 10,
  crowdfundStart: 10
};

const loanParams = {
  principal: web3.utils.toWei('60000', 'ether'), // TODO(Dan): Replace with actual number 60000 * 10 ** 18
  timeUnitType: 3,
  loanPeriod: 6,
  interestRate: 50,
};

const paymentTokenParams = {
  name: 'PaymentToken',
  symbol: 'PAY',
  decimals: new BN(18)
};

export {
  crowdfundParams,
  loanParams,
  paymentTokenParams
}
