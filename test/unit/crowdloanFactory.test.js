import {
  BN,
  constants,
  expectEvent,
  expectRevert
} from "openzeppelin-test-helpers";

const DebtTokenFactory = artifacts.require("DebtTokenFactory");
const CrowdloanFactory = artifacts.require("CrowdloanFactory");

contract("CrowdloanFactory", accounts => {
  let debtTokenFactoryInstance;
  let crowdloanFactoryInstance;
  let crowdloanInstance;
  let crowdloanInstanceAddress;
  var owner = accounts[0];

  before(async () => {
    debtTokenFactoryInstance = await DebtTokenFactory.new();
    crowdloanFactoryInstance = await CrowdloanFactory.new(
      debtTokenFactoryInstance.address
    );
  });

  it("should deploy successfully", async () => {
    assert.exists(
      crowdloanFactoryInstance.address,
      "crowdloanFactoryInstance was not successfully deployed"
    );
  });

  it("should successfully create a crowdloan", async () => {
    // Deploys Crowdloan instance
    const tx = await crowdloanFactoryInstance.createCrowdloan.call(
      "0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359",
      "0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359",
      web3.utils.toWei("60000", "ether"), // TODO(Dan): Replace with actual number 60000 * 10 ** 18
      3, // Months
      6, // Term length
      600, // Term payment
      0, // Grace period length
      0, // Grace period payment
      50, // interest rate (basis points)
      10,
      10,
      { from: owner }
    );
    console.log(tx);
    assert.exists(tx);
    let crowdloans = await crowdloanFactoryInstance.crowdloans;
    console.log(crowdloans);

    // assert tx exists
    // crowdloanInstanceAddress = tx.logs;
    // console.log(crowdloanInstance);
  });
  it("should have the correct terms", async () => {
    // console.log(crowdloanInstance);
    return true;
  });

  xit("should emit a loanCreated event", async () => {});
});
