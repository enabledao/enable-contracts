pragma solidity >=0.4.22 <0.6.0;

interface IRepaymentRouter {
    /**
    * @dev This event emits when payment is made to the loan
    * @param from contains the address of the sender of the received funds
    * @param amount contains the amount of funds received for distribution
    */
    event PaymentReceived(address indexed from, uint256 amount);

    /**
    * @dev This event emits when payment is withdrawn from the loan
 	 * @param to contains the address of the receiver of funds
 	 * @param amount contains the amount of funds that were withdrawn
    */
    event PaymentReleased(address indexed to, uint256 amount);

    /// @notice Repay a given portion of loan
    /// @param unitsOfRepayment Tokens to repay
    function repay(uint256 unitsOfRepayment) external;

    /// @notice Total amount of the Loan repaid by the borrower
    function totalRepaid() external view returns (uint256);

    /// @notice Total amount of the Loan repayment withdrawn on the Loan
    function totalWithdrawn() external view returns (uint256);

    /// @notice Total amount of the Loan repayment withdrawn by each tokenId
    function totalWithdrawn(uint256 debtTokenId) external view returns (uint256);

    /// @notice Get current withdrawal allowance for a debt token
    /// @param debtTokenId Debt token ID
    function getWithdrawalAllowance(uint256 debtTokenId) external view returns (uint256);

    /// @notice Withdraw current allowance for a debt token
    /// @param debtTokenId Debt token ID
    function withdraw(uint256 debtTokenId) external;

    /// @notice Withdraw current allowance for a batch of owned debt tokens
    function batchWithdraw(uint256[10] calldata) external;
}
