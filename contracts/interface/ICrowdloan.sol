pragma solidity >= 0.4.22 <0.6.0;

interface ICrowdloan {
    /// @notice Fund the loan in exchange for a debt token
    /// @return debtTokenId Issued debt token ID
    function fund(uint amount) external returns (uint debtTokenId);

    /// @notice Get a refund for a debt token owned by the sender
    /// @param debtTokenId Debt token ID
    function refund(uint debtTokenId) external;
}