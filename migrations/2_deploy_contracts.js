const DebtTokenFactory = artifacts.require("DebtTokenFactory");
const CrowdloanFactory = artifacts.require("CrowdloanFactory");

module.exports = function(deployer) {
  // deployer.deploy(CrowdloanFactory);
  deployer.deploy(DebtTokenFactory);
};
