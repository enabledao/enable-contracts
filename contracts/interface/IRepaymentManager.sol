pragma solidity >=0.4.22 <0.6.0;

/**
    @title IRepaymentManager
    @notice The RepaymentManager accepts payments in a given ERC20-compliant token, and allows shareholders to withdraw a portion of tokens relative to their share
    The share amounts are managed by a Controller, which has the exclusive right to set user shares.
    Shares cannot be changed once the repayment process begins.
 */
contract IRepaymentManager {
    event PayeeAdded(address account);
    event PayeeRemoved(address account);
    event ShareIncreased(address account, uint256 sharesAdded);
    event ShareDecreased(address account, uint256 sharesRemoved);
    event PaymentReleased(address to, uint256 amount);
    event PaymentReceived(address from, uint256 amount);

    /**
     * @notice Send funds
     * @param amount amount of tokens to send.
     */
    function pay(uint256 amount) public;

    /**
     * @return the total shares of the contract.
     */
    function totalShares() public view returns (uint256);

    /**
     * @return the total amount already released.
     */
    function totalReleased() public view returns (uint256);

    /**
     * @return the total amount paid to contract.
     */
    function totalPaid() public view returns (uint256);

    /**
     * @return the shares of an account.
     */
    function shares(address account) public view returns (uint256);

    /**
     * @return the amount already released to an account.
     */
    function released(address account) public view returns (uint256);

    /**
     * @return the release amount that an account could currently claim.
     */
    function releaseAllowance(address account) public view returns (uint256);

    /**
     * @return the address of a payee.
     */
    function payee(uint256 index) public view returns (address);

    /**
     * @dev Release one of the payee's proportional payment.
     * @param account Whose payments will be released.
     */
    function release(address payable account) public;

    /**
     * @dev Increase shares of a shareholder.
     */
    function increaseShares(address account, uint256 amount) public;

    /**
     * @dev Decrease shares of a shareholder.
     */
    function decreaseShares(address account, uint256 amount) public;
}
