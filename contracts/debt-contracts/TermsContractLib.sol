pragma solidity ^0.5.2;

import "openzeppelin-eth/contracts/token/ERC20/IERC20.sol";

library TermsContractLib {

    /** NOTE: Update testConstants.js file if changed! */
    enum LoanStatus {
        NOT_STARTED,
        FUNDING_STARTED,
        FUNDING_FAILED,
        FUNDING_COMPLETE,
        REPAYMENT_CYCLE,
        REPAYMENT_COMPLETE
    }

    struct LoanParams {
        address principalToken;
        uint256 principalRequested;
        LoanStatus loanStatus;
        uint256 loanPeriod;
        uint256 interestRate; // NOTE(Dan): in months
        uint256 principalDisbursed;
        uint256 loanStartTimestamp;
    }
}
