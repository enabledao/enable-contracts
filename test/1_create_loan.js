const DebtTokenFactory = artifacts.require("DebtTokenFactory");
const DebtToken = artifacts.require("DebtToken");
const Crowdloan = artifacts.require("Crowdloan");

const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';

contract ('Crowdloan', accounts => {
    let crowdloan;
    let debtToken;
    let debtTokenFactory;
    const tokenDetails = {
      name: 'Ines Cornell Loan',
      symbol: 'ICL'
    };
    const crowdloanDetails = {
      _principalTokenAddr: NULL_ADDRESS,
      _principal : 60000,
      _amortizationUnitType : 3,
      _termLength: 1,
      _termPayment: 0,
      _gracePeriodLength: 0,
      _gracePeriodPayment: 0,
      _interestRate: 6,
      _crowdfundLength: 864000,
      _crowdfundStart: 0
    };

    before(async () => {
        debtTokenFactory = await DebtTokenFactory.deployed();
        assert.exists(debtTokenFactory.address, 'DebtTokenFactory not successfully deployed with an address');
    })

    it('should successfully create crowdloan', async () => {
        const owner = accounts[0];
        const tx = await debtTokenFactory.createDebtToken(tokenDetails.name, tokenDetails.symbol, {
          from: owner
        });
        tokenAddress = tx.logs && tx.logs.find(log => log.event === 'tokenCreated' && log.args.owner === owner).args.token;
        debtToken = await DebtToken.at(tokenAddress);
        assert.exists( debtToken.name.call() === tokenDetails.name, 'Deployed DebtToken has invalid information');

        // const ctx = await Crowdloan.new(
        //     crowdloanDetails
        // )
    })
})
