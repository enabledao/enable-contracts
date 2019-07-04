const DebtTokenFactory = artifacts.require("DebtTokenFactory");
const DebtToken = artifacts.require("DebtToken");

contract("debtToken", accounts => {
  let debtToken;
  let debtTokenFactory;
  const owner = accounts[0];

  const tokenDetails = {
    name: "Ines Cornell Loan",
    symbol: "ICL"
  };

  beforeEach(async () => {
    debtTokenFactory = await DebtTokenFactory.new();
    assert.exists(
      debtTokenFactory.address,
      "DebtTokenFactory not successfully deployed with an address"
    );
  });

  it("should successfully create a debtToken", async () => {
    const tx = await debtTokenFactory.createDebtToken(
      tokenDetails.name,
      tokenDetails.symbol,
      {
        from: owner
      }
    );
    // TODO(Dan): Refactor more elegant method to get token address
    const tokenAddress =
      tx.logs &&
      tx.logs.find(
        log => log.event === "tokenCreated" && log.args.owner === owner
      ).args.token;

    debtToken = await DebtToken.at(tokenAddress);
    let name = await debtToken.name();
    assert.equal(name, tokenDetails.name);
  });

});
