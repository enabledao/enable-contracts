pragma solidity >=0.4.22 <0.6.0;

import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "openzeppelin-eth/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-eth/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-eth/contracts/utils/ReentrancyGuard.sol";
import "zos-lib/contracts/Initializable.sol";
import "../interface/ITermsContract.sol";
import "../interface/ICrowdloan.sol";
import "../interface/IRepaymentManager.sol";
import "../debt-contracts/TermsContractLib.sol";

contract Crowdloan is Initializable, ICrowdloan, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    using TermsContractLib for TermsContractLib.LoanParams;
    using TermsContractLib for TermsContractLib.LoanStatus;

    struct CrowdfundParams {
        uint256 crowdfundLength;
        uint256 crowdfundStart;
    }

    CrowdfundParams crowdfundParams;

    ITermsContract public termsContract;
    IRepaymentManager public repaymentManager;

    modifier trackCrowdfundStatus() {
        _updateCrowdfundStatus();
        _;
        _updateCrowdfundStatus();
    }

    function initialize(
        address _termsContract,
        address _repaymentManager,
        uint256 _crowdfundLength,
        uint256 _crowdfundStart
    ) public initializer {
        termsContract = ITermsContract(_termsContract);
        repaymentManager = IRepaymentManager(_repaymentManager);
        crowdfundParams = CrowdfundParams(_crowdfundLength, _crowdfundStart);
    }

    function getCrowdfundParams() public view returns (uint256, uint256) {
        return (crowdfundParams.crowdfundLength, crowdfundParams.crowdfundStart);
    }

    function getCrowdfundEnd() public view returns (uint256) {
        return (crowdfundParams.crowdfundStart.add(crowdfundParams.crowdfundLength));
    }

    /** TODO(Dan): Refactor while implementing Donation capability */
    function getTotalCrowdfunded() public view returns (uint256 total) {
        /** Note: this may return more than principalRequested because of native ERC20 transfers */
        total = _getPrincipalToken().balanceOf(address(this));
    }

    function getBorrower() public view returns (address) {
        return termsContract.getBorrower();
    }

    // @notice additional payment does not exceed the pricipal Amount
    function _isBelowMaxSupply(uint256 amount) internal view returns (bool) {
        uint256 principalRequested = termsContract.getPrincipalRequested();
        return repaymentManager.totalShares().add(amount) <= principalRequested;
    }

    // @notice reconcile the loans funding status
    function _updateCrowdfundStatus() internal {
        uint256 principalRequested = termsContract.getPrincipalRequested();
        uint256 totalShares = repaymentManager.totalShares();
        uint256 totalPaid = repaymentManager.totalPaid();

        if (
            totalShares > 0 &&
            totalShares < principalRequested &&
            termsContract.getLoanStatus() < TermsContractLib.LoanStatus.FUNDING_FAILED
        ) {
            termsContract.setLoanStatus(TermsContractLib.LoanStatus.FUNDING_STARTED);
        } else if (totalShares >= principalRequested && totalPaid == 0) {
            termsContract.setLoanStatus(TermsContractLib.LoanStatus.FUNDING_COMPLETE);
        }
    }

    function _getPrincipalToken() internal view returns (IERC20 token) {
        return IERC20(termsContract.getPrincipalToken());
    }

    function startCrowdfund() public {
        require(
            crowdfundParams.crowdfundStart == 0 || crowdfundParams.crowdfundStart > now,
            "KickOff already passed"
        );
        require(msg.sender == getBorrower(), "Only borrower can start crowdfund");
        crowdfundParams.crowdfundStart = now;
        termsContract.setLoanStatus(TermsContractLib.LoanStatus.FUNDING_STARTED);
    }

    /// @notice Fund the loan in exchange for a debt token
    /// @return repaymentManagerId Issued debt token ID
    function fund(uint256 amount) public trackCrowdfundStatus returns (uint256) {
        require(
            termsContract.getLoanStatus() > TermsContractLib.LoanStatus.NOT_STARTED ||
                crowdfundParams.crowdfundStart >= now,
            "Crowdfund not yet started"
        );
        require(
            termsContract.getLoanStatus() < TermsContractLib.LoanStatus.FUNDING_FAILED,
            "Crowdfund completed or failed"
        );
        // require( getCrowdfundEnd() < now, "Crowdfund period over");
        require(_isBelowMaxSupply(amount), "Amount exceeds capital");
        _getPrincipalToken().safeTransferFrom(msg.sender, address(this), amount);

        //Mint new debt token and transfer to sender
        repaymentManager.increaseShares(msg.sender, amount);
        emit Fund(msg.sender, amount);
    }

    /// @notice Get a refund for a debt token owned by the sender
    function refund(uint256 amount) public {
        require(
            termsContract.getLoanStatus() < TermsContractLib.LoanStatus.FUNDING_COMPLETE,
            "Funding already complete. Refund Impossible"
        );

        require(repaymentManager.shares(msg.sender) >= amount, "Amount exceeds owned shares");

        repaymentManager.decreaseShares(msg.sender, amount);
        _getPrincipalToken().safeTransfer(msg.sender, amount);

        emit Refund(msg.sender, amount);
    }

    /**
     * @notice Withdraw method
     */
    function withdraw() public {
        withdraw(_getPrincipalToken().balanceOf(address(this)));
    }

    // @notice Withdraw loan
    function withdraw(uint256 amount) public {
        require(
            termsContract.getLoanStatus() > TermsContractLib.LoanStatus.FUNDING_FAILED,
            "Crowdfund not completed"
        );

        address borrower = termsContract.getBorrower();

        require(msg.sender == termsContract.getBorrower(), "Withdrawal only allowed for Borrower");

        uint256 contractBalance = _getPrincipalToken().balanceOf(address(this));
        require(amount <= contractBalance, "Amount exceeds available balance");
        if (termsContract.getLoanStatus() < TermsContractLib.LoanStatus.REPAYMENT_CYCLE) {
            termsContract.startRepaymentCycle(contractBalance);
        }

        _getPrincipalToken().safeTransfer(borrower, amount);
        emit ReleaseFunds(msg.sender, amount);
    }

    /**
     * @dev fallback function ***DO NOT OVERRIDE***
     * Revert all native Ether payments
     */
    function() external payable {
        revert("Ether not accepted");
    }
}
