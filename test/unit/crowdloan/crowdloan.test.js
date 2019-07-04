import {
  BN,
  constants,
  expectEvent,
  expectRevert
} from "openzeppelin-test-helpers";

const DebtTokenFactory = artifacts.require("DebtTokenFactory");
const DebtToken = artifacts.require("DebtToken");
const Crowdloan = artifacts.require("Crowdloan");

contract("Crowdloan", accounts => {
  // let crowdloan;
  // let debtToken;
  // let debtTokenFactory;
  // // let crowdloanFactoryInstance;

  // const tokenDetails = {
  //   name: "Ines Cornell Loan",
  //   symbol: "ICL"
  // };
  // const crowdloanDetails = {
  //   _principalTokenAddr: NULL_ADDRESS,
  //   _principal: 60000,
  //   _amortizationUnitType: 3,
  //   _termLength: 1,
  //   _termPayment: 0,
  //   _gracePeriodLength: 0,
  //   _gracePeriodPayment: 0,
  //   _interestRate: 6,
  //   _crowdfundLength: 864000,
  //   _crowdfundStart: 0
  // };

  // beforeEach(async () => {
  //   debtTokenFactory = await DebtTokenFactory.new();
  //   assert.exists(
  //     debtTokenFactory.address,
  //     "DebtTokenFactory not successfully deployed with an address"
  //   );
  // });

  // it("should successfully create crowdloan", async () => {
  //   const owner = accounts[0];
  //   const tx = await debtTokenFactory.createDebtToken(
  //     tokenDetails.name,
  //     tokenDetails.symbol,
  //     {
  //       from: owner
  //     }
  //   );
  //   // TODO(Dan): Refactor more elegant method to get token address
  //   const tokenAddress =
  //     tx.logs &&
  //     tx.logs.find(
  //       log => log.event === "tokenCreated" && log.args.owner === owner
  //     ).args.token;
  //   debtToken = await DebtToken.at(tokenAddress);
  //   let name = await debtToken.name();
  //   assert.equal(name, tokenDetails.name);
  // });

  // TODO(Dan): Implement
  // it("should have the correct terms", async () => {
  //   let addr = await crowdloanFactoryInstance.registry(0);
  //   crowdloanInstance = await Crowdloan.at(addr);
  //   let params = await crowdloanInstance.getLoanParams();
  //   console.log(params);

  //   // console.log(crowdloanInstance);
  //   // expect;

  //   return true;
  // });
});
