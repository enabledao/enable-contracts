pragma solidity >= 0.4.22 <0.6.0;

interface ICrowdloan {

    function kickOffCrowdfund () external;

    /// @notice Fund the loan in exchange for a debt token
    /// @return debtTokenId Issued debt token ID
    function fund(uint amount) external returns (uint debtTokenId);

    /// @notice Get a refund for a debt token owned by the sender
    /// @param debtTokenId Debt token ID
    function refund(uint debtTokenId) external;

    function getLoanStatus() external view returns (uint loanStatus);

    function getLoanParams() external view returns(
        address principalToken,
        uint principal,
        uint loanStatus,
        uint amortizationUnitType,
        uint termLength,
        uint termPayment,
        uint gracePeriodLength,
        uint gracePeriodPayment,
        uint interestRate,
        uint termStartUnixTimestamp,
        uint gracePeriodEndUnixTimestamp,
        uint termEndUnixTimestamp
    );

    function getDebtToken() external view returns(address debtToken);
}
