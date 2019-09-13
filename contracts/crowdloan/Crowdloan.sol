pragma solidity 0.5.11;

import "zos-lib/contracts/Initializable.sol";
import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "openzeppelin-eth/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-eth/contracts/token/ERC20/SafeERC20.sol";

contract Crowdloan is Initializable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // Loan terms
    uint256 public crowdFundEnd; // Last time contributions are accepted
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

    function initialize(uint256 duration, IERC20 _token, uint256 _principalRequested)
        external
        initializer
    {
        borrower = msg.sender;
        crowdFundEnd = now + duration;
        token = _token;
        principalRequested = _principalRequested;
    }

    function fund(uint256 amount) external {
        require(now <= crowdFundEnd, "The contribution period has ended.");

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
}
