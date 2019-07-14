// Shares are increased for new user (i.e. user with no shares) correctly
// Shares can't be decreased for new user (that has no shares)
// Shares are increased for existing user correctly
// Shares are decreased for existing user correctly

// Valid user can't withdraw before loan start
// Valid user can't withdraw during funding
// Valid user can withdraw during repayment
// Valid user can withdraw after loan end

// Invalid user can't withdraw before loan start
// Invalid user can't withdraw during funding
// Invalid user can't withdraw during repayment
// Invalid user can't withdraw after loan end

import {BN, constants, expectEvent, expectRevert} from 'openzeppelin-test-helpers';

const {expect} = require('chai');

const {appCreate, getAppAddress, encodeCall} = require('../../testHelpers');
const {loanParams, paymentTokenParams} = require('../../testConstants');

const RepaymentManager = artifacts.require('RepaymentManager');
const TermsContract = artifacts.require('TermsContract');
const PaymentToken = artifacts.require('StandaloneERC20');

contract('RepaymentManager', accounts => {

  let tx;
  let result;
  let paymentToken;
  let termsContract;
  let repaymentManager;
  // const appAddress = getAppAddress();
  const borrower = accounts[0];
  const controllers = [accounts[0]];
  const lenders = [
    {
      address: accounts[1],
      shares: new BN(100)
    },
    {
      address: accounts[2],
      shares: new BN(200)
    },
    {
      address: accounts[3],
      shares: new BN(50)
    }
  ];

  beforeEach(async () => {
    // Create a factory via App
    // const data = encodeCall('initialize', ['address'], [appAddress]);
    // const proxyAddress = await appCreate('enable-credit', 'RepaymentManager', accounts[1], '');
    paymentToken = await PaymentToken.new();
    await paymentToken.initialize(
      paymentTokenParams.name,
      paymentTokenParams.symbol,
      paymentTokenParams.decimals,
      [ accounts[0] ], //minters
      [] //pausers
    );

    termsContract = await TermsContract.new();
    await termsContract.initialize(
      borrower,
      paymentToken.address,
      ...Object.values(loanParams),
      controllers
    );

    repaymentManager = await RepaymentManager.new();
    await repaymentManager.initialize(
      paymentToken.address,
      termsContract.address,
      controllers
    );
  });

  it('RepaymentManager should deploy successfully', async () => {
    assert.exists(repaymentManager.address, 'repaymentManager was not successfully deployed');
  });

  it('RepaymentManager should have PaymentToken address initialized', async () => {
    result = await repaymentManager.paymentToken.call();
    expect(result).to.be.equal(paymentToken.address);
  });

  it('RepaymentManager should have TermsContract address initialized', async () => {
    result = await repaymentManager.termsContract.call();
    expect(result).to.be.equal(termsContract.address);
  });

  it('should successfully add a new Payee', async () => {

    const payee = lenders[0];

    await expectRevert.unspecified(
      repaymentManager.increaseShares(
        payee.address,
        payee.shares,
        {from: accounts[4]}
      ),
      // 'Permission denied'
    );

    const tx = await repaymentManager.increaseShares(
      payee.address,
      payee.shares,
      {from: controllers[0]}
    );
    expectEvent.inLogs(tx.logs, 'PayeeAdded', {
      account: payee.address
    });

    await termsContract.setLoanStatus(2); //FUNDING_FAILED
    await expectRevert.unspecified(
      repaymentManager.increaseShares(
        payee.address,
        payee.shares,
        {from: controllers[0]}
      ),
      // 'Action only allowed before loan funding is completed'
    );

    const shares = await repaymentManager.shares.call(payee.address);
    expect(shares).to.be.bignumber.equal(payee.shares);
  });

  it('should successfully increase Payee\'s shares', async () => {

    const payee = lenders[1];
    await repaymentManager.increaseShares(
      payee.address,
      payee.shares,
      {from: controllers[0]}
    );

    const tx = await repaymentManager.increaseShares(
      payee.address,
      payee.shares,
      {from: controllers[0]}
    );

    expectEvent.inLogs(tx.logs, 'ShareIncreased', {
      account: payee.address,
      sharesAdded: payee.shares
    });

    await termsContract.setLoanStatus(2); //FUNDING_FAILED
    await expectRevert.unspecified(
      repaymentManager.increaseShares(
        payee.address,
        payee.shares,
        {from: controllers[0]}
      ),
      // 'Action only allowed before loan funding is completed'
    );

    const shares = await repaymentManager.shares.call(payee.address);
    const expectedShares = payee.shares.mul(new BN(2));//total shares added = 2*payee.shares
    expect(shares).to.be.bignumber.equal(expectedShares);
  });

  it('should successfully decrease Payee\'s shares', async () => {

    const payee = lenders[1];
    const lessShares = new BN(50);

    await expectRevert.unspecified(
      repaymentManager.decreaseShares(
        payee.address,
        lessShares,
        {from: controllers[0]}
      ),
      // 'Account has zero shares'
    );

    await repaymentManager.increaseShares(
      payee.address,
      payee.shares,
      {from: controllers[0]}
    );

    const tx = await repaymentManager.decreaseShares(
      payee.address,
      lessShares,
      {from: controllers[0]}
    );

    expectEvent.inLogs(tx.logs, 'ShareDecreased', {
      account: payee.address,
      sharesRemoved: lessShares
    });

    await termsContract.setLoanStatus(2); //FUNDING_FAILED
    await expectRevert.unspecified(
      repaymentManager.decreaseShares(
        payee.address,
        lessShares,
        {from: controllers[0]}
      ),
      // 'Action only allowed before loan funding is completed'
    );

    const shares = await repaymentManager.shares.call(payee.address);
    expect(shares).to.be.bignumber.equal(payee.shares.sub(lessShares)); //total shares added = 2*payee.shares
  });

  it('should successfully pay into the contract', async () => {

    const paymentAmount = new BN(150);
    const payers = [
      {
        address: accounts[0],
        value: new BN(150)
      },
      {
        address: accounts[1],
        value: new BN(150)
      },
    ];

    await Promise.all(
      payers.map( payer =>
        paymentToken.mint(payer.address, payer.value)
      )
    );

    await expectRevert.unspecified(
      repaymentManager.pay(
        new BN(0),
        {
          from: payers[0].address
        }
      ),
      // 'No amount set to pay'
    );

    await paymentToken.mint(accounts[3], new BN(100));
    await paymentToken.approve(
      repaymentManager.address,
      new BN(100),
      { from: accounts[3] }
    );
    await expectRevert.unspecified(
      repaymentManager.pay(
        new BN(100),
        {
          from: accounts[3]
        }
      ),
      // 'Action only allowed while loan is Active'
    );


    await termsContract.setLoanStatus(3); //FUNDING_COMPLETE

    for (let p =0; p<payers.length; p++ ) {
        let payer = payers[p];

        await paymentToken.approve(
          repaymentManager.address,
          payer.value,
          { from: payer.address }
        );

        const tx = await repaymentManager.pay(
          payer.value,
          { from: payer.address }
        );

        expectEvent.inLogs(tx.logs, 'PaymentReceived', {
          from: payer.address,
          amount: payer.value
        });
      }

      const repaymentManagerBalance = await paymentToken.balanceOf.call(repaymentManager.address);
      const expectedBalance = payers.reduce((a,b) => a.add(b.value), new BN(0));
      expect(repaymentManagerBalance).to.be.bignumber.equal(expectedBalance);
  });

  it('should successfully release to lender', async () => {

    const paymentAmount = new BN(350);
    const totalShares = () => lenders.reduce((a,b) => a.add(b.shares), new BN(0));
    const expectedRepayment = ( (shares, payment) => (shares.mul(payment)).divRound(totalShares()));

    await paymentToken.mint(borrower, paymentAmount);

    await Promise.all(lenders.map( lender =>
      repaymentManager.increaseShares(
        lender.address,
        lender.shares,
        { from: controllers[0] }
      )
    ));

    await expectRevert.unspecified(
      repaymentManager.release(
        lenders[0].address,
        {
          from: lenders[0].address
        }
      ),
      // 'Action only allowed while loan is Active'
    );

    await paymentToken.approve(
      repaymentManager.address,
      paymentAmount,
      { from: borrower }
    );

    await termsContract.setLoanStatus(3); //FUNDING_COMPLETE

    await repaymentManager.pay(
      paymentAmount,
      { from: borrower }
    );

    await expectRevert.unspecified(
      repaymentManager.release(
        accounts[4],
        {
          from: lenders[0].address
        }
      ),
      // 'Account has zero shares'
    );

    await Promise.all(
      lenders.map( async (lender, idx) => {
        const expectedRelease = expectedRepayment(lender.shares, paymentAmount);

        expect(
          await repaymentManager.releaseAllowance.call(lender.address)
        ).to.be.bignumber.equal(
          expectedRelease
        );

        const tx = await repaymentManager.release(
          lender.address,
          { from: idx % 2 === 0 ? lender.address : accounts[idx+4] } //Alternate between lender address and alternate address as tx sender
        );

        expectEvent.inLogs(tx.logs, 'PaymentReleased', {
          to: lender.address
        });

        expect(
          await repaymentManager.released.call(lender.address)
        ).to.be.bignumber.equal(
          expectedRelease
        );

        expect(
          await paymentToken.balanceOf.call(lender.address)
        ).to.be.bignumber.equal(
          expectedRelease
        )
      }
    ));

      const totalReleased = await repaymentManager.totalReleased.call();
      const expectedReleased = lenders.reduce((a,b) => a.add(expectedRepayment(b.shares, paymentAmount)), new BN(0));
      expect(totalReleased).to.be.bignumber.equal(expectedReleased);
  });
});
