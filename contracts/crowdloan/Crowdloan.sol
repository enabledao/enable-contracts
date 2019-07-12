pragma solidity >=0.4.22 <0.6.0;

import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "openzeppelin-eth/contracts/token/ERC721/IERC721.sol";
import "openzeppelin-eth/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-eth/contracts/utils/ReentrancyGuard.sol";
import "zos-lib/contracts/Initializable.sol";
import "../interface/ITermsContract.sol";
import "../interface/ICrowdloan.sol";
import "../interface/IRepaymentManager.sol";
import "../debt-contracts/TermsContractLib.sol";

contract Crowdloan is Initializable, ICrowdloan, ReentrancyGuard {
    using SafeMath for uint256;

    using TermsContractLib for TermsContractLib.LoanParams;
    using TermsContractLib for TermsContractLib.LoanStatus;

    struct CrowdfundParams {
        uint256 crowdfundLength;
        uint256 crowdfundStart;
        uint256 crowdfundEnd;
    }

    address borrower;
    CrowdfundParams crowdfundParams;

    ITermsContract termsContract;
    IRepaymentManager repaymentManager;

    event Fund(address indexed sender, uint256 amount);
    event Refund(address indexed sender, uint256 amount);
    event ReleaseFunds(address indexed sender, uint256 amount);

    event StatusChanged(uint256 loanStatus);

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

        borrower = msg.sender; //Needs to be update, once factory is setup
        crowdfundParams = CrowdfundParams(_crowdfundLength, _crowdfundStart, 0);
    }

    // @notice additional payment does not exceed the pricipal Amount
    function _isBelowMaxSupply(uint256 amount) internal view returns (bool) {
        uint256 principal = termsContract.getPrincipal();
        return repaymentManager.totalShares().add(amount) <= principal;
    }

    // @notice reconcile the loans funding status
    function _updateCrowdfundStatus() internal {
        uint256 principal = termsContract.getPrincipal();
        uint256 totalShares = repaymentManager.totalShares();
        uint256 totalPaid = repaymentManager.totalPaid();

        if (totalShares > 0 && totalShares < principal) {
            termsContract.setLoanStatus(TermsContractLib.LoanStatus.FUNDING_STARTED);
        } else if (totalShares >= principal && totalPaid == 0) {
            termsContract.setLoanStatus(TermsContractLib.LoanStatus.FUNDING_COMPLETE);
        }
    }

    function startCrowdfund() public {
        require(
            crowdfundParams.crowdfundStart == 0 || crowdfundParams.crowdfundStart > now,
            "KickOff already passed"
        );
        crowdfundParams.crowdfundStart = now;
        termsContract.setLoanStatus(TermsContractLib.LoanStatus.FUNDING_STARTED);
    }

    /// @notice Fund the loan in exchange for a debt token
    /// @return repaymentManagerId Issued debt token ID
    function fund(uint256 amount) public trackCrowdfundStatus returns (uint256) {
        require(_isBelowMaxSupply(amount), "Amount exceeds capital");
        //Mint new debt token and transfer to sender
        repaymentManager.increaseShares(msg.sender, amount);
        // emit FundsReceived(msg.sender, amount);  // TODO(Dan): Remove comments once IClaimsToken is implemented
    }

    /// @notice Get a refund for a debt token owned by the sender
    function refund(uint256 amount) public {
        require(
            termsContract.getLoanStatus() < TermsContractLib.LoanStatus.FUNDING_COMPLETE, 
            "Funding already complete. Refund Impossible"
        );

        require(repaymentManager.shares(msg.sender) >= amount);

        repaymentManager.decreaseShares(msg.sender, amount);

        IERC20 paymentToken = IERC20(termsContract.getPrincipalToken());
        paymentToken.transfer(msg.sender, amount);

        emit Refund(msg.sender, amount);
    }

    function getDebtToken() external view returns (address) {
        return address(repaymentManager);
    }

    function getBorrower() external view returns (address) {
        return borrower;
    }

    /**
     * @dev fallback function ***DO NOT OVERRIDE***
     * Revert all native Ether payments
     */
    function() external payable {
        revert("Ether not accepted");
    }
}
