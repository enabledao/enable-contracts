pragma solidity 0.5.11;

contract ICrowdloan {
    function amountRepaid () external returns (uint256);
    function borrower () external returns (uint256);
    function crowdfundStart () external returns (uint256);
    function crowdfundEnd () external returns (uint256);
    function crowdfundDuration () external returns (uint256);
    function principalRequested () external returns (uint256);
    function repaymentCap () external returns (uint256);
    function totalRepaymentWithdrawn () external returns (uint256);
    function loanMetadataUrl () external returns (string memory);

    function amountContributed (address) external returns (uint256);
    function repaymentWithdrawn (address) external returns (uint256);

    function fund (uint256) external;
    function repay (uint256) external;
    function withdrawPrincipal (uint256) external;
    function withdrawRepayment () external;
    function startCrowdfund () external;

    // Events
    event Fund(address sender, uint256 amount);
    event WithdrawPrincipal(address borrower, uint256 amount);
    event WithdrawRepayment(address lender, uint256 amount);
    event Repay(uint256 amount);
    event StartCrowdfund(uint256 crowdfundStart);



}
