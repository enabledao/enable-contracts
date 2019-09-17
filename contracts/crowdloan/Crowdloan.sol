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
    uint256 public repaymentCap;
    string public loanMetadataUrl;

    // Contributor tracking
    mapping(address => uint256) public amountContributed;
    uint256 public totalContributed;
    uint256 public principalWithdrawn;

    // Repayment tracking
    uint256 public amountRepaid;
    mapping(address => uint256) public repaymentWithdrawn;
    uint256 public totalRepaymentWithdrawn;

    // Events
    event Fund(address sender, uint256 amount);
    event WithdrawPrincipal(address borrower, uint256 amount);
    event WithdrawRepayment(address lender, uint256 amount);
    event Repay(uint256 amount);
    event StartCrowdfund(uint256 crowdfundStart);

    function initialize(
        address _borrower,
        IERC20 _token,
        uint256 _principalRequested,
        uint256 _repaymentCap,
        uint256 _duration,
        string calldata _loanMetadataUrl
    ) external initializer {
        borrower = _borrower;
        crowdfundDuration = _duration;
        token = _token;
        principalRequested = _principalRequested;
        loanMetadataUrl = _loanMetadataUrl;
        repaymentCap = _repaymentCap;
    }

    /// @dev During the crowdfund, anyone can fund and get repayment rights in proportion to their contribution
    function fund(uint256 amount) external {
        _onlyAfterCrowdfundStart();
        _onlyBeforeCrowdfundEnd();

        require(amount > 0, "Fund amount cannot be zero");

        totalContributed = totalContributed.add(amount);
        require(
            totalContributed <= principalRequested,
            "Your contribution would exceed the total amount requested."
        );

        amountContributed[msg.sender] = amountContributed[msg.sender].add(amount);

        token.safeTransferFrom(msg.sender, address(this), amount);

        emit Fund(msg.sender, amount);
    }

    /// @dev Borrower can withdraw currently aquired principal in any proportion, and any time during the crowdfund for flexibility.
    /// This DOES NOT affect the total principal that can be raised or the loan terms, it merely provides cash flow.
    function withdrawPrincipal(uint256 amount) external {
        _onlyBorrower();

        // FIX DONATIONS!
        uint256 tokenBalance = token.balanceOf(address(this));

        require(amount <= tokenBalance, "Insufficent tokens to withdraw");

        if (amountRepaid > 0) {
            require(
                tokenBalance.sub(amount) >= amountRepaid.sub(totalRepaymentWithdrawn),
                "Withdrawal will lead to repayment inbalance"
            );
        }

        principalWithdrawn = principalWithdrawn.add(amount);
        token.safeTransfer(msg.sender, amount);

        emit WithdrawPrincipal(msg.sender, amount);
    }

    /// @dev Anyone can make repayments on behalf of the borrower
    function repay(uint256 amount) external {
        _onlyAfterCrowdfundEnd();

        require(amount > 0, "Repayment amount cannot be zero");
        require(amountRepaid.add(amount) <= repaymentCap, "Must not exceed repayment cap");

        amountRepaid = amountRepaid.add(amount);
        token.safeTransferFrom(msg.sender, address(this), amount);

        emit Repay(amount);
    }

    /// @dev Lenders can withdraw their proportional stake from repayments after the crowdfund ends
    function withdrawRepayment() external {
        _onlyAfterCrowdfundEnd();

        uint256 totalOwed = amountRepaid.mul(amountContributed[msg.sender]).div(totalContributed);
        uint256 amount = totalOwed.sub(repaymentWithdrawn[msg.sender]);
        require(amount > 0, "Withdrawal amount cannot be zero");

        repaymentWithdrawn[msg.sender] = totalOwed;
        totalRepaymentWithdrawn = totalRepaymentWithdrawn.add(amount);

        token.safeTransfer(msg.sender, amount);

        emit WithdrawRepayment(msg.sender, amount);
    }

    /// @dev Borrower can start the crowdfund once
    function startCrowdfund() external {
        _onlyBorrower();
        _onlyBeforeCrowdfundStart();

        crowdfundStart = now;
        crowdfundEnd = now + crowdfundDuration;

        emit StartCrowdfund(now);
    }

    function _onlyBorrower() internal view {
        require(msg.sender == borrower, "Only the borrower can call function.");
    }

    function _onlyBeforeCrowdfundStart() internal view {
        require(crowdfundStart == 0, "Only before crowdfund start");
    }

    function _onlyAfterCrowdfundStart() internal view {
        require(crowdfundStart != 0, "Only after crowdfund start");
    }

    function _onlyBeforeCrowdfundEnd() internal view {
        require(now <= crowdfundEnd, "Only before crowdfund end");
    }

    function _onlyAfterCrowdfundEnd() internal view {
        require(crowdfundStart != 0 && now > crowdfundEnd, "Only after crowdfund end.");
    }
}
