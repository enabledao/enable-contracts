const DebtTokenFactory = artifacts.require('DebtTokenFactory');
const CrowdloanFactory = artifacts.require('CrowdloanFactory');

module.exports = async deployer => {
  await deployer.deploy(DebtTokenFactory);
  await deployer.deploy(CrowdloanFactory, DebtTokenFactory.address);
};
