// Loan should be in correct status after first lender funds
// Lender should not be able to send less than minimum contribution
// Lender should not be able to send more than maximum contribution
// Loan should be in correct status after being fully funded
// Lender should be able to refund() while loan is in funding state
// Lender should not be able to refund() while loan is in fully funded state
// Lender should not be able to contribute after loan is fully funded
// Lender should not be able to contribute after loan is withdrawn by borrower

import {BN, constants, expectEvent, expectRevert} from 'openzeppelin-test-helpers';

const {expect} = require('chai');

const Crowdloan = artifacts.require('Crowdloan');
const TermsContract = artifacts.require('TermsContract');
const RepaymentManager = artifacts.require('RepaymentManager');
const PaymentToken = artifacts.require('StandaloneERC20');

const { crowdfundParams, loanParams, paymentTokenParams } = require('../../testConstants');

contract('Crowdloan', accounts => {

  let crowdloan;
  let paymentToken;
  let termsContract;
  let repaymentManager;
  const borrower = accounts[0];
  const controllers = [accounts[0]];

  beforeEach(async () => {

    paymentToken = await PaymentToken.new();
    await paymentToken.initialize(
      paymentTokenParams.name,
      paymentTokenParams.symbol,
      paymentTokenParams.decimals,
      [ accounts[0] ], //minters
      [] //pausers
    );

    termsContract = await TermsContract.new();
    repaymentManager = await RepaymentManager.new();

    crowdloan = await Crowdloan.new();
    await crowdloan.initialize(
      termsContract.address,
      repaymentManager.address,
      ...Object.values(crowdfundParams)
    );

    await termsContract.initialize(
      borrower,
      paymentToken.address,
      ...Object.values(loanParams),
      controllers.concat([crowdloan.address])
    );

    await repaymentManager.initialize(
      paymentToken.address,
      termsContract.address,
      controllers.concat([crowdloan.address])
    );
  });

  it('Crowdloan should deploy successfully', async () => {
    expect(
      await crowdloan.getBorrower.call()
    ).to.equal(borrower);
    assert.exists(crowdloan.address, 'Crowdloan was not successfully deployed');
  });

  it('TermsContract should deploy successfully', async () => {
    assert.exists(termsContract.address, 'TermsContract was not successfully deployed');
  });

  it('RepaymentManager should deploy successfully', async () => {
    assert.exists(repaymentManager.address, 'RepaymentManager was not successfully deployed');
  });

  it('PaymentToken should deploy successfully', async () => {
    assert.exists(paymentToken.address, 'PaymentToken was not successfully deployed');
  });

  it('should successfully startCrowdfund', async () => {

    await expectRevert.unspecified(
      crowdloan.startCrowdfund(
        {from: accounts[4]}
      ),
      'Only borrower can start crowdfund'
    );

    const tx = await crowdloan.startCrowdfund(
      {from: borrower}
    );

    // await expectEvent.inTransaction(tx.receipt.transactionHash, 'LoanStatusSet',{
    //   status: new BN(1) //FUNDING_STARTED
    // });

    expect(
      await termsContract.getLoanStatus()
    ).to.be.bignumber.equal(new BN(1)); //FUNDING_STARTED

    await expectRevert.unspecified(
      crowdloan.startCrowdfund(
        {from: borrower}
      ),
      'KickOff already passed'
    );
  });

  it('should successfully fund', async () => {

    const contributor = {
      address: accounts[1],
      value: new BN(150)
    }
    await paymentToken.mint(contributor.address, contributor.value)

    await expectRevert.unspecified(
      crowdloan.fund(
        contributor.value,
        {from: contributor.address}
      ),
      'Crowdfund not yet started'
    );

    const time = Math.floor(new Date().getTime / 1000);
    await crowdloan.startCrowdfund(
      {from: borrower}
    );

    expect (
      (await crowdloan.getCrowdfundParams.call())[1] //crowdfundStart
    ).to.be.bignumber.gt(new BN(time));

    await expectRevert.unspecified(
      crowdloan.fund(
        contributor.value,
        {from: contributor.address}
      ),
      'Crowdloan not approved to Transfer from'
    );

    await paymentToken.approve(
      crowdloan.address,
      contributor.value,
      { from: contributor.address }
    );

    await expectRevert.unspecified(
      crowdloan.fund(
        new BN(0),
        {from: contributor.address}
      ),
      'Can not increase by zero shares'
    );

    await expectRevert.unspecified(
      crowdloan.fund(
        contributor.value,
        {from: accounts[2]}
      ),
      'Were the tokens successfully sent?'
    );

    const tx = await crowdloan.fund(
      contributor.value,
      { from: contributor.address }
    );

    expectEvent.inLogs(tx.logs, 'Fund', {
      sender: contributor.address,
      amount: contributor.value
    });

    const balance = await paymentToken.balanceOf.call(crowdloan.address);
    expect(balance).to.be.bignumber.equal(contributor.value);

    await paymentToken.mint(contributor.address, new BN(loanParams.principal));

    await paymentToken.approve(
      crowdloan.address,
      new BN(loanParams.principal),
      { from: contributor.address }
    );

    await expectRevert.unspecified(
      crowdloan.fund(
        new BN(loanParams.principal),
        {from: contributor.address}
      ),
      'Amount exceeds capital'
    );

    await termsContract.setLoanStatus(new BN(2)); //FUNDING_FAILED
    await expectRevert.unspecified(
      crowdloan.fund(
        contributor.value,
        {from: contributor.address}
      )
      , 'Crowdfund completed or failed'
    );

    await termsContract.setLoanStatus(new BN(1)); //FUNDING_STARTED

    await crowdloan.fund(
      new BN(loanParams.principal).sub(contributor.value),
      { from: contributor.address }
    );

    expect(
      await termsContract.getLoanStatus()
    ).to.be.bignumber.equal(new BN(3)); //FUNDING_COMPLETE)

    await expectRevert.unspecified(
      crowdloan.fund(
        contributor.value,
        {from: contributor.address}
      ),
      'Crowdfund completed or failed'
    );
  });

  it('should successfully refund', async () => {
    const bit = new BN(150);

    const contributor = {
      address: accounts[2],
      value: new BN(loanParams.principal)
    }
    await paymentToken.mint(contributor.address, contributor.value);

    await expectRevert.unspecified(
      crowdloan.refund(
        contributor.value,
        {from: contributor.address}
      ),
      // 'Amount exceeds owned shares'
    );

    await crowdloan.startCrowdfund(
      {from: borrower}
    );

    await paymentToken.approve(
      crowdloan.address,
      contributor.value,
      { from: contributor.address }
    );

    await crowdloan.fund(
      bit,
      { from: contributor.address }
    );

    await expectRevert.unspecified(
      crowdloan.refund(
        new BN(0),
        {from: contributor.address}
      ),
      'Can not decrease by zero shares'
    );

    await expectRevert.unspecified(
      crowdloan.refund(
        bit.add(new BN(10)),
        {from: contributor.address}
      ),
      'Amount exceeds owned shares'
    );

    const tx = await crowdloan.refund(
      bit,
      {from: contributor.address}
    );

    expectEvent.inLogs(tx.logs, 'Refund', {
      sender: contributor.address,
      amount: bit
    });

    const balance = await paymentToken.balanceOf.call(contributor.address);
    expect(balance).to.be.bignumber.equal(contributor.value);

    await crowdloan.fund(
      bit,
      { from: contributor.address }
    );
    termsContract.setLoanStatus(new BN(2)); // FUNDING_FAILED

    await crowdloan.refund(
      bit,
      {from: contributor.address}
    );

    termsContract.setLoanStatus(new BN(1)); // FUNDING_STARTED

    await paymentToken.approve(
      crowdloan.address,
      contributor.value,
      { from: contributor.address }
    );

    crowdloan.fund(
      contributor.value,
      {from: contributor.address}
    );

    expect(
      await termsContract.getLoanStatus()
    ).to.be.bignumber.equal(new BN(3)); //FUNDING_COMPLETE)

    await expectRevert.unspecified(
      crowdloan.refund(
        contributor.value,
        {from: contributor.address}
      ),
      'Funding already complete. Refund Impossible'
    );
  });

  it('should successfully withdraw', async () => {

    const bit = new BN(150);
    const contributor = {
      address: accounts[1],
      value: new BN(loanParams.principal)
    }
    await paymentToken.mint(contributor.address, contributor.value);

    await expectRevert.unspecified(
      crowdloan.withdraw(
        contributor.value,
        {from: borrower}
      ),
      'Crowdfund not yet completed'
    );

    await crowdloan.startCrowdfund(
      {from: borrower}
    );

    await paymentToken.approve(
      crowdloan.address,
      contributor.value,
      { from: contributor.address }
    );

    await crowdloan.fund(
      bit,
      { from: contributor.address }
    );

    await expectRevert.unspecified(
      crowdloan.withdraw(
        contributor.value,
        {from: borrower}
      ),
      'Crowdfund not yet completed'
    );

    await crowdloan.fund(
      contributor.value.sub(bit),
      { from: contributor.address }
    );

    await expectRevert.unspecified(
      crowdloan.withdraw(
        bit,
        {from: accounts[2]}
      ),
      'Withdrawal only allowed for Borrower'
    );

    const tx = await crowdloan.withdraw(
      bit,
      {from: borrower}
    );

    expectEvent.inLogs(tx.logs, 'ReleaseFunds', {
      borrower,
      amount: bit
    });

    const balance = await paymentToken.balanceOf.call(borrower);
    expect(balance).to.be.bignumber.equal(bit);

    expect(
      await termsContract.getLoanStatus()
    ).to.be.bignumber.equal(new BN(4)); //REPAYMENT_CYCLE

    await expectRevert.unspecified(
      crowdloan.withdraw(
        contributor.value,
        {from: borrower}
      ),
      'Amount exceeds available balance'
    );

    await expectRevert.unspecified(
      crowdloan.withdraw(
        contributor.value,
        {from: borrower}
      ),
      'Amount exceeds available balance'
    );

    await crowdloan.methods['withdraw()'](
      {from: borrower}
    );

    expect(
      await paymentToken.balanceOf.call(borrower)
    ).to.be.bignumber.equal(contributor.value);
  });
});
