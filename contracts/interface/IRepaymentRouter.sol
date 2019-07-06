pragma solidity >=0.4.22 <0.6.0;

interface IRepaymentRouter {
    /**
	 * @dev This event emits when funds to be deposited are sent to the token contract
	 * @param from contains the address of the sender of the received funds
	 * @param fundsReceived contains the amount of funds received for distribution
	 */
    event FundsReceived(address indexed from, uint256 fundsReceived);

    /**
	 * @dev This event emits when distributed funds are withdrawn by a token holder.
	 * @param by contains the address of the receiver of funds
	 * @param fundsWithdrawn contains the amount of funds that were withdrawn
	 */
    event FundsWithdrawn(address indexed by, uint256 fundsWithdrawn);

    /// @notice Repay a given portion of loan
    /// @param unitsOfRepayment Tokens to repay
    function repay(uint256 unitsOfRepayment) external;

    /// @notice Total amount of the Loan repaid by the borrower
    function totalRepaid() external view returns (uint256);

    /// @notice Total amount of the Loan repayment withdrawn by each tokenId
    function totalWithdrawn(uint256 debtTokenId) external view returns (uint256);

    /// @notice Get current withdrawal allowance for a debt token
    /// @param debtTokenId Debt token ID
    function getWithdrawalAllowance(uint256 debtTokenId) external view returns (uint256);

    /// @notice Withdraw current allowance for a debt token
    /// @param debtTokenId Debt token ID
    function withdraw(uint256 debtTokenId) external;
}
