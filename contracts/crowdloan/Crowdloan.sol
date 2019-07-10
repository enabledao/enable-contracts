pragma solidity >=0.4.22 <0.6.0;

import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "openzeppelin-eth/contracts/token/ERC721/IERC721.sol";
import "openzeppelin-eth/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-eth/contracts/utils/ReentrancyGuard.sol";
import "zos-lib/contracts/Initializable.sol";
import "../interface/ITermsContract.sol";
import "../interface/IRepaymentManager.sol";

contract Crowdloan is Initializable, ICrowdloan, ReentrancyGuard {
    using SafeMath for uint256;

    struct CrowdfundParams {
        uint256 crowdfundLength;
        uint256 crowdfundStart;
        uint256 crowdfundEnd;
    }

    address borrower;
    CrowdfundParams crowdfundParams;
    DebtToken debtToken;

    ITermsContract termsContract;
    IRepaymentManager repaymentManager;

    event LenderFund(address indexed sender, uint256 amount);
    event LenderRefund(address indexed sender, uint256 amount);
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
        repaymentManager = ITermsContract(_repaymentManager);

        borrower = msg.sender; //Needs to be update, once factory is setup
        crowdfundParams = CrowdfundParams(_crowdfundLength, _crowdfundStart, 0);
    }

    function _getDebtTokenValueForAmount(uint256 amount)
        internal
        view
        returns (uint256 debtTokenValue)
    {
        return amount;
    }

    // @notice additional payment does not exceed the pricipal Amount
    function _isBelowMaxSupply(uint256 amount) internal view returns (bool) {
        return debtToken.totalDebt().add(amount) <= loanParams.principal;
    }

    // @notice reconcile the loans funding status
    function _updateCrowdfundStatus() internal {
        if (debtToken.totalDebt() > 0 && debtToken.totalDebt() < loanParams.principal) {
            _setLoanStatus(LoanStatus.FUNDING_STARTED);
        } else if (debtToken.totalDebt() >= loanParams.principal && totalRepaid() == 0) {
            _setLoanStatus(LoanStatus.FUNDING_COMPLETE);
        }
    }

    function startCrowdfund() public {
        require(
            crowdfundParams.crowdfundStart == 0 || crowdfundParams.crowdfundStart > now,
            "KickOff already passed"
        );
        crowdfundParams.crowdfundStart = now;
        _setLoanStatus(LoanStatus.FUNDING_STARTED);
    }

    /// @notice Fund the loan in exchange for a debt token
    /// @return debtTokenId Issued debt token ID
    function fund(uint256 amount) public trackCrowdfundStatus returns (uint256) {
        uint256 effectiveAmount = _getDebtTokenValueForAmount(amount);
        require(_isBelowMaxSupply(effectiveAmount), "Amount exceeds capital");
        //Mint new debt token and transfer to sender
        debtToken.addDebt(msg.sender, amount);
        // emit FundsReceived(msg.sender, amount);  // TODO(Dan): Remove comments once IClaimsToken is implemented
    }

    /// @notice Get a refund for a debt token owned by the sender
    /// @param debtTokenId Debt token ID
    function refund(uint256 debtTokenId) public onlyDebtTokenOwner(debtTokenId) {
        require(
            uint256(loanParams.loanStatus) < uint256(LoanStatus.FUNDING_COMPLETE),
            "Funding already complete. Refund Impossible"
        );

        uint256 _refund = debtToken.debtValue(debtTokenId);
        debtToken.removeDebt(msg.sender, debtTokenId);
        _transferERC20(loanParams.principalToken, msg.sender, _refund);

        emit Refund(msg.sender, _refund);
        emit FundsWithdrawn(msg.sender, _refund);
    }

    function getDebtToken() external view returns (address) {
        return address(debtToken);
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
