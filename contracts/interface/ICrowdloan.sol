pragma solidity >=0.4.22 <0.6.0;

interface ICrowdloan {
    event Fund(address indexed sender, uint256 amount);
    event Refund(address indexed sender, uint256 amount);
    event ReleaseFunds(address indexed borrower, uint256 amount);

    /// @notice Fund the loan in exchange for a debt token
    /// @return debtTokenId Issued debt token ID
    function startCrowdfund() external;

    /// @notice Fund the loan in exchange for a debt token
    /// @return debtTokenId Issued debt token ID
    function fund(uint256 amount) external returns (uint256);

    function withdraw() external;
    function withdraw(uint256 amount) external;

    function getBorrower() external view returns (address);
    function getCrowdfundParams() external view returns (uint256, uint256);
    function getCrowdfundEnd() external view returns (uint256);
}
