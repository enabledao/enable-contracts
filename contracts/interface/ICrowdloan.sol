pragma solidity >=0.4.22 <0.6.0;

interface ICrowdloan {
    function startCrowdfund() external;

    /// @notice Fund the loan in exchange for a debt token
    /// @return debtTokenId Issued debt token ID
    function fund(uint256 amount) external returns (uint256);

    /// @notice Get a refund for a debt token owned by the sender
    /// @param debtTokenId Debt token ID
    function refund(uint256 debtTokenId) external;

    function getLoanStatus() external view returns (uint256);

    function getLoanParams()
        external
        view
        returns (
            address principalToken,
            uint256 principal,
            uint256 loanStatus,
            uint256 amortizationUnitType,
            uint256 termLength,
            uint256 interestRate,
            uint256 termStartUnixTimestamp,
            uint256 termEndUnixTimestamp
        );

    function getDebtToken() external view returns (address);
}
