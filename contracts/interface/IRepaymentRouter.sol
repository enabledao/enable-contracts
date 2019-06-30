pragma solidity >= 0.4.22 <0.6.0;

interface IRepaymentRouter {
    /// @notice Repay a given portion of loan
    /// @param unitsOfRepayment Tokens to repay
    function repay(uint256 unitsOfRepayment) external;

    /// @notice Total amount of the Loan repaid by the borrower
    function totalRepaid() external view returns (uint);

    /// @notice Total amount of the Loan repayment withdrawn by each tokenId
    function totalWithdrawn(uint debtTokenId) external view returns (uint);

    /// @notice Get current withdrawal allowance for a debt token
    /// @param debtTokenId Debt token ID
    function getWithdrawalAllowance(uint debtTokenId) external view returns (uint);

    /// @notice Withdraw current allowance for a debt token
    /// @param debtTokenId Debt token ID
    function withdraw(uint debtTokenId) external;
}
