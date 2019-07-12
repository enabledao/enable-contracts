pragma solidity ^0.5.2;

import "openzeppelin-eth/contracts/token/ERC20/IERC20.sol";

library TermsContractLib {
    enum TimeUnitType {HOURS, DAYS, WEEKS, MONTHS, YEARS}
    enum LoanStatus {
        NOT_STARTED,
        FUNDING_STARTED,
        FUNDING_COMPLETE,
        FUNDING_FAILED,
        REPAYMENT_CYCLE,
        REPAYMENT_COMPLETE
    }

    struct LoanParams {
        address principalToken;
        uint256 principal;
        LoanStatus loanStatus;
        TimeUnitType timeUnitType; // NOTE(Dan): To evaluate whether we should get rid of this param
        uint256 loanPeriod;
        uint256 interestRate; // NOTE(Dan): This needs to be aligned with the timeUnitType
        uint256 interestPayment;
        uint256 loanStartTimestamp;
        uint256 loanEndTimestamp;
    }

    struct ScheduledPayment {
        uint256 due;
        uint256 principal;
        uint256 interest;
        uint256 total;
    }
}
