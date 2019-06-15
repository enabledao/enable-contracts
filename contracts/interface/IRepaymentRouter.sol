pragma solidity >= 0.4.22 <0.6.0;

interface IRepaymentRouter {
    /// @notice Repay a given portion of loan
    /// @param unitsOfRepayment Tokens to repay
    function repay(uint256 unitsOfRepayment) external;

    /// @notice Withdraw current allowance for a debt token
    /// @param debtTokenId Debt token ID
    function withdraw(uint debtTokenId) external;

    /// @notice Get current withdrawal allowance for a debt token
    /// @param debtTokenId Debt token ID
    function getWithdrawalAllowance(uint debtTokenId) external view returns (uint);
}

