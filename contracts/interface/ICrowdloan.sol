pragma solidity >=0.4.22 <0.6.0;

interface ICrowdloan {
    event Fund(address indexed sender, uint256 amount);
    event Refund(address indexed sender, uint256 amount);
    event ReleaseFunds(address indexed sender, uint256 amount);

    function startCrowdfund() external;

    /// @notice Fund the loan in exchange for a debt token
    /// @return debtTokenId Issued debt token ID
    function fund(uint256 amount) external returns (uint256);

    /// @notice Get a refund for a debt token owned by the sender
    /// @param debtTokenId Debt token ID
    function refund(uint256 debtTokenId) external;

    function getBorrower() external view returns (address);
}
