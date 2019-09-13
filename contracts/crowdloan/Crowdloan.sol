pragma solidity 0.5.11;

import "zos-lib/contracts/Initializable.sol";
import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "openzeppelin-eth/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-eth/contracts/token/ERC20/SafeERC20.sol";

contract Crowdloan is Initializable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // Loan terms
    uint256 public crowdfundStart;
    uint256 public crowdfundEnd; // Last time contributions are accepted
    uint256 public crowdfundDuration;
    address public borrower;
    IERC20 public token;
    uint256 public principalRequested;
    string public loanMetadataUrl;

    // Contributor tracking
    mapping(address => uint256) public amountContributed;
    uint256 public totalContributed;
    uint256 public principalWithdrawn;

    // Repayment tracking
    uint256 public amountRepaid;
    mapping(address => uint256) public repaymentWithdrawn;

    // Events
    event Fund(address sender, uint256 amount);
    event WithdrawPrincipal(address sender, uint256 amount);
    event WithdrawRepayment(address sender, uint256 amount);
    event Repay(uint256 amount);
    event StartCrowdfund(uint256 crowdfundStart);

    function initialize(
        address _borrower,
        IERC20 _token,
        uint256 _principalRequested,
        uint256 _duration,
        string calldata _loanMetadataUrl
    ) external initializer {
        borrower = _borrower;
        crowdfundDuration = _duration;
        token = _token;
        principalRequested = _principalRequested;
        loanMetadataUrl = _loanMetadataUrl;
    }

    function fund(uint256 amount) external {
        require(now <= crowdfundEnd, "The contribution period has ended.");
        require(amount > 0, "Fund amount cannot be zero");

        totalContributed = totalContributed.add(amount);
        require(
            totalContributed <= principalRequested,
            "Your contribution would exceed the total amount requested."
        );

        amountContributed[msg.sender] = amountContributed[msg.sender].add(amount);

        require(token.transferFrom(msg.sender, address(this), amount));

        emit Fund(msg.sender, amount);
    }

    function withdrawPrincipal() external {
        require(msg.sender == borrower, "Only the borrower can withdraw principal.");
        uint256 amount = totalContributed.sub(principalWithdrawn);
        principalWithdrawn = totalContributed;
        require(token.transfer(msg.sender, amount));

        emit WithdrawPrincipal(msg.sender, amount);
    }

    function repay(uint256 amount) external {
        amountRepaid = amountRepaid.add(amount);
        token.safeTransferFrom(msg.sender, address(this), amount);

        emit Repay(amount);
    }

    function withdrawRepayment() external {
        uint256 totalOwed = amountRepaid.mul(amountContributed[msg.sender]).div(totalContributed);
        uint256 amount = totalOwed.sub(repaymentWithdrawn[msg.sender]);
        repaymentWithdrawn[msg.sender] = totalOwed;

        token.safeTransfer(msg.sender, amount);

        emit WithdrawRepayment(msg.sender, amount);
    }

    function startCrowdfund() external {
        require(msg.sender == borrower, "Only the borrower can start crowdfund.");
        require(crowdfundStart == 0, "Crowdfund must not have already been started.");

        crowdfundStart = now;
        crowdfundEnd = now + crowdfundDuration;

        emit StartCrowdfund(now);
    }
}
