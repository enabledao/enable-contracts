pragma solidity >=0.4.22 <0.6.0;

/**
    @title IRepaymentManager
    @notice The RepaymentManager accepts payments in a given ERC20-compliant token, and allows shareholders to withdraw a portion of tokens relative to their share
    The share amounts are managed by a Controller, which has the exclusive right to set user shares.
    Shares cannot be changed once the repayment process begins.
 */
contract IRepaymentManager {
    event ShareIncreased(address account, uint256 sharesAdded);

    /**
     * @return the total shares of the contract.
     */
    function totalShares() public view returns (uint256);

    /**
     * @return the shares of an account.
     */
    function shares(address account) public view returns (uint256);

    /**
     * @dev Increase shares of a shareholder.
     */
    function increaseShares(address account, uint256 amount) public;
}
