const DebtTokenFactory = artifacts.require("DebtTokenFactory");

module.exports = function(deployer) {
  deployer.deploy(DebtTokenFactory);
};
