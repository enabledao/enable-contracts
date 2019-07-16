// TODO(Dan): Create end-to-end integration test

/*
    Setup
*/

// Deploy a factory instance & a dummy payment token

/*
    Execution
*/

/*
    1. Borrower creates Loan via Crowdloan factory deploy()
    2. Lenders send funds
        - Check that they get the right shares
        - Check that the loan is in the correct status before it's fully funded
    3. Borrower withdraws when enough funds are sent
        - Check that the loan is in the correct status after it's fully funded
    4. Borrower repays via RepaymentManager pay()
        - Make sure the right events are fired
    5. Some lenders try to withdraw single payment
        - On some we should wait and have them try to withdraw from multiple payments at once
    6. More repayments happen
    7. Some lenders try to withdraw after multiple payments


I'd also want to make sure the loan values are correct for each payment with a simple loan calcuation.
*/
import {BN, constants, expectEvent, expectRevert} from 'openzeppelin-test-helpers';

const {expect} = require('chai');

const {appCreate, getAppAddress, encodeCall} = require('../testHelpers');
const { crowdfundParams, loanParams, paymentTokenParams } = require('../testConstants');

const CrowdloanFactory = artifacts.require('CrowdloanFactory');
const TermsContract = artifacts.require('TermsContract');
const Crowdloan = artifacts.require('Crowdloan');
const RepaymentManager = artifacts.require('RepaymentManager');
const PaymentToken = artifacts.require('StandaloneERC20');

contract('Enable Suite', accounts => {

  let crowdloanFactory;
  let paymentToken;
  const appAddress = getAppAddress();
  const borrower = accounts[1];
  const lenders = [
    {
      address: accounts[2],
      shares: new BN(100)
    },
    {
      address: accounts[3],
      shares: new BN(200)
    },
    {
      address: accounts[4],
      shares: new BN(50)
    }
  ];

  before(async () => {
    // Create a factory via App
    const data = encodeCall('initialize', ['address'], [appAddress]);
    const proxyAddress = await appCreate('enable-credit', 'CrowdloanFactory', accounts[1], data);
    crowdloanFactory = await CrowdloanFactory.at(proxyAddress);

    paymentToken = await PaymentToken.new();
    paymentToken.initialize(
      paymentTokenParams.name,
      paymentTokenParams.symbol,
      paymentTokenParams.decimals
    );
  });

  it('Factory should deploy successfully', async () => {
    assert.exists(crowdloanFactory.address, 'crowdloanFactory was not successfully deployed');
  });

  it('Factory should have App address initialized', async () => {
    const result = await crowdloanFactory.app();
    expect(result).to.be.equal(appAddress);
  });

  it('Borrower should successfully deploy crowdloan', async () => {
      const tx = await crowdloanFactory.deploy (
        paymentToken.address,
        ...Object.values(loanParams),
        ...Object.values(crowdfundParams),
        { from: borrower }
      );

      const loanCreated = expectEvent.inLogs( tx.logs, 'LoanCreated', {
          borrower,
          _principal: new BN(loanParams.pricipal)
      });

      expectEvent.inLogs( tx.logs, 'LoanCreated', {
          borrower,
          _principal: new BN(loanParams.pricipal)
      });
  })

});
