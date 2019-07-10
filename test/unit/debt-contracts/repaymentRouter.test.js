import {BN, constants, expectEvent, expectRevert} from 'openzeppelin-test-helpers';
const { expect } = require('chai');

const DebtToken = artifacts.require('DebtToken');
const DaiToken = artifacts.require('DaiToken');
const RepaymentRouter = artifacts.require('RepaymentRouter');
const TermsContract = artifacts.require('TermsContract');

contract('RepaymentRouter', accounts => {
  const owner = accounts[0];

  let debtToken;
  let daiToken;
  let termsContract;
  let repaymentRouter;

  const tokenDetails = {
    name: 'Ines Cornell Loan',
    symbol: 'ICL'
  };

  const loanParams = {
    principal: web3.utils.toWei('60000', 'ether'), // TODO(Dan): Replace with actual number 60000 * 10 ** 18
    loanStatus: 0,
    amortizationUnitType: 3,
    termLength: 6,
    interestRate: 50,
    termStart: 10,
    termEnd: 10
  };

  beforeEach(async () => {
    debtToken = await DebtToken.new(tokenDetails.name, tokenDetails.symbol);
    assert.exists(debtToken.address, 'Failed to deploy DebtToken with address');

    daiToken = await DaiToken.new();
    assert.exists(daiToken.address, 'Failed to deploy DaiToken with address');

    const params = Object.values(Object.assign({ principalTokenAddr: daiToken.address }, loanParams));
    termsContract = await TermsContract.new(...params);
    assert.exists(termsContract.address, 'Failed to deploy TermsContract with address');

    repaymentRouter = await RepaymentRouter.new(termsContract.address, debtToken.address);
  });

  it('should successfully deploy RepaymentRouter', () => {
    assert.exists(repaymentRouter.address, 'Failed to deploy RepaymentRouter with address');
  });

  it('should successfully repay Funds', async () => {
    const amount = new BN(100);
    await daiToken.mint(owner, amount, {
      from: owner
    });

    await daiToken.approve(repaymentRouter.address, amount, {
      from: owner
    });

    const {logs} = await repaymentRouter.repay(amount, {
      from: owner
    });

    expectEvent.inLogs(logs, 'PaymentReceived', {
      from: owner,
      amount
    });

    expect(
      await daiToken.balanceOf(repaymentRouter.address)
    ).to.be.bignumber.equal(amount);

    expect(
      await repaymentRouter.totalRepaid()
    ).to.be.bignumber.equal(amount);
  });

  it('should successfully withdraw Funds', async () => {
    const amount = new BN(100);
    const contributors = accounts.slice(1,5);

    await Promise.all(
      contributors.map( async(contributor) =>
        await debtToken.addDebt(contributor, amount, {
          from: owner
        })
      )
    );

    await daiToken.mint(owner, amount, {
      from: owner
    });

    await daiToken.approve(repaymentRouter.address, amount, {
      from: owner
    });

    await repaymentRouter.repay(amount, {
      from: owner
    });

    expect(
      await daiToken.balanceOf(repaymentRouter.address)
    ).to.be.bignumber.equal(amount);

    await Promise.all(
      contributors.map( async(contributor, index) => {

        const { logs } = await repaymentRouter.withdraw(index, {
          from: contributor
        });

        expectEvent.inLogs(logs, 'PaymentReleased', {
          to: contributor
        });
      })
    );

    expect(
      await repaymentRouter.totalWithdrawn()
    ).to.be.bignumber.above(new BN(0));
  });
});
